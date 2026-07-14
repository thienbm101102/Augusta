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
const googleTTS = require("google-tts-api");
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

// Hàm phụ trợ cho TTS
function streamFromUrl(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const stream = new Readable().wrap(res);
                resolve(stream);
            })
            .on("error", reject);
    });
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
    // Ngăn bot phản hồi chính nó, hệ thống hoặc lệnh slash
    if (message.author.bot || message.system || message.content.startsWith('/')) return; 

    // --- LOGIC ĐỌC TIN NHẮN (TTS) ---
    try {
        const config = await Config.findById('config');
        
        // 1. Kiểm tra kênh đã set
        if (config && config.ttsTextChannel === message.channel.id) {
            
            // 2. TÌM KÊNH THOẠI CỦA NGƯỜI GỬI
            const memberVoiceChannel = message.member.voice.channel;
            
            // Dùng isVoiceBased() để hỗ trợ cả Voice Channel bình thường và Stage Channel
            if (!memberVoiceChannel || !memberVoiceChannel.isVoiceBased()) {
                return;
            }

            // 3. Chuẩn bị text (Đảm bảo tổng độ dài tuyệt đối < 200 ký tự)
            // Đổi câu dẫn ngắn gọn hơn để ưu tiên đọc nội dung tin nhắn
            const prefix = `${message.member.displayName} nói: `; 
            const maxLen = 200 - prefix.length - 3; // Trừ hao cho dấu "..."
            
            let msgContent = message.content;
            if (msgContent.length > maxLen) { 
                msgContent = msgContent.substring(0, maxLen) + '...';
            }
            
            const text = prefix + msgContent;
            console.log(`TTS: Đọc tin nhắn từ ${message.author.tag} | Độ dài: ${text.length}/200`);

            // 4. Kết nối và phát
            const connection = joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: memberVoiceChannel.guild.id,
                adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true, // Nên để true giúp bot tiết kiệm băng thông khi không cần nghe
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);

            const url = googleTTS.getAudioUrl(text, {
                lang: "vi",
                slow: false,
                host: "https://translate.google.com",
            });
            
            // Bỏ qua streamFromUrl, Discord.js hỗ trợ nạp thẳng URL rất ổn định
            const resource = createAudioResource(url);
            const player = createAudioPlayer();

            connection.subscribe(player);
            player.play(resource);
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
    // ... (logic chào và rời kênh giữ nguyên) ...
    if (
        !oldState.channelId &&
        newState.channelId &&
        newState.member &&
        !newState.member.user.bot
    ) {
        // ... (logic chào) ...
        const member = newState.member;
        const channel = newState.channel;

        const text = `${member.displayName} đã tham gia kênh thoại`;

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
            await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
        } catch {
            if (connection && !connection.destroyed) connection.destroy();
            return;
        }

        const audioStream = await streamFromUrl(url);
        const resource = createAudioResource(audioStream);
        const player = createAudioPlayer();

        connection.subscribe(player);
        player.play(resource);

    }

    // Nếu voice trống → bot rời
    if (oldState.channelId && !newState.channelId && oldState.channel) {
        const channel = oldState.channel;
        const remaining = channel.members.filter((m) => !m.user.bot);

        if (remaining.size === 0) {
            const botConnection = getVoiceConnection(channel.guild.id);
            if (botConnection && botConnection.state.status !== "destroyed") {
                botConnection.destroy();
                console.log("👋 Bot đã rời vì voice trống.");
            }
        }
    }
});

// Khởi động bot (kết nối DB và login)
startBot();
