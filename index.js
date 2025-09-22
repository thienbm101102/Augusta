const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require("express");
const app = express();
const db = require('./db'); // Đảm bảo bạn đã import module db mới

// Khởi tạo web server cho Render Healthcheck
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Web server is running on port 10000"); // Đổi port 3000 thành 10000 vì Render dùng port 10000
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

        // Khởi động bot sau khi kết nối DB thành công
        await client.login(process.env.TOKEN);

    } catch (error) {
        console.error("❌ Lỗi khi khởi động bot:", error);
    }
}

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    const list = client.guilds.cache.map(g => `${g.name} — ${g.id}`);
    console.log('Bot đang ở các server:\n' + list.join('\n'));
    client.user.setPresence({
        activities: [
            { name: "blackjack-bot", type: 2 }
        ],
        status: "online"
    });
  
  // Kết nối đến MongoDB
  try {
      await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
      console.log("🚀 MongoDB đã kết nối thành công!");
  } catch (err) {
      console.error("❌ Lỗi khi kết nối tới MongoDB:", err);
      // Thoát nếu không thể kết nối
      process.exit(1);
  }
    // Lập lịch kiểm tra sinh nhật vào lúc 9 giờ sáng mỗi ngày (theo múi giờ của máy chủ)
    cron.schedule('0 9 * * *', async () => {
        const db = getDB();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        const birthdayChannelId = '1416016624728805416'; // 📌 Thay thế bằng ID kênh Discord bạn muốn bot gửi tin nhắn

        if (!birthdayChannelId) return console.log('Không tìm thấy ID kênh sinh nhật.');
        const birthdayChannel = await client.channels.fetch(birthdayChannelId);
        if (!birthdayChannel) return console.log('Kênh sinh nhật không tồn tại.');

        const birthdayUsers = Object.keys(db.users).filter(userId => {
            const user = db.users[userId];
            return user.birthday && user.birthday.month === currentMonth && user.birthday.day === currentDay;
        });

        if (birthdayUsers.length > 0) {
            let message = '';
            if (birthdayUsers.length === 1) {
                message = `<a:AbbyCheer:1393908739165392927> Chúc mừng sinh nhật **<@${birthdayUsers[0]}>**! Chúc bạn một ngày thật vui vẻ, đáng nhớ và luôn luôn hạnh phúc nhé!`;
            } else {
                const userMentions = birthdayUsers.map(id => `<@${id}>`).join(', ');
                message = `<a:AbbyCheer:1393908739165392927> Chúc mừng sinh nhật **${userMentions}**! Tuổi mới rực rỡ hơn nữa nhé`;
            }

            await birthdayChannel.send(message);
        }
    });
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
    } else if (interaction.isButton()) {
      // Tìm tên lệnh bằng cách chia customId tại dấu _ hoặc -
      // Giờ đây, mỗi file lệnh sẽ tự deferUpdate, tránh lỗi 40060
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

client.login(process.env.TOKEN);
