// commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readFileSync } = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      // Đọc dữ liệu từ db.json
      const dbPath = path.join(__dirname, '../db.json');
      const db = JSON.parse(readFileSync(dbPath, 'utf8'));
      const users = db.users || {};

      // Sắp xếp top 10 theo balance
      const sorted = Object.entries(users)
        .map(([id, data]) => ({ id, balance: data.balance || 0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);

      if (sorted.length === 0) {
        return interaction.reply({
          content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!',
          ephemeral: true
        });
      }

      // Icon cho top 3
      const medals = [
        '<:gold_medal:1260462410385960960>',
        '<:silver_medal:1260462432822151240>',
        '<:bronze_medal:1260462412801458266>'
      ];

      // Tạo description
      const desc = sorted.map((user, index) => {
        const rankIcon = medals[index] || `**${index + 1}.**`;
        // dùng mention <@id> để Discord tự hiển thị tên
        return `${rankIcon} <@${user.id}> — **${user.balance.toLocaleString()}** <a:diamondgem:1402590496647413811>`;
      }).join('\n');

      // Embed
      const embed = new EmbedBuilder()
        .setTitle('**<a:leaf_left:1408895436374413312> Bảng Xếp Hạng Tài Sản <a:leaf_right:1408895433555578880>**')
        .setDescription(desc)
        .setColor('#FFD700')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[bangxephang] Error:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '<a:AbbyShocked:1393909368138895411> Lỗi khi hiển thị bảng xếp hạng!',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: '<a:AbbyShocked:1393909368138895411> Lỗi khi hiển thị bảng xếp hạng!',
          ephemeral: true
        });
      }
    }
  }
};
