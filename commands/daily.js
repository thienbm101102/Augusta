const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, setBalance, setLastDaily, addBalance } = require('../db');

module.exports = {
  data: new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận tiền hằng ngày (24h cooldown)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const user = await getUser(userId);
    const now = Date.now();
    const lastDaily = user.lastDaily;

    if (now - lastDaily < 24 * 60 * 60 * 1000) {
      const remaining = lastDaily + (24 * 60 * 60 * 1000) - now;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:AbbyHappy:1393909327848538122> **|** Bạn đã điểm danh hôm nay rồi! Thử lại sau **${hours}h ${minutes}m** nhé`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }

    await addBalance(userId, 10000);
    await setLastDaily(userId, now);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:Verified:1406631971509243974> **|** Bạn đã điểm danh thành công và nhận được **10,000**<a:diamondgem:1402590496647413811>!`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }
};
