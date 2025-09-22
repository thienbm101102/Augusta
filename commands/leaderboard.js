const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllBalances } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Lấy dữ liệu người dùng đã được sắp xếp từ database
      const sortedUsers = await getAllBalances();

      if (sortedUsers.length === 0) {
        return interaction.editReply({ content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!', ephemeral: true });
      }

      const medals = [];
      
      const leaderboardDescription = await Promise.all(
        sortedUsers.slice(0, 10).map(async (user, index) => {
          let rankIcon = medals[index] || `**${index + 1}.**`;
          let discordUser = 'Người dùng không xác định';
          try {
            const fetchedUser = await interaction.client.users.fetch(user.id);
            discordUser = fetchedUser.tag;
          } catch (e) {
            console.error(`Không thể lấy thông tin người dùng ${user.id}:`, e);
          }
          return `${rankIcon} <@${user.id}> — **${user.balance.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
        })
      );

      const embed = new EmbedBuilder()
        .setTitle('**Bảng Xếp Hạng Tài Sản**')
        .setDescription(leaderboardDescription.join('\n'))
        .setTimestamp()
        .setColor('#e74c3c');
      
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng!', ephemeral: true });
    }
  },
};


