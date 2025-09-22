const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, addBalance, setLastDaily } = require('../db');

module.exports = {
  data: new SlashCommandBuilder().setName('diemdanh').setDescription('Nhận tiền hằng ngày (24h cooldown)'),
  async execute(interaction) {
    await interaction.deferReply();
    const user = await getUser(interaction.user.id);
    const now = Date.now();
    const dailyReward = 10000;

    if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
      const remaining = 24 * 60 * 60 * 1000 - (now - user.lastDaily);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('**Điểm Danh**')
        .setDescription(`<a:AbbyHappy:1393909327848538122> **|** Bạn đã điểm danh hôm nay rồi! Thử lại sau **${hours}h ${minutes}m** nữa nhé.`)
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    await addBalance(interaction.user.id, dailyReward);
    await setLastDaily(interaction.user.id, now);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**Điểm Danh**')
      .setDescription(`<a:Verified:1406631971509243974> **|** Bạn đã điểm danh thành công và nhận được **${dailyReward.toLocaleString()}**<a:diamondgem:1402590496647413811>!`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
