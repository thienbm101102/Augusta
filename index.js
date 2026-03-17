// index.js (Đã tối ưu Voice và sửa lỗi TTS)
require('dotenv').config(); // Thêm dòng này để đọc file .env
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

// --- Quản lý Audio Player chung cho từng Server (tránh rò rỉ bộ nhớ) ---
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

            // Xử lý Confession
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
        } else if (interaction.isStringSelectMenu()) {
            const [commandName] = interaction.customId.split(/[_-]/);
            const command = client.commands.get(commandName);
            if (command && typeof command.handleSelectMenu === 'function') {
                await command.handleSelectMenu(interaction);
            }
        }
    } catch (error) {
        console.error(error);
        if (error.code === 10062) return; 
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
        }
    }
});

// ------------------------------------------------------------------
// --- Xử lý Tin nhắn (Message) - LOGIC ĐỌC TIN NHẮN (TTS) ---
// ------------------------------------------------------------------
client.on('messageCreate', async message => {
    if (message.author.bot || message.system || message.content.startsWith('/')) return; 

    // --- LOGIC ĐỌC TIN NHẮN (TTS) ---
    try {
        const config = await Config.findById('config');
        
        if (config && config.ttsTextChannel === message.channel.id) {
            const memberVoiceChannel = message.member.voice.channel;
            
            if (!memberVoiceChannel || memberVoiceChannel.type !== ChannelType.GuildVoice) {
                return;
            }

            // Bỏ qua nếu tin nhắn rỗng (Ví dụ chỉ gửi ảnh)
            if (!message.content) return;

            // Đưa tên người dùng vào trước rồi mới cắt chuỗi (Tối đa 200 ký tự cho API)
            let text = `${message.member.displayName} nói: ${message.content}`;
            if (text.length > 195) {
                text = text.substring(0, 195) + '...';
            }
            
            console.log(`🔊 TTS: Đọc tin nhắn từ ${message.author.tag} trong kênh ${message.channel.name}`);

            const connection = joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: memberVoiceChannel.guild.id,
                adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

            const url = googleTTS.getAudioUrl(text, {
                lang: "vi",
                slow: false,
                host: "https://translate.google.com",
            });
            
            const resource = createAudioResource(url);
            const player = getGuildPlayer(memberVoiceChannel.guild.id); // Dùng player tái sử dụng

            connection.subscribe(player);
            player.play(resource);
        }
    } catch (e) {
        console.error("❌ Lỗi khi thực thi logic TTS:", e);
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
    // 1. Logic khi có người tham gia kênh thoại
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
        const member = newState.member;
        const channel = newState.channel;

        const text = `${member.displayName} đã tham gia`;
        console.log(`🟢 ${member.displayName} vào voice: ${channel.name} | Bot đọc: ${text}`);

        const url = googleTTS.getAudioUrl(text, {
            lang: "vi",
            slow: false,
            host: "https://translate.google.com",
        });

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        try {
            // TĂNG thời gian chờ lên 20 giây để Render có đủ thời gian kết nối
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        } catch (error) {
            console.error("⚠️ Lỗi kết nối voice (Timeout):", error.message);
            // SỬA LỖI CRASH: Chỉ destroy khi kết nối chưa bị hủy
            if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
                try {
                    connection.destroy();
                } catch (e) {
                    console.error("Bỏ qua lỗi khi destroy:", e.message);
                }
            }
            return; // Thoát ra, không chạy code phát âm thanh bên dưới nữa
        }

        const resource = createAudioResource(url);
        const player = createAudioPlayer();

        player.on('error', error => {
            console.error('⚠️ Lỗi Player Join Voice:', error.message);
        });

        connection.subscribe(player);
        player.play(resource);
    }

    // 2. Logic khi người dùng rời đi (Bot rời kênh nếu trống)
    if (oldState.channelId && !newState.channelId && oldState.channel) {
        const channel = oldState.channel;
        const remaining = channel.members.filter((m) => !m.user.bot);

        if (remaining.size === 0) {
            const botConnection = getVoiceConnection(channel.guild.id);
            // SỬA LỖI CRASH: Kiểm tra an toàn trước khi destroy
            if (botConnection && botConnection.state.status !== VoiceConnectionStatus.Destroyed) {
                try {
                    botConnection.destroy();
                    console.log("👋 Bot đã rời vì voice trống.");
                } catch (e) {
                    console.error("Lỗi khi bot tự rời kênh:", e.message);
                }
            }
        }
    }
});

startBot();
