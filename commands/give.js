const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Tặng tiền cho người khác')
    .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền muốn tặng').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    const sender = getUser(interaction.user.id);
    const receiver = getUser(target.id)

    const senderMember = await interaction.guild.members.fetch(interaction.user.id);
    const receiverMember = await interaction.guild.members.fetch(target.id);


    if (amount <= 0 || sender.balance === undefined || sender.balance < amount) {
      return interaction.reply('<a:AbbyShocked:1393909368138895411> Số <a:diamondgem:1402590496647413811> không hợp lệ!');
    }

    sender.balance -= amount;
    receiver.balance += amount;
    saveDB();

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**<a:Verified:1406631971509243974> Giao Dịch Thành Công**')
      .setDescription(`<a:PenguRich:1407778801936765050> **|** **${senderMember.displayName}** đã tặng **${amount}**<a:diamondgem:1402590496647413811> cho **${receiverMember.displayName}**`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
