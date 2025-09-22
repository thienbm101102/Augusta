// commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllBalances } = require('../db'); // lấy hàm từ db.js (MongoDB)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Lấy dữ liệu từ MongoDB
      const sorted = await getAllBalances();

      if (!sorted || sorted.length === 0) {
        return interaction.editReply({
          content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!',
          ephemeral: true
        });
      }

      const medals = [
        '<:gold_medal:1260462410385960960>',
        '<:silver_medal:1260462432822151240>',
        '<:bronze_medal:1260462412801458266>'
      ];

      const lines = await Promise.all(
        sorted.slice(0, 10).map(async (user, index) => {
          const rankIcon = medals[index] || `**${index + 1}.**`;
          let display = `<@${user.id}>`; // fallback mention
          try {
            const fetched = await interaction.client.users.fetch(user.id);
            display = fetched.globalName || fetched.tag || fetched.username || display;
          } catch (e) {
            // Nếu fetch fail vẫn dùng mention
          }
          return `${rankIcon} ${display} — **${user.balance.toLocaleString()}** <a:diamondgem:1402590496647413811>`;
        })
      );

      const embed = new EmbedBuilder()
        .setTitle('**<a:leaf_left:1408895436374413312> Bảng Xếp Hạng Tài Sản <a:leaf_right:1408895433555578880>**')
        .setDescription(lines.join('\n'))
        .setColor('#FFD700')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[bangxephang] Error:', err);
      if (interaction.deferred || interaction.replied) {
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
