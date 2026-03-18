// index.js (Phiên bản Ghi File Vật Lý - Ổn định tối đa cho Server Miễn phí)
require('dotenv').config();
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

const Config = require('./models/Config'); 

// --- Quản lý Audio Player chung ---
const guildPlayers = new Map();

function getGuildPlayer(guildId) {
    if (!guildPlayers.has(guildId)) {
        const player = createAudioPlayer();
        player.on('error', error => {
            console.error(`❌ Lỗi Player TTS ở guild ${guildId}:`, error.message);
        });
        guildPlayers.set(guildId, player);
    }
    return guildPlayers.get(guildId);
}

// --- Web server ---
const app = express();
const PORT = process.env.PORT || 10000; 

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("✅ Bot đang hoạt động!");
});

app.listen(PORT, '0.0.0.0', () => {
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
    console.error(`❌ Lỗi FATAL khi đọc commands:`, e);
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

// ------------------------------------------------------------------
// --- Sự kiện READY ---
// ------------------------------------------------------------------
client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: `/help để biết lệnh của BOT nhé ^^`, type: 4 }],
        status: 'online', 
    });
});

// ------------------------------------------------------------------
// --- Sự kiện Tương tác (Interactions) ---
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
                        ...btn.data,
                        disabled: true,
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
                        .setFooter({ text: "Gửi bởi một ai đó trong máy chủ" })
                        .setTimestamp();

                    const sent = await publicChannel.send({ embeds: [embed] });
                    const emojis = ["👍", "❤️", "😂", "😭", "🔥"];
                    for (const emoji of emojis) await sent.react(emoji);
                }
            } else if (command && typeof command.handleButton === 'function') {
                await command.handleButton(interaction);
            }
        }
    } catch (error) {
        if (error.code === 10062) return; 
        console.error(error);
    }
});

// ------------------------------------------------------------------
// --- Sự kiện Tin nhắn (TTS và Doanso) ---
// ------------------------------------------------------------------
client.on('messageCreate', async message => {
    if (message.author.bot || message.system || message.content.startsWith('/')) return; 

    // 1. TTS Đọc tin nhắn
    try {
        const config = await Config.findById('config');
        if (config && config.ttsTextChannel === message.channel.id) {
            const memberVoiceChannel = message.member.voice.channel;
            
            if (!memberVoiceChannel || memberVoiceChannel.type !== ChannelType.GuildVoice) return;
            if (!message.content) return; 

            let text = `${message.member.displayName} nói: ${message.content}`;
            if (text.length > 195) text = text.substring(0, 195) + '...';
            
            console.log(`🔊 TTS: Đọc tin nhắn từ ${message.author.tag} trong kênh ${message.channel.name}`);

            const connection = joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: memberVoiceChannel.guild.id,
                adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true,
            });

            // ÉP CHỜ MẠNG (Không đá bot ra ngoài nữa)
            try {
                await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
            } catch (error) {
                console.error("⚠️ Mạng Render kết nối Voice chậm (Timeout). Vẫn ép phát âm thanh...");
            }

            // Ghi Base64 ra file .mp3 cứng để FFmpeg không bị lỗi
            const base64Audio = await googleTTS.getAudioBase64(text, {
                lang: "vi",
                slow: false,
                host: "https://translate.google.com",
            });
            
            const tempFileName = `tts-${Date.now()}.mp3`;
            const tempFilePath = path.join(__dirname, tempFileName);
            fs.writeFileSync(tempFilePath, Buffer.from(base64Audio, "base64"));
            
            const resource = createAudioResource(tempFilePath);
            const player = getGuildPlayer(memberVoiceChannel.guild.id); 

            connection.subscribe(player);
            player.play(resource);

            // Tự động xóa file sau 20 giây để không rác máy chủ
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                } catch (err) {}
            }, 20000);
        }
    } catch (e) {
        console.error("❌ Lỗi logic khi xử lý TTS:", e.message);
    }

    // 2. Game Đoán Số
    if (client.commands.has('doanso')) {
        const doansoCommand = client.commands.get('doanso');
        if (message.content.toLowerCase() === 'doanso') { 
            await doansoCommand.execute(message, client);
        }
    }
});

// ------------------------------------------------------------------
// --- Sự kiện Voice (Chào/Rời) ---
// ------------------------------------------------------------------
client.on("voiceStateUpdate", async (oldState, newState) => {
    // 1. Người dùng tham gia kênh
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
        const member = newState.member;
        const channel = newState.channel;

        const text = `${member.displayName} đã tham gia`;
        console.log(`🟢 ${member.displayName} vào voice: ${channel.name} | Bot đọc: ${text}`);

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        // ÉP CHỜ MẠNG (Không đá bot ra ngoài)
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        } catch (error) {
            console.error("⚠️ Timeout mạng khi join voice. Vẫn ép phát âm thanh...");
        }

        try {
            // Ghi file cứng
            const base64Audio = await googleTTS.getAudioBase64(text, {
                lang: "vi",
                slow: false,
                host: "https://translate.google.com",
            });

            const tempFileName = `join-${Date.now()}.mp3`;
            const tempFilePath = path.join(__dirname, tempFileName);
            fs.writeFileSync(tempFilePath, Buffer.from(base64Audio, "base64"));

            const resource = createAudioResource(tempFilePath);
            const player = getGuildPlayer(channel.guild.id);
            
            connection.subscribe(player);
            player.play(resource);

            // Dọn rác
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                } catch (err) {}
            }, 20000);

        } catch (error) {
            console.error("❌ Lỗi khi tải âm thanh Chào Mừng:", error.message);
        }
    }

    // 2. Người dùng rời đi (Bot tự thoát nếu phòng trống)
    if (oldState.channelId && !newState.channelId && oldState.channel) {
        const channel = oldState.channel;
        const remaining = channel.members.filter((m) => !m.user.bot);

        if (remaining.size === 0) {
            const botConnection = getVoiceConnection(channel.guild.id);
            if (botConnection && botConnection.state.status !== VoiceConnectionStatus.Destroyed) {
                try {
                    botConnection.destroy();
                    console.log("👋 Bot đã rời vì voice trống.");
                } catch (e) {}
            }
        }
    }
});

startBot();
