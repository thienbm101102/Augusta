const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, addBalance, getBalance } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Tặng tiền cho người khác')
    .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền muốn tặng').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    const senderBalance = await getBalance(interaction.user.id);

    if (amount <= 0 || senderBalance < amount) {
      return interaction.reply({ content: '<a:AbbyShocked:1393909368138895411> Số <a:diamondgem:1402590496647413811> không hợp lệ!', ephemeral: true });
    }

    await addBalance(interaction.user.id, -amount);
    await addBalance(target.id, amount);

    const senderMember = await interaction.guild.members.fetch(interaction.user.id);
    const receiverMember = await interaction.guild.members.fetch(target.id);

    const newSenderBalance = await getBalance(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**<a:Verified:1406631971509243974> Giao Dịch Thành Công**')
      .setDescription(`<a:PenguRich:1402589007683407943> **|** **${senderMember.displayName}** đã tặng **${amount.toLocaleString()}**<a:diamondgem:1402590496647413811> cho **${receiverMember.displayName}**!`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }
};
