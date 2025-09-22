// leaderboard.js (Canvas version)
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const Canvas = require('canvas'); // hoặc require('@napi-rs/canvas')
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

      const top = sortedUsers.slice(0, 10);
      const width = 900;
      const rowHeight = 70;
      const padding = 20;
      const headerHeight = 80;
      const height = headerHeight + top.length * rowHeight + padding;

      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, width, height);

      // Title
      ctx.fillStyle = '#FFD700';
      ctx.font = '28px Sans';
      ctx.fillText('Bảng Xếp Hạng Tài Sản', padding, 46);

      for (let i = 0; i < top.length; i++) {
        const u = top[i];
        const y = headerHeight + i * rowHeight;

        // Row background alternate
        if (i % 2 === 0) {
          ctx.fillStyle = '#0f1725';
          ctx.fillRect(0, y, width, rowHeight);
        }

        // Rank icon/text
        const rankText = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        ctx.font = '26px Sans';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(rankText, padding, y + 44);

        // Try fetch user & avatar
        let fetched = null;
        try {
          fetched = await interaction.client.users.fetch(u.id);
        } catch (e) {
          fetched = null;
        }

        const displayName = fetched ? (fetched.globalName || fetched.username) : 'Người dùng không xác định';
        const avatarURL = fetched ? fetched.displayAvatarURL({ extension: 'png', size: 128 }) : 'https://cdn.discordapp.com/embed/avatars/0.png';

        // Load avatar image
        let avatarImg;
        try {
          avatarImg = await Canvas.loadImage(avatarURL);
        } catch (e) {
          avatarImg = await Canvas.loadImage('https://cdn.discordapp.com/embed/avatars/0.png');
        }

        // Draw circular avatar
        const avSize = 52;
        const avX = padding + 60;
        const avY = y + 9;
        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
        ctx.restore();

        // Draw name & balance
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Sans';
        ctx.fillText(displayName, avX + avSize + 12, y + 36);

        const balanceText = u.balance.toLocaleString();
        ctx.font = '20px Sans';
        const textMetrics = ctx.measureText(balanceText);
        ctx.fillStyle = '#9ae6b4';
        ctx.fillText(balanceText, width - padding - textMetrics.width, y + 36);
      }

      // Export image buffer
      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setImage('attachment://leaderboard.png')
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: 'Đã xảy ra lỗi khi tạo bảng xếp hạng!', ephemeral: true });
    }
  },
};
