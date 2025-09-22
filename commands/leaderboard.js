// commands/leaderboard.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangxephang')
    .setDescription('Xem bảng xếp hạng người giàu nhất'),

  async execute(interaction) {
    try {
      // Defer để yên tâm (vì có thể fetch user)
      await interaction.deferReply();

      const dbPath = path.resolve(__dirname, '..', 'db.json');
      if (!fs.existsSync(dbPath)) {
        console.warn('[bangxephang] db.json not found at', dbPath);
        return await interaction.editReply({ content: '❌ Không tìm thấy db.json trên server.', ephemeral: true });
      }

      let raw;
      try {
        raw = fs.readFileSync(dbPath, 'utf8');
      } catch (e) {
        console.error('[bangxephang] Read db.json error:', e);
        return await interaction.editReply({ content: '❌ Lỗi khi đọc db.json', ephemeral: true });
      }

      let db;
      try {
        db = JSON.parse(raw);
      } catch (e) {
        console.error('[bangxephang] Parse db.json error:', e);
        return await interaction.editReply({ content: '❌ db.json không phải JSON hợp lệ', ephemeral: true });
      }

      const usersObj = db.users || {};
      const entries = Object.entries(usersObj).map(([id, data]) => ({
        id: String(id),
        balance: Number((data && data.balance) || 0)
      }));

      if (entries.length === 0) {
        return await interaction.editReply({ content: '<a:AbbyShocked:1393909368138895411> Không có dữ liệu người chơi!', ephemeral: true });
      }

      const sorted = entries.sort((a, b) => b.balance - a.balance).slice(0, 10);

      const medals = [
        '<:gold_medal:1260462410385960960>',
        '<:silver_medal:1260462432822151240>',
        '<:bronze_medal:1260462412801458266>'
      ];

      const lines = [];
      const debug = [];

      // Fetch từng user (tối đa 10) — không throw nếu fail
      for (let i = 0; i < sorted.length; i++) {
        const u = sorted[i];
        const rankIcon = medals[i] || `**${i + 1}.**`;
        let fetched = null;
        let display = null;

        try {
          fetched = await interaction.client.users.fetch(u.id);
        } catch (e) {
          // fetch thất bại (user không tồn tại / invalid id / rate limit) -> tiếp tục
          fetched = null;
        }

        if (fetched) {
          // ưu tiên globalName (nếu người dùng bật), sau đó tag (username#discrim), sau đó username
          display = fetched.globalName || fetched.tag || fetched.username || `<@${u.id}> (ID: ${u.id})`;
        } else {
          // KHÔNG dùng "Người dùng không xác định" nữa — hiển thị mention kèm id cho dễ debug
          display = `<@${u.id}> (ID: ${u.id})`;
        }

        debug.push({ pos: i + 1, id: u.id, fetched: !!fetched, display });
        lines.push(`${rankIcon} ${display} — **${u.balance.toLocaleString()}** <a:diamondgem:1402590496647413811>`);
      }

      // In debug ra console để bạn kiểm tra (nếu cần)
      console.info('[bangxephang] Top debug:', JSON.stringify(debug, null, 2));

      let description = lines.join('\n');
      if (description.length > 4096) description = description.slice(0, 4093) + '...';

      const embed = new EmbedBuilder()
        .setTitle('**<a:leaf_left:1408895436374413312> Bảng Xếp Hạng Tài Sản <a:leaf_right:1408895433555578880>**')
        .setDescription(description)
        .setColor('#FFD700')
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[bangxephang] Unexpected error:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: '<a:AbbyShocked:1393909368138895411> Lỗi khi hiển thị bảng xếp hạng!', ephemeral: true });
      } else {
        await interaction.reply({ content: '<a:AbbyShocked:1393909368138895411> Lỗi khi hiển thị bảng xếp hạng!', ephemeral: true });
      }
    }
  }
};
