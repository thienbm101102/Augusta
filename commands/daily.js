const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../db');

module.exports = {
  data: new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận tiền hằng ngày (24h cooldown)'),
  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const now = Date.now();
    if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
      const remaining = 24 * 60 * 60 * 1000 - (now - user.lastDaily);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:AbbyHappy:1393909327848538122> **|** Bạn đã điểm danh hôm nay rồi! Thử lại sau **${hours}h ${minutes}m** nhé`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
    user.balance += 10000;
    user.lastDaily = now;
    saveDB();
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:AbbyCheers:1393909248076943380> **|** Chúc mừng, bạn đã nhận **10000<a:diamondgem:1402590496647413811>**! Ngày mai tiếp tục quay lại nhé`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
