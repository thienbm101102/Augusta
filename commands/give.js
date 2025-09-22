const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBalance, getBalance, getUser } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Tặng tiền cho người khác')
    .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền muốn tặng').setRequired(true)),
  
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    // Kiểm tra xem người dùng có cố gắng tự tặng tiền không
    if (interaction.user.id === target.id) {
        return interaction.reply({ content: 'Bạn không thể tự tặng tiền cho chính mình!', ephemeral: true });
    }

    // Kiểm tra số tiền hợp lệ
    if (amount <= 0) {
        return interaction.reply({ content: '<a:AbbyShocked:1393909368138895411> Số tiền không hợp lệ!', ephemeral: true });
    }

    // Lấy thông tin người gửi và người nhận từ MongoDB
    const senderUser = await getUser(interaction.user.id);
    const receiverUser = await getUser(target.id);

    // Kiểm tra số dư người gửi
    if (senderUser.balance < amount) {
        return interaction.reply({ content: `<a:AbbyShocked:1393909368138895411> Bạn không đủ tiền để thực hiện giao dịch này! Bạn chỉ có **${senderUser.balance.toLocaleString()}**<a:diamondgem:1402590496647413811>.`, ephemeral: true });
    }

    // Trừ tiền người gửi và cộng tiền người nhận
    await addBalance(interaction.user.id, -amount);
    await addBalance(target.id, amount);

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('**<a:Verified:1406631971509243974> Giao Dịch Thành Công**')
      .setDescription(`**${interaction.user.tag}** đã tặng **${target.tag}** **${amount.toLocaleString()}**<a:diamondgem:1402590496647413811>`)
      .addFields(
        { name: 'Số dư mới của bạn', value: `\`${(senderUser.balance - amount).toLocaleString()}\`<a:diamondgem:1402590496647413811>`, inline: true },
        { name: 'Số dư mới của người nhận', value: `\`${(receiverUser.balance + amount).toLocaleString()}\`<a:diamondgem:1402590496647413811>`, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};
