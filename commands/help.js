const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hiển thị danh sách tất cả các lệnh của bot'),
    async execute(interaction) {
        const commands = interaction.client.commands;
        const commandList = commands.map(command => `\`/${command.data.name}\`: ${command.data.description}`).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('<a:Verified:1406631971509243974> **Danh Sách Lệnh của BOT**')
            .setDescription(`Dưới đây là tất cả các lệnh bạn có thể sử dụng. Nếu bạn muốn biết thêm chi tiết về một lệnh cụ thể, hãy nhập lệnh đó và xem các tùy chọn.\n\n${commandList}`)
            .setColor('#3498db')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
};

