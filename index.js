// File: index.js

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require("express");
const db = require('./db'); // Import module db mới để dùng MongoDB

// 🌐 Web server cho Render (healthcheck)
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(process.env.PORT || 10000, () => {
  console.log("🌐 Web server is running on port 10000");
});

// 🚀 Tạo bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildPresences
  ]
});

client.commands = new Collection();

// 📂 Load lệnh trong thư mục commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// 🚀 Khởi động bot + kết nối MongoDB
async function startBot() {
  try {
    console.log("🚀 Đang kết nối tới MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Đã kết nối thành công tới MongoDB.");

    await client.login(process.env.TOKEN);
  } catch (error) {
    console.error("❌ Lỗi khi khởi động bot:", error);
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('Bot đang ở các server:\n' + client.guilds.cache.map(g => `${g.name} — ${g.id}`).join('\n'));

  client.user.setPresence({
    activities: [{ name: "Augusta bot", type: 2 }],
    status: "online"
  });

  // 🎂 Lập lịch check sinh nhật mỗi 9h sáng
  cron.schedule('0 9 * * *', async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const birthdayChannelId = '1416016624728805416'; // 📌 thay bằng kênh bạn muốn
    const birthdayChannel = await client.channels.fetch(birthdayChannelId).catch(() => null);
    if (!birthdayChannel) return console.log('⚠️ Kênh sinh nhật không tồn tại.');

    const birthdayUsers = await db.User.find({
      'birthday.month': currentMonth,
      'birthday.day': currentDay
    });

    if (birthdayUsers.length > 0) {
      let message;
      if (birthdayUsers.length === 1) {
        message = `<a:AbbyCheer:1393908739165392927> Chúc mừng sinh nhật **<@${birthdayUsers[0].userId}>** 🎉🎂`;
      } else {
        const mentions = birthdayUsers.map(u => `<@${u.userId}>`).join(', ');
        message = `<a:AbbyCheer:1393908739165392927> Chúc mừng sinh nhật **${mentions}** 🎉🎂`;
      }
      await birthdayChannel.send(message);
    }
  });
});

// 📌 Xử lý slash command & button
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
    // Xử lý lỗi một cách an toàn
    // Nếu tương tác đã được phản hồi hoặc hoãn, sử dụng followUp
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
    } else {
      // Nếu chưa, sử dụng reply
      await interaction.reply({ content: '❌ Có lỗi xảy ra khi thực thi tương tác này!', ephemeral: true });
    }
  }
});

// 📌 Xử lý message thường (VD: điểm kinh nghiệm, đoán số)
client.on('messageCreate', async message => {
  if (client.commands.has('doanso')) {
    const doansoCommand = client.commands.get('doanso');
    if (doansoCommand.handleMessage) {
      await doansoCommand.handleMessage(message);
    }
  }

  if (!message.author.bot) {
    await db.handleMessage(message.author.id); // lưu XP/level vào MongoDB
  }
});

// 🚀 Chạy bot
startBot();
