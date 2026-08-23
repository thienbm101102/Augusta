// index.js (Đã sửa triệt để lỗi Crash và lỗi Im lặng bằng cách dùng file MP3 tạm)

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
    AudioPlayerStatus, // Thêm trạng thái để biết khi nào đọc xong
} = require("@discordjs/voice");
const googleTTS = require("google-tts-api");
const { v4: uuidv4 } = require('uuid'); // Dùng tạo tên file ngẫu nhiên (Đã có sẵn trong package.json)

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

// 🟢 HÀM XỬ LÝ TTS CHUẨN (TẢI FILE -> ĐỌC -> XOÁ)
async function playTTS(text, voiceChannel) {
    let tempFileName = "";
    try {
        // 1. Tải audio dạng Base64 từ Google
        const base64 = await googleTTS.getAudioBase64(text, {
            lang: "vi",
            slow: false,
            host: "https://translate.google.com",
            timeout: 10000,
        });

        // 2. Tạo tên file mp3 ngẫu nhiên và lưu vào ổ cứng
        tempFileName = path.join(__dirname, `${uuidv4()}.mp3`);
        fs.writeFileSync(tempFileName, Buffer.from(base64, "base64"));

        // 3. Kết nối kênh thoại
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        // BỌC LỖI Ở ĐÂY: Nếu ai đó rời phòng sớm làm bot out, nó sẽ huỷ êm đẹp
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        } catch (err) {
            if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
                connection.destroy();
            }
            if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
            console.log("⚠️ Huỷ đọc TTS (Do người dùng rời đi sớm hoặc mạng delay).");
            return; // Dừng lại ở đây, không báo lỗi đỏ
        }

        // 4. Phát audio trực tiếp từ file mp3
        const player = createAudioPlayer();
        const resource = createAudioResource(tempFileName);
        
        connection.subscribe(player);
        player.play(resource);

        // 5. Xoá file rác khi đọc xong hoặc khi có lỗi phát
        player.on(AudioPlayerStatus.Idle, () => {
            if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
        });

        player.on('error', error => {
            console.error(`❌ Lỗi AudioPlayer: ${error.message}`);
            if (fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
        });

    } catch (error) {
        console.error("❌ Lỗi trong luồng playTTS:", error.message);
        if (tempFileName && fs.existsSync(tempFileName)) fs.unlinkSync(tempFileName);
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

    try {
        const config = await Config.findById('config');
        
        if (config && config.ttsTextChannel === message.channel.id) {
            const memberVoiceChannel = message.member.voice.channel;
            if (!memberVoiceChannel || memberVoiceChannel.type !== ChannelType.GuildVoice) return;

            let text = message.content;
            if (text.length > 200) text = text.substring(0, 200) + '...';
            text = `${message.member.displayName} nói: ${text}`; // Đã làm cho câu đọc ngắn gọn, tự nhiên hơn
            
            console.log(`🔊 [Message TTS] -> ${text}`);
            
            // Gọi hàm playTTS duy nhất ở trên
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
        console.log(`🟢 [Voice Join] ${newState.member.displayName} vào ${newState.channel.name}`);
        
        // Gọi hàm playTTS
        await playTTS(text, newState.channel);
    }

    // Logic thoát room (ĐÃ SỬA LỖI CRASH 100%)
    // Kiểm tra thêm điều kiện: Người out không phải là bot (tránh vòng lặp bot tự out -> chạy lại sự kiện out)
    if (oldState.channelId && !newState.channelId && !oldState.member.user.bot && oldState.channel) {
        const channel = oldState.channel;
        const remaining = channel.members.filter((m) => !m.user.bot);

        if (remaining.size === 0) {
            const botConnection = getVoiceConnection(channel.guild.id);
            
            if (botConnection) {
                try {
                    // Kiểm tra an toàn trước khi destroy
                    if (botConnection.state.status !== VoiceConnectionStatus.Destroyed) {
                        botConnection.destroy();
                        console.log("👋 Bot đã rời vì voice trống.");
                    }
                } catch (error) {
                    console.error("⚠️ Lỗi ngắt kết nối (bỏ qua được):", error.message);
                }
            }
        }
    }
});

startBot();
