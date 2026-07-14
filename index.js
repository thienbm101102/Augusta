// index.js (Phiên bản Google TTS URL - Chống lỗi Render, Đọc tiếng Việt chuẩn)
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

// 📌 THÊM LẠI THƯ VIỆN GOOGLE TTS
const googleTTS = require("google-tts-api");

const Config = require('./models/Config'); 

const app = express();
const PORT = process.env.PORT || 10000; 

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("✅ Bot đang hoạt động với hệ thống Google TTS!");
});

app.listen(PORT, () => {
    console.log(`🌐 Web server đã khởi động tại cổng ${PORT}`);
});

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

// --- HÀM PHỤ TRỢ: GOOGLE TTS (Lấy URL trực tiếp để lách 429 trên Render) ---
async function playTTS(text, voiceChannel) {
    try {
        // Cắt chuỗi an toàn dưới 200 ký tự (Giới hạn của API Google Translate)
        if (text.length > 195) {
            text = text.substring(0, 195) + '...';
        }

        // 1. Chỉ sinh ra URL, KHÔNG tải dữ liệu cục bộ về để tránh bị Google chặn IP
        const url = googleTTS.getAudioUrl(text, {
            lang: "vi",
            slow: false,
            host: "https://translate.google.com",
        });

        // 2. Kết nối Voice
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true, 
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

        // 3. Phát âm thanh trực tiếp (Discord.js Voice sẽ tự stream từ URL)
        const player = createAudioPlayer();
        const resource = createAudioResource(url); 

        player.on('error', error => {
            console.error(`❌ Lỗi Audio Player: ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);

        console.log(`🔊 [Google TTS] Đã phát: "${text}"`);
    } catch (error) {
        console.error("❌ Lỗi trong hàm playTTS:", error.message || error);
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
