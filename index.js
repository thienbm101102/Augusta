// index.js (Đã fix lỗi nhận dạng link async của FPT.AI V5)
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

const Config = require('./models/Config'); 

// --- Web server giữ cho Render không ngủ ---
const app = express();
const PORT = process.env.PORT || 10000; 

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("✅ Bot đang hoạt động với hệ thống FPT.AI TTS!");
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
        
        // KIỂM TRA KEY FPT
        if (!process.env.FPT_API_KEY) {
            console.warn("⚠️ CẢNH BÁO: Chưa tìm thấy FPT_API_KEY trong hệ thống!");
        } else {
            let testKey = process.env.FPT_API_KEY.replace(/['"]/g, '').replace(/\r?\n|\r/g, "").trim();
            console.log(`✅ Đã nhận được FPT_API_KEY (Độ dài: ${testKey.length} ký tự). Đầu chuỗi: ${testKey.substring(0, 5)}...`);
        }

        client.login(process.env.TOKEN);
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
    }
}

// --- HÀM PHỤ TRỢ: FPT.AI TTS ---
async function playTTS(text, voiceChannel) {
    try {
        if (!process.env.FPT_API_KEY) {
            console.error("❌ LỖI: Bot chưa nhận được API Key FPT.");
            return;
        }

        const cleanApiKey = process.env.FPT_API_KEY.replace(/['"]/g, '').replace(/\r?\n|\r/g, "").trim();

        if (text.length > 1000) text = text.substring(0, 997) + '...';

        const response = await fetch("https://api.fpt.ai/hmi/tts/v5", {
            method: "POST",
            headers: {
                "api-key": cleanApiKey,
                "voice": "banmai", 
                "speed": "0",
                "Content-Type": "text/plain; charset=utf-8" 
            },
            body: text
        });

        const rawResponse = await response.text();
        let data;
        try {
            data = JSON.parse(rawResponse);
        } catch (err) {
            throw new Error(`Lỗi phản hồi từ máy chủ FPT: ${rawResponse}`);
        }

        // 📌 ĐÃ SỬA: Kiểm tra data.async thay vì data.audiourl
        if (data.error !== 0 || (!data.async && !data.audiourl)) {
            throw new Error(`FPT API Error: ${data.message || JSON.stringify(data)}`);
        }

        // 📌 Lấy link từ biến async của FPT
        const audioUrl = data.async || data.audiourl;

        // Chờ file mp3 được tạo trên hệ thống FPT (Ping kiểm tra tối đa 10 lần)
        let isReady = false;
        for (let i = 0; i < 10; i++) {
            const checkReq = await fetch(audioUrl, { method: "HEAD" });
            if (checkReq.ok) {
                isReady = true;
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        if (!isReady) throw new Error("Quá thời gian tạo âm thanh từ hệ thống FPT.");

        // Phát âm thanh
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true, 
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

        const player = createAudioPlayer();
        const resource = createAudioResource(audioUrl);

        player.on('error', error => {
            console.error(`❌ Lỗi Audio Player: ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);

        console.log(`🔊 [FPT.AI] Đã phát thành công: "${text}"`);
    } catch (error) {
        console.error("❌ Lỗi trong hàm playTTS (FPT.AI):", error.message || error);
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
                if (!config) return interaction.reply({ content: '❌ Cấu hình Confession chưa thiết lập.', ephemeral: true });

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
        if (error.code === 10062) return;
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Có lỗi xảy ra!', ephemeral: true }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true }).catch(() => {});
        }
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
            if (memberVoiceChannel && memberVoiceChannel.isVoiceBased()) {
                const text = `${message.member.displayName} nói: ${message.content}`;
                await playTTS(text, memberVoiceChannel);
            }
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
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
        const member = newState.member;
        const channel = newState.channel;
        const text = `${member.displayName} vừa vào phòng.`;

        console.log(`🟢 [JOIN] ${member.displayName} vào voice: ${channel.name}`);
        await playTTS(text, channel);
    }

    if (oldState.channelId && !newState.channelId && oldState.channel) {
        const channel = oldState.channel;
        const remaining = channel.members.filter((m) => !m.user.bot);

        if (remaining.size === 0) {
            const botConnection = getVoiceConnection(channel.guild.id);
            if (botConnection && botConnection.state.status !== "destroyed") {
                botConnection.destroy();
                console.log("👋 Bot đã rời vì phòng voice trống.");
            }
        }
    }
});

startBot();
