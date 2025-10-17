// index.js

const { Client, Collection, GatewayIntentBits, MessageFlags, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require("express");
const app = express();
const db = require('./db');

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send("✅ Qiuyuan Bot đang hoạt động!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Web server đã khởi động tại cổng ${PORT}`);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildPresences]
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Hàm khởi động bot
async function startBot() {
    try {
        console.log("🚀 Đang kết nối tới MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Đã kết nối thành công tới MongoDB.");
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
    }
}

startBot();

client.on('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('Bot đang ở các server:');
  client.guilds.cache.forEach(guild => {
    console.log(`${guild.name} — ${guild.id}`);
  });

  // 🚀 LOGIC THÊM TRẠNG THÁI HOẠT ĐỘNG
  client.user.setPresence({
      activities: [{ 
          name: `/help để biết lệnh của BOT nhé ^^`, // Hoạt động hiển thị
          type: 4, // 0: PLAYING (Đang chơi), 1: STREAMING (Đang phát trực tiếp), 2: LISTENING (Đang nghe), 3: WATCHING (Đang xem), 4: CUSTOM (Tùy chỉnh), 5: COMPETING (Đang cạnh tranh)
      }],
      status: 'online', // online, idle, dnd, invisible
  });
  console.log('✅ Đã thiết lập trạng thái hoạt động của Bot.');
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
    } else if (interaction.isButton()) {
      const [commandName] = interaction.customId.split(/[_-]/);
      const command = client.commands.get(commandName);

      if (command && typeof command.handleButton === 'function') {
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
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
    }
  }
});

client.on('messageCreate', async message => {
    // 📌 Xử lý logic đoán số
    if (client.commands.has('doanso')) {
        const doansoCommand = client.commands.get('doanso');
        if (message.content === 'doanso') {
            await doansoCommand.execute(message, client);
        }
    }
});

client.login(process.env.TOKEN);
