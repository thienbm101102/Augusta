// sinhnhat.js (Phiên bản đã sửa)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../db'); // Chỉ cần getUser

module.exports = {
    data: new SlashCommandBuilder()
        // ... (phần data giữ nguyên)
        .setName('sinhnhat')
        .setDescription('Thêm ngày sinh nhật của bạn ^^')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                // ... (options giữ nguyên)
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                // ... (options giữ nguyên)
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        // LỖI 1: Phải dùng await ở đây vì getUser là async
        const user = await getUser(userId); 

        if (subcommand === 'set') {
            const month = interaction.options.getInteger('thang');
            const day = interaction.options.getInteger('ngay');

            if (month === 2 && day > 29) {
                // Đã xử lý reply ở đây, OK
                return interaction.reply({ content: 'Ngày sinh nhật không hợp lệ cho tháng 2.', ephemeral: true });
            }
            if ([4, 6, 9, 11].includes(month) && day > 30) {
                 // Đã xử lý reply ở đây, OK
                return interaction.reply({ content: 'Ngày sinh nhật không hợp lệ cho tháng này.', ephemeral: true });
            }

            user.birthday = { month, day };
            // LỖI 2: Thay thế saveDB() bằng user.save()
            await user.save(); 

            const embed = new EmbedBuilder()
                .setTitle('<a:Verified:1406631971509243974> **Cài Đặt Sinh Nhật Thành Công!**')
                .setDescription(`Ngày sinh nhật của bạn đã được đặt là **ngày ${day} tháng ${month}**.`)
                .setColor('#ff69b4');
            
            // Đây là reply thành công, OK
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'xem') {
            const targetUser = interaction.options.getUser('nguoidung') || interaction.user;
            // LỖI 1: Phải dùng await ở đây vì getUser là async
            const targetUserData = await getUser(targetUser.id);
            
            // Lấy tên hiển thị chính xác của người dùng mục tiêu
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const targetDisplayName = targetMember ? targetMember.displayName : targetUser.username;
            
            // Kiểm tra field birthday đã tồn tại và có giá trị day
            if (!targetUserData.birthday || !targetUserData.birthday.day) {
                // Đã xử lý reply ở đây, OK
                return interaction.reply({ content: `**${targetUser.username}** chưa đặt ngày sinh nhật.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                // LỖI 3: Dùng targetDisplayName thay vì interaction.member.displayName
                .setTitle(`🎂 Bạn Đang Xem Sinh Nhật Của **${targetDisplayName}**`) 
                .setDescription(`Sinh nhật của **${targetDisplayName}** là ngày **${targetUserData.birthday.day}** tháng **${targetUserData.birthday.month}**.`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor('#00ffc0');

            await interaction.reply({ embeds: [embed] });
        }
    }
};
