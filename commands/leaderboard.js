// leaderboard.js (option quick)
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
      if (!sortedUsers || sortedUsers.length === 0) {
        return interaction.editReply({ content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!', ephemeral: true });
      }

      const lines = sortedUsers.slice(0, 10).map((user, index) => {
  const medals = [
    '<:gold_medal:1260462410385960960>',
    '<:silver_medal:1260462432822151240>',
    '<:bronze_medal:1260462412801458266>'
  ];
  const rankIcon = medals[index] || `**${index + 1}.**`;

  // Dùng mention <@id> → Discord sẽ hiện tên + avatar khi hover
  const mention = `<@${user.id}>`;

  return `${rankIcon} ${mention} — **${user.balance.toLocaleString()}** <a:diamondgem:1402590496647413811>`;
});

      const embed = new EmbedBuilder()
  .setTitle('**<a:leaf_left:1408895436374413312> Bảng Xếp Hạng Tài Sản <a:leaf_right:1408895433555578880>**')
  .setDescription(lines.join('\n'))
  .setColor('#FFD700')
  .setThumbnail(interaction.client.user.displayAvatarURL())
  .setTimestamp();


      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng!', ephemeral: true });
    }
  },
};



