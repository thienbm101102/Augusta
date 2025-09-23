// File: index.js

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require("express");
const app = express();
const db = require('./db');

// Khởi tạo web server cho Render Healthcheck
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(process.env.PORT || 10000, () => {
  console.log("🌐 Web server is running on port 10000");
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

        // Khởi động bot sau khi kết nối thành công
        await client.login(process.env.TOKEN);
    } catch (err) {
        console.error("❌ Failed to connect to MongoDB:", err);
    }
}

startBot();

client.on('ready', async () => {
  console.log(`🤖 Bot đã đăng nhập với tên ${client.user.tag}`);
  console.log('Bot đang ở các server:');
  client.guilds.cache.forEach(guild => {
    console.log(`${guild.name} — ${guild.id}`);
   client.user.setPresence({
    activities: [{ name: "Đến đây và chơi nàooo", type: 0 }],
    status: "idle"
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
        if (typeof doansoCommand.handleMessage === 'function') {
            await doansoCommand.handleMessage(message);
        }
    }
});
