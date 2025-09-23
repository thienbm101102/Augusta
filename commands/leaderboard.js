const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllBalances } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const sorted = await getAllBalances();
      if (!sorted || sorted.length === 0) {
        return interaction.editReply({
          content: '😮 Không có dữ liệu người chơi!',
          ephemeral: true
        });
      }

      const medals = ['🥇', '🥈', '🥉'];
      
const lines = await Promise.all(
    sorted.slice(0, 10).map(async (user, index) => {
        const rankIcon = medals[index] || `**${index + 1}.**`;
        
        // Sử dụng user.userId thay vì user.id
        let displayName = `<@${user.userId}>`; 

        try {
            const fetched = await interaction.client.users.fetch(user.userId, { force: true });
            // Ưu tiên globalName (biệt danh toàn Discord), fallback username
            displayName = fetched.globalName || fetched.username;
        } catch (e) {
            console.warn(`[bangxephang] Không fetch được user ${user.userId}:`, e.message);
        }

        return `${rankIcon} ${displayName} — **${user.balance.toLocaleString()}** <a:diamondgem:1402590496647413811>`;
    })
);

      const embed = new EmbedBuilder()
        .setTitle('**🌿 Bảng Xếp Hạng Tài Sản**')
        .setDescription(lines.join('\n'))
        .setColor('#FFD700')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: '❌ Đã xảy ra lỗi khi tạo bảng xếp hạng.',
        ephemeral: true
      });
    }
  }
};
