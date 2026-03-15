const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const clientId = process.env.CLIENT_ID || "1404793124991139850";
const guildId = process.env.GUILD_ID || "1418490590869590039";
// Nhớ thay Token mới sau khi bạn Reset trên Discord Developer Portal nhé!
const token = process.env.TOKEN || "MTQwNDc5MzEyNDk5MTEzOTg1MA.GlsLdo.04Gmfonwe5BVOGd9WnIV3yb9MZ6h2rA3XlQeLE";

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Refreshing ${commands.length} slash commands...`);
    
    // Đã sửa thành applicationGuildCommands để lệnh hiện lên server của bạn ngay lập tức
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    
    console.log('✅ Slash commands deployed!');
    
    // DÒNG QUAN TRỌNG: Ép file này tự tắt sau khi xong việc để Render có thể chạy tiếp npm start
    process.exit(0);
  } catch (error) {
    console.error(error);
    // Báo lỗi và tự tắt tiến trình nếu deploy thất bại
    process.exit(1); 
  }
})();
