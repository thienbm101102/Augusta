const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllBalances } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      // Sửa lỗi: Sử dụng hàm bất đồng bộ từ db.js để lấy dữ liệu đã được sắp xếp
      const sorted = await getAllBalances();

      if (sorted.length === 0) {
        return interaction.reply({ content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!', ephemeral: true });
      }

      const medals = ['', '', '']; // 3 hạng đầu
      let desc = sorted
        .slice(0, 10) // Chỉ lấy top 10
        .map((user, index) => {
          let rankIcon = medals[index] || `**${index + 1}.**`;
          return `${rankIcon} <@${user.id}> — **${user.balance.toLocaleString()}<a:diamondgem:1402590496647413811>**`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('**<a:leaf_left:1408895436374413342> Bảng Xếp Hạng Tiền Mặt <a:leaf_right:1408895434771392602>**')
        .setDescription(desc)
        .setTimestamp()
        .setColor('#e74c3c');
      
      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng!', ephemeral: true });
    }
  },
};
