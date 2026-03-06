// index.js (Phiên bản Đã Fix Lỗi Không Đọc + Tối Ưu Code)

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

// Nạp Model Config
const Config = require('./models/Config'); 

// --- Web server giữ cho Render không ngủ ---
const app = express();
const PORT = process.env.PORT || 10000; 

app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("✅ Bot đang hoạt động!");
});

app.listen(PORT, 0.0.0.0, () => {
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
            console.error(`❌ Lỗi khi tải lệnh ${file}. Vui lòng kiểm tra cú pháp:`, e);
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

// ------------------------------------------------------------------
// --- HÀM HỖ TRỢ PHÁT TTS (TỐI ƯU CHO RENDER) ---
// ------------------------------------------------------------------
async function playTTS(channel, text) {
    try {
        console.log(`🔊 Chuẩn bị đọc: "${text}" trong kênh ${channel.name}`);
        
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

        // Fix lỗi Render drop UDP: Bỏ qua lỗi timeout, cứ thử kết nối
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        } catch (error) {
            console.warn("⚠️ Mạng chậm, bot vẫn sẽ cố gắng phát âm thanh...");
        }

        // Tải trực tiếp âm thanh từ URL
        const resource = createAudioResource(url);
        const player = createAudioPlayer();

        player.on('error', error => {
            console.error('❌ Lỗi Trình phát âm thanh:', error.message);
        });

        connection.subscribe(player);
        player.play(resource);

    } catch (error) {
        console.error("❌ Lỗi trong hàm playTTS:", error);
    }
}

// ------------------------------------------------------------------
// --- Xử lý sự kiện chung ---
// ------------------------------------------------------------------
client.on('clientReady', async () => {
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
                if (!config) return interaction.reply({ content: '❌ Chưa setup Confession.', ephemeral: true });
                
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
            await interaction.followUp({ content: '❌ Lỗi thực thi!', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Lỗi thực thi!', ephemeral: true });
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
            
            if (!memberVoiceChannel || !memberVoiceChannel.isVoiceBased()) return;

            const prefix = `${message.member.displayName} nói: `;
            const maxLen = 200 - prefix.length; 
            let cleanText = message.content;
            
            if (cleanText.length > maxLen) { 
                cleanText = cleanText.substring(0, maxLen - 3) + '...';
            }
            const finalText = prefix + cleanText;
            
            // GỌI HÀM PHÁT TTS
            await playTTS(memberVoiceChannel, finalText);
        }
    } catch (e) {
        console.error("❌ Lỗi TTS (Message):", e);
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
    try {
        const isJoiningChannel = newState.channelId && oldState.channelId !== newState.channelId;

        if (isJoiningChannel && newState.member && !newState.member.user.bot) {
            const channel = newState.channel;
            const text = `${newState.member.displayName} vừa mới vào phòng`;

            // GỌI HÀM PHÁT TTS
            await playTTS(channel, text);
        }

        // Rời voice nếu trống
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
    } catch (error) {
        console.error(`❌ Lỗi TTS (Voice State):`, error);
    }
});

// Khởi động bot
startBot();
