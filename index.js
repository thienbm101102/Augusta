// index.js (Bản Fix Âm Thanh Cuối Cùng - Không lưu file, xử lý trực tiếp trên RAM)

// 📌 ÉP NODEJS TÌM ĐÚNG FFMPEG (Cực kỳ quan trọng để phát tiếng trên Render)
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
const { Readable } = require('stream'); // Dùng để biến bộ nhớ RAM thành luồng âm thanh

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

// --- Tải lệnh ---
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

// --- Khởi động Bot & DB ---
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

// 🟢 HÀM XỬ LÝ TTS CHUẨN MỚI: DÙNG STREAM TRỰC TIẾP TỪ RAM
async function playTTS(text, voiceChannel) {
    try {
        // 1. Lấy URL từ Google
        const url = googleTTS.getAudioUrl(text, {
            lang: "vi",
            slow: false,
            host: "https://translate.google.com",
        });

        // 2. Tải thẳng file âm thanh vào RAM (Mạo danh trình duyệt Chrome)
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        if (!response.ok) throw new Error(`Google từ chối! HTTP: ${response.status}`);
        
        // 3. Biến bộ nhớ RAM thành luồng phát thanh
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // 4. Kết nối kênh thoại
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        // Bọc lỗi chờ kết nối
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        } catch (err) {
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            console.log("⚠️ Khách vừa vào đã thoát, huỷ đọc TTS.");
            return; 
        }

        // 5. Phát âm thanh
        const player = createAudioPlayer();
        const resource = createAudioResource(stream);
        
        // Log báo cáo trạng thái phát nhạc (Để mình biết FFmpeg có chạy không)
        player.on('stateChange', (oldState, newState) => {
            console.log(`🎵 Player đổi trạng thái: ${oldState.status} -> ${newState.status}`);
        });

        player.on('error', error => {
            console.error(`❌ Lỗi AudioPlayer: ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);

    } catch (error) {
        console.error("❌ Lỗi trong luồng playTTS:", error.message);
    }
}


// ------------------------------------------------------------------
// --- Xử lý Sự kiện READY ---
// ------------------------------------------------------------------
client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: `/help để biết lệnh của BOT nhé ^^`, type: 4 }],
        status: 'online', 
    });
});


// ------------------------------------------------------------------
// --- Xử lý Tương tác (Interactions) ---
// ------------------------------------------------------------------
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


// ------------------------------------------------------------------
// --- Xử lý Tin nhắn (Message) - LOGIC ĐỌC TIN NHẮN (TTS) ---
// ------------------------------------------------------------------
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


// ------------------------------------------------------------------
// --- Xử lý Voice State Update (TTS Chào/Rời) ---
// ------------------------------------------------------------------
client.on("voiceStateUpdate", async (oldState, newState) => {
    
    // Logic chào khi user thật vào room
    if (
        !oldState.channelId &&
        newState.channelId &&
        newState.member &&
        !newState.member.user.bot
    ) {
        const text = `${newState.member.displayName} đã tham gia kênh thoại`;
        console.log(`🟢 [Voice Join] ${newState.member.displayName}`);
        
        await playTTS(text, newState.channel);
    }

    // Logic thoát room 
    if (oldState.channelId && !newState.channelId && !oldState.member.user.bot && oldState.channel) {
        const channel = oldState.channel;
        const remaining = channel.members.filter((m) => !m.user.bot);

        if (remaining.size === 0) {
            const botConnection = getVoiceConnection(channel.guild.id);
            if (botConnection) {
                try {
                    if (botConnection.state.status !== VoiceConnectionStatus.Destroyed) {
                        botConnection.destroy();
                        console.log("👋 Bot đã rời vì voice trống.");
                    }
                } catch (error) {}
            }
        }
    }
});

startBot();
