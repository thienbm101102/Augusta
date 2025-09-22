const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllBalances } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const sortedUsers = await getAllBalances();

      if (sortedUsers.length === 0) {
        return interaction.editReply({ content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!', ephemeral: true });
      }

      const medals = ['<:gold_medal:1260462410385960960>', '<:silver_medal:1260462432822151240>', '<:bronze_medal:1260462412801458266>'];
      
      const leaderboardDescription = await Promise.all(
        sortedUsers.slice(0, 10).map(async (user, index) => {
          let rankIcon = medals[index] || `**${index + 1}.**`;
          let discordUser = 'Người dùng không xác định';
          try {
            const fetchedUser = await interaction.client.users.fetch(user.id);
            discordUser = fetchedUser.tag;
          } catch (e) {
            console.error(`Không thể lấy thông tin người dùng ${user.id}:`, e);
            discordUser = `<@${user.id}>`; // Fallback to mention
          }
          return `${rankIcon} ${discordUser} — **${user.balance.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
        })
      );

      const embed = new EmbedBuilder()
        .setTitle('**<a:leaf_left:1408895436374413346> Bảng Xếp Hạng Người Giàu Nhất <a:leaf_right:1408895438882414674>**')
        .setDescription(leaderboardDescription.join('\n'))
        .setColor('#2ecc71');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng.', ephemeral: true });
    }
  },
};
