// commands/leaderboard.js
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

      // Build lines - dùng mention <@ID> để Discord tự hiển thị tên
      const top = sortedUsers.slice(0, 10);
      const invalidIds = [];
      const lines = top.map((user, index) => {
        const rankIcon = medals[index] || `**${index + 1}.**`;
        const idStr = String(user.id ?? '');
        // kiểm tra cơ bản định dạng snowflake (17-19 chữ số)
        if (!/^\d{17,19}$/.test(idStr)) {
          invalidIds.push({ index: index + 1, id: user.id });
        }
        const mention = idStr ? `<@${idStr}>` : 'Người dùng không xác định';
        const balance = (user.balance ?? 0).toLocaleString();
        return `${rankIcon} ${mention} — **${balance}** <a:diamondgem:1402590496647413811>`;
      });

      // Debug log: nếu có id không hợp lệ thì in ra console để bạn kiểm tra DB
      if (invalidIds.length > 0) {
        console.warn('[bangxephang] Invalid/malformed user IDs in DB (top 10):', invalidIds);
      }

      // đảm bảo length description không vượt quá limit Discord
      let description = lines.join('\n');
      if (description.length > 4096) description = description.slice(0, 4093) + '...';

      const embed = new EmbedBuilder()
        .setTitle('**<a:leaf_left:1408895436374413312> Bảng Xếp Hạng Tài Sản <a:leaf_right:1408895433555578880>**')
        .setDescription(description)
        .setColor('#FFD700')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[bangxephang] Error:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng!', ephemeral: true });
      }
    }
  },
};
