// index.js (Đã sửa lỗi, thêm TTS, và chuẩn bị MongoDB)

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
        GatewayIntentBits.Guilddung: ${text}`;
            
            console.log(`TTS: Đọc tin nhắn từ ${message.author.tag} trong kênh ${message.channel.name}`);

            // 4. Kết nối và phát (tham gia kênh của người gửi)
            const connection = joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: memberVoiceChannel.guild.id,
                adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                selfDeaf: false,
            });

            await entersState(connection, VoiceConnectionStatus.Ready, 5_000);

            const url = googleTTS.getAudioUrl(text, {
                lang: "vi",
                slow: false,
                host: "https://translate.google.com",
            });
            
            const audioStream = await streamFromUrl(url);
            const resource = createAudioResource(audioStream);
            const player = createAudioPlayer();

            connection.subscribe(player);
            player.play(resource);

            // Bot không tự rời ngay sau khi đọc, logic voiceStateUpdate sẽ xử lý
        }
    } catch (e) {
        console.error("❌ Lỗi khi thực thi logic TTS:", e);
    }


    // 📌 Xử lý logic đoán số (Giữ nguyên)
    if (client.commands.has('doanso')) {
        const doansoCommand = client.commands.get('doanso');
        // Chỉ kích hoạt nếu nội dung là 'doanso'
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
