const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveDB } = require('../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sinhnhat')
        .setDescription('Thêm ngày sinh nhật của bạn ^^')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Đặt ngày sinh nhật của bạn để BOT và mọi người có thể chúc mừng')
                .addIntegerOption(option =>
                    option.setName('thang')
                        .setDescription('Tháng sinh nhật của bạn (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option.setName('ngay')
                        .setDescription('Ngày sinh nhật của bạn (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                .setDescription('Xem ngày sinh nhật của bạn hoặc của người khác')
                .addUserOption(option =>
                    option.setName('nguoidung')
                        .setDescription('Người dùng bạn muốn xem sinh nhật')
                        .setRequired(false)
                )
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        const user = getUser(userId);

        if (subcommand === 'set') {
            const month = interaction.options.getInteger('thang');
            const day = interaction.options.getInteger('ngay');

            if (month === 2 && day > 29) {
                return interaction.reply({ content: 'Ngày sinh nhật không hợp lệ cho tháng 2.', ephemeral: true });
            }
            if ([4, 6, 9, 11].includes(month) && day > 30) {
                return interaction.reply({ content: 'Ngày sinh nhật không hợp lệ cho tháng này.', ephemeral: true });
            }

            user.birthday = { month, day };
            saveDB();

            const embed = new EmbedBuilder()
                .setTitle('<a:Verified:1406631971509243974> **Cài Đặt Sinh Nhật Thành Công!**')
                .setDescription(`Ngày sinh nhật của bạn đã được đặt là **ngày ${day} tháng ${month}**.`)
                .setColor('#ff69b4');
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (subcommand === 'xem') {
            const targetUser = interaction.options.getUser('nguoidung') || interaction.user;
            const targetUserData = getUser(targetUser.id);
            
            if (!targetUserData.birthday) {
                return interaction.reply({ content: `${targetUser.username} chưa đặt ngày sinh nhật.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎂 Bạn Đang Xem Sinh Nhật Của **${interaction.member.displayName}**`)
                .setDescription(`Sinh nhật của **${interaction.member.displayName}** là ngày **${targetUserData.birthday.day}** tháng **${targetUserData.birthday.month}**.`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor('#00ffc0');

            await interaction.reply({ embeds: [embed] });
        }
    }
};