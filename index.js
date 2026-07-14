// index.js (Đã sửa lỗi, thêm TTS, và dùng MongoDB cho Config)

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionsBitField,
    ChannelType, // Cần cho TTS
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require("express");
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    getVoiceConnection,
} = require("@discordjs/voice");
const { edgeTTS, OUTPUT_FORMAT } = require("edge-tts");
const https = require("https");
const { Readable } = require("stream");

// 📌 THAY THẾ require('./db') bằng require('./models/Config')
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

// --- Tải lệnh (Thêm khối TRY...CATCH để bắt lỗi khởi động) ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            let command = require(path.join(commandsPath, file));
            
            // Xử lý trường hợp dùng ES Module (export default)
            if (command.default) { 
                command = command.default;
            }

            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        } catch (e) {
            console.error(`❌ Lỗi khi tải lệnh ${file}. Vui lòng kiểm tra cú pháp:`, e);
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

// --- Hàm phụ trợ cho TTS dùng Microsoft Edge ---
async function playTTS(text, voiceChannel) {
    try {
        if (!text || !voiceChannel) return;

        // Khởi tạo Edge TTS client
        const tts = new MsEdgeTTS();
        
        // Cài đặt metadata với giọng đọc tiếng Việt (hoặc đổi sang vi-VN-NamMinhNeural cho giọng nam)
        await tts.setMetadata("vi-VN-HoaiMyNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // Lấy stream âm thanh từ Edge Read Aloud API
        const audioStream = tts.toStream(text);

        // Kết nối kênh thoại
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

        const player = createAudioPlayer();
        const resource = createAudioResource(audioStream);

        player.on('error', error => {
            console.error(`❌ Lỗi Audio Player Edge TTS: ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);

        console.log(`🔊 [Edge TTS] Đã phát: "${text}"`);
    } catch (error) {
        console.error("❌ Lỗi trong hàm playTTS (Edge):", error.message || error);
    }
}


// ------------------------------------------------------------------
// --- Xử lý Sự kiện READY (Giữ nguyên) ---
// ------------------------------------------------------------------
client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    // ... (logic trạng thái hoạt động giữ nguyên) ...
    client.user.setPresence({
        activities: [{
            name: `/help để biết lệnh của BOT nhé ^^`, 
            type: 4, 
        }],
        status: 'online', 
    });
    console.log('✅ Đã thiết lập trạng thái hoạt động của Bot.');
});


// ------------------------------------------------------------------
// --- Xử lý Tương tác (Interactions) (Dùng DB cho Confession) ---
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
                // 📌 DÙNG CONFIG TỪ DB
                const config = await Config.findById('config'); 
                if (!config) return interaction.reply({ content: '❌ Cấu hình Confession chưa được thiết lập (chạy /confession setup).', ephemeral: true });

                
                if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return await interaction.reply({ content: "❌ Bạn không có quyền duyệt.", ephemeral: true });
                }

                await interaction.deferUpdate();

                const targetMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
                if (!targetMsg) return;

                const originalContent = targetMsg.embeds[0]?.description || "Không rõ nội dung";

                // disable nút sau khi bấm
                const disabledRow = {
                    type: 1,
                    components: targetMsg.components[0].components.map((btn) => ({
                        ...btn.data,
                        disabled: true,
                    })),
                };
                await targetMsg.edit({ components: [disabledRow] });

                if (commandName === 'accept') {
                    const publicChannel = await client.channels.fetch(config.publicChannel).catch(() => null); // 📌 Dùng config.publicChannel từ DB
                    if (!publicChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle("<a:AbbyPeak:1393909356625657876>**Confession Ẩn Danh**")
                        .setDescription(originalContent)
                        .setColor("Blue")
                        .setFooter({ text: "Gửi bởi một ai đó trong máy chủ" })
                        .setTimestamp();

                    const sent = await publicChannel.send({ embeds: [embed] });
                    const emojis = [
                        "👍",
                        "❤️",
                        "😂",
                        "😭",
                        "🔥",
                    ];
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
        
        if (error.code === 10062) {
            console.warn('⚠️ Unknown Interaction (10062) - Đã bỏ qua lỗi tương tác hết hạn để tránh crash.');
            return; 
        }

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
            
            // Dùng isVoiceBased() để bao quát tất cả các loại kênh thoại
            if (memberVoiceChannel && memberVoiceChannel.isVoiceBased()) {
                const text = `${message.member.displayName} nói: ${message.content}`;
                await playTTS(text, memberVoiceChannel);
            }
        }
    } catch (e) {
        console.error("❌ Lỗi khi thực thi logic TTS:", e);
    }

    // 📌 Xử lý logic đoán số (Giữ nguyên)
    if (client.commands.has('doanso')) {
        const doansoCommand = client.commands.get('doanso');
        if (message.content.toLowerCase() === 'doanso') { 
            await doansoCommand.execute(message, client);
        }
    }
});


// ------------------------------------------------------------------
// --- Xử lý Voice State Update (TTS Chào/Rời - Giữ nguyên) ---
// ------------------------------------------------------------------
client.on("voiceStateUpdate", async (oldState, newState) => {
    // Nếu có người (không phải bot) THAM GIA vào kênh
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
        const member = newState.member;
        const channel = newState.channel;
        const text = `${member.displayName} vừa vào phòng.`;

        console.log(`🟢 [JOIN] ${member.displayName} vào voice: ${channel.name}`);
        await playTTS(text, channel);
    }

    // Nếu voice trống → bot rời (Giữ nguyên logic của bạn)
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

// Khởi động bot (kết nối DB và login)
startBot();
