// index.js (Bản Fix AbortError - Bot cắm chốt vĩnh viễn, không bao giờ tự thoát)

process.env.FFMPEG_PATH = require('ffmpeg-static');

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require("express");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    VoiceConnectionStatus,
    getVoiceConnection,
} = require("@discordjs/voice");
const googleTTS = require("google-tts-api");
const { Readable } = require('stream');

const Config = require('./models/Config'); 

// --- Web server giữ cho Render không ngủ ---
const app = express();
const PORT = process.env.PORT || 10000; 

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("✅ Bot đang hoạt động!");
});

app.listen(PORT, () => {
    console.log(`🌐 Web server đã khởi động tại cổng ${PORT}`);
});

// --- Setup Discord client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [Partials.Channel],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            let command = require(path.join(commandsPath, file));
            if (command.default) command = command.default;
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        } catch (e) {
            console.error(`❌ Lỗi khi tải lệnh ${file}:`, e);
        }
    }
} catch (e) {
    console.error(`❌ Lỗi FATAL khi đọc thư mục commands:`, e);
}

async function startBot() {
    try {
        console.log("🚀 Đang kết nối tới MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Đã kết nối thành công tới MongoDB.");
        client.login(process.env.TOKEN);
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
    }
}

// 🟢 QUẢN LÝ MÁY PHÁT ÂM THANH
const guildPlayers = new Map();

function getGuildPlayer(guildId) {
    if (!guildPlayers.has(guildId)) {
        const player = createAudioPlayer();
        player.on('error', error => console.error(`❌ Lỗi AudioPlayer: ${error.message}`));
        player.on('stateChange', (oldState, newState) => {
            console.log(`🎵 [Audio] ${oldState.status} -> ${newState.status}`);
        });
        guildPlayers.set(guildId, player);
    }
    return guildPlayers.get(guildId);
}

// 🟢 HÀM XỬ LÝ TTS: CẮM CHỐT VÀ CHỐNG NUỐT TIẾNG
async function playTTS(text, voiceChannel) {
    try {
        let connection = getVoiceConnection(voiceChannel.guild.id);
        
        // Cắm chốt vào phòng (Nếu chưa có trong phòng)
        if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
            console.log(`🔌 Kết nối vào kênh ${voiceChannel.name}...`);
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true, // Tắt nghe để giảm lag cho bot
            });

            // ⚠️ ĐÃ XÓA BỎ LỆNH TỰ HỦY GÂY LỖI ABORTERROR Ở ĐÂY

            try {
                // Ép bot chờ sẵn sàng
                await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
                console.log("✅ Đã kết nối voice thành công!");
            } catch (error) {
                console.log("⚠️ Render phản hồi mạng chậm, bot vẫn ép phát âm thanh...");
            }
            
            // Chờ 1.5s để Discord mở luồng truyền giọng nói
            console.log("⏳ Đang chờ 1.5s khởi tạo luồng RTP...");
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Tải audio từ Google dưới dạng Base64
        const base64 = await googleTTS.getAudioBase64(text, {
            lang: "vi",
            slow: false,
            host: "https://translate.google.com",
            timeout: 10000,
        });

        // Chuyển Base64 thành luồng Stream
        const buffer = Buffer.from(base64, 'base64');
        const stream = Readable.from(buffer);

        // Phát
        const player = getGuildPlayer(voiceChannel.guild.id);
        const resource = createAudioResource(stream);
        
        connection.subscribe(player);
        player.play(resource);
        console.log(`▶️ Lệnh phát TTS đã được thực thi!`);

    } catch (error) {
        console.error("❌ Lỗi trong luồng playTTS:", error.message);
    }
}


client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: `/help để biết lệnh của BOT nhé ^^`, type: 4 }],
        status: 'online', 
    });
});


client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction, client);
        } else if (interaction.isButton()) {
            const [commandName, messageId] = interaction.customId.split(/[_-]/);
            const command = client.commands.get(commandName);

            if (commandName === 'accept' || commandName === 'reject') { 
                const config = await Config.findById('config'); 
                if (!config) return interaction.reply({ content: '❌ Cấu hình Confession chưa được thiết lập.', ephemeral: true });

                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return await interaction.reply({ content: "❌ Bạn không có quyền duyệt.", ephemeral: true });
                }

                await interaction.deferUpdate();

                const targetMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
                if (!targetMsg) return;

                const originalContent = targetMsg.embeds[0]?.description || "Không rõ nội dung";

                const disabledRow = {
                    type: 1,
                    components: targetMsg.components[0].components.map((btn) => ({
                        ...btn.data, disabled: true,
                    })),
                };
                await targetMsg.edit({ components: [disabledRow] });

                if (commandName === 'accept') {
                    const publicChannel = await client.channels.fetch(config.publicChannel).catch(() => null);
                    if (!publicChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle("<a:AbbyPeak:1393909356625657876>**Confession Ẩn Danh**")
                        .setDescription(originalContent)
                        .setColor("Blue")
                        .setTimestamp();

                    const sent = await publicChannel.send({ embeds: [embed] });
                    const emojis = ["👍", "❤️", "😂", "😭", "🔥"];
                    for (const emoji of emojis) await sent.react(emoji);
                }
            } else if (command && typeof command.handleButton === 'function') {
                await command.handleButton(interaction);
            }
        } else if (interaction.isStringSelectMenu()) {
            const [commandName] = interaction.customId.split(/[_-]/);
            const command = client.commands.get(commandName);
            if (command && typeof command.handleSelectMenu === 'function') {
                await command.handleSelectMenu(interaction);
            }
        }
    } catch (error) {
        if (error.code === 10062) return; 
    }
});


client.on('messageCreate', async message => {
    if (message.author.bot || message.system || message.content.startsWith('/')) return; 

    try {
        const config = await Config.findById('config');
        
        if (config && config.ttsTextChannel === message.channel.id) {
            const memberVoiceChannel = message.member.voice.channel;
            if (!memberVoiceChannel || memberVoiceChannel.type !== ChannelType.GuildVoice) return;

            let text = message.content;
            if (text.length > 200) text = text.substring(0, 200) + '...';
            text = `${message.member.displayName} nói: ${text}`; 
            
            console.log(`🔊 [Message TTS] -> ${text}`);
            await playTTS(text, memberVoiceChannel);
        }
    } catch (e) {
        console.error("❌ Lỗi khi thực thi logic Message TTS:", e);
    }

    if (client.commands.has('doanso')) {
        const doansoCommand = client.commands.get('doanso');
        if (message.content.toLowerCase() === 'doanso') { 
            await doansoCommand.execute(message, client);
        }
    }
});


client.on("voiceStateUpdate", async (oldState, newState) => {
    // CHỈ CHÀO KHI CÓ NGƯỜI VÀO (KHÔNG CODE LOGIC RỜI PHÒNG NỮA)
    if (
        !oldState.channelId &&
        newState.channelId &&
        newState.member &&
        !newState.member.user.bot
    ) {
        const text = `${newState.member.displayName} vừa vào phòng`;
        console.log(`🟢 [Voice Join] ${newState.member.displayName}`);
        await playTTS(text, newState.channel);
    }
});

startBot();
