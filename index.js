const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionsBitField,
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
// 📌 Import Config Model
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
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    // Dùng .default nếu file lệnh vẫn còn dùng ES module syntax (cần chuyển sang module.exports để đồng bộ)
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    } else if (command.default && command.default.data && command.default.execute) {
        client.commands.set(command.default.data.name, command.default);
    }
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
// --- Xử lý Sự kiện READY ---
// ------------------------------------------------------------------
client.on('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log('Bot đang ở các server:');
    client.guilds.cache.forEach(guild => {
        console.log(`${guild.name} — ${guild.id}`);
    });

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
                
                // 📌 Đọc cấu hình từ MongoDB thay vì file config.json
                const config = await Config.findById('config');

                if (!config) {
                     return await interaction.reply({
                        content: "❌ Cấu hình Confession chưa được thiết lập. Vui lòng chạy lệnh `/confession setup`.",
                        ephemeral: true,
                    });
                }
                
                // Giả định logic quyền duyệt Confession
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
                    // 📌 Dùng config.publicChannel từ MongoDB
                    const publicChannel = await client.channels.fetch(config.publicChannel).catch(() => null);
                    if (!publicChannel) return;

                    const embed = new EmbedBuilder()
                        .setTitle("<a:AbbyPeak:1393909356625657876>**Confession Ẩn Danh**")
                        .setDescription(originalContent)
                        .setColor("Blue")
                        .setFooter({ text: "Gửi bởi một ai đó trong máy chủ" })
                        .setTimestamp();

                    const sent = await publicChannel.send({ embeds: [embed] });
                    const emojis = [
                        "<a:AbbyPray:1393909359154696233>",
                        "<a:AbbyShocked:1393909368138895411>",
                        "<a:AbbyAngry:1393908721624551434>",
                        "<a:AbbyExplain:1393909308554739732>",
                        "<a:AbbyWOW:1393909383884439602>",
                    ];
                    for (const emoji of emojis) await sent.react(emoji);
                }
            } else if (command && typeof command.handleButton === 'function') {
                // Logic xử lý nút bấm chung
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
        
        // 📌 Xử lý lỗi Unknown interaction (10062) để ngăn crash và lỗi 503
        if (error.code === 10062) {
            console.warn('⚠️ Unknown Interaction (10062) - Đã bỏ qua lỗi tương tác hết hạn để tránh crash.');
            return; 
        }

        // Khối catch chung
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
            }
        } catch (responseError) {
            console.error('❌ Lỗi thứ cấp khi cố gắng phản hồi lỗi:', responseError);
        }
    }
});


// ------------------------------------------------------------------
// --- Xử lý Tin nhắn (Message) ---
// ------------------------------------------------------------------
client.on('messageCreate', async message => {
    // 📌 Xử lý logic đoán số
    if (client.commands.has('doanso')) {
        const doansoCommand = client.commands.get('doanso');
        // Chỉ kích hoạt nếu nội dung là 'doanso' (giả định)
        if (message.content.toLowerCase() === 'doanso') { 
            await doansoCommand.execute(message, client);
        }
    }
});


// ------------------------------------------------------------------
// --- Xử lý Voice State Update (TTS) ---
// ------------------------------------------------------------------
client.on("voiceStateUpdate", async (oldState, newState) => {
    // Khi có user mới vào voice
    if (
        !oldState.channelId &&
        newState.channelId &&
        newState.member &&
        !newState.member.user.bot
    ) {
        const member = newState.member;
        const channel = newState.channel;

        const text = `Chào mừng ${member.displayName} đã tham gia ${channel.name}!`;

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

        player.on(AudioPlayerStatus.Idle, () => {
            // Bot sẽ không tự rời ngay sau khi đọc xong
        });
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
