const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, addBalance, getLastDaily, setLastDaily } = require('../db');

module.exports = {
  data: new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận tiền hằng ngày (24h cooldown)'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();
    const lastDaily = await getLastDaily(userId);

    // 24 hours in milliseconds
    const oneDay = 24 * 60 * 60 * 1000; 

    if (now - lastDaily < oneDay) {
      const remaining = oneDay - (now - lastDaily);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:AbbyHappy:1393909327848538122> **|** Bạn đã điểm danh hôm nay rồi! Thử lại sau **${hours}h ${minutes}m** nhé`)
      .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // Add balance and update last daily timestamp
    await addBalance(userId, 10000);
    await setLastDaily(userId, now);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:AbbyCheers:1393909248076943380> **|** Chúc mừng, bạn đã nhận **10000<a:diamondgem:1402590496647413811>**! Ngày mai tiếp tục quay lại nhé`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
