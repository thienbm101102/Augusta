const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, setBalance, setLastDaily, addBalance } = require('../db');

module.exports = {
  data: new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận tiền hằng ngày (24h cooldown)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const user = await getUser(userId);
    const now = Date.now();
    const lastDaily = user.lastDaily ? user.lastDaily.getTime() : null;

    const cooldown = 24 * 60 * 60 * 1000;

    // Kiểm tra xem lastDaily có giá trị hợp lệ không
    if (lastDaily && now - lastDaily < cooldown) {
      const remaining = lastDaily + cooldown - now;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**<a:VerifiedTwitter:1418649004912148511> Điểm Danh Thất Bại**')
      .setDescription(`<a:AbbyHappy:1393909327848538122> **|** Bạn đã điểm danh hôm nay rồi! Thử lại sau **${hours}h ${minutes}m** nhé`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

    await addBalance(userId, 10000);
    await setLastDaily(userId, now);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**<a:VerifiedTwitter:1418649004912148511> Điểm Danh Thành Công**')
      .setDescription(`<a:AbbyPeek:1393909356625657876> **|** Bạn đã điểm danh thành công và nhận được **10,000**<a:diamondgem:1402590496647413811>!`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }
};
