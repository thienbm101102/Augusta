const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../db'); // Chỉ cần getUser

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
        // Lấy User ID của người dùng thực hiện lệnh (hoặc người dùng mục tiêu)
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        // Dùng await vì getUser là hàm async trong db.js
        const user = await getUser(userId); 

        if (subcommand === 'set') {
            const month = interaction.options.getInteger('thang');
            const day = interaction.options.getInteger('ngay');

            // ⚠️ Xử lý kiểm tra năm nhuận phức tạp hơn, nhưng kiểm tra cơ bản vẫn giữ nguyên
            if (month === 2 && day > 29) {
                return interaction.reply({ content: 'Ngày sinh nhật không hợp lệ cho tháng 2.', ephemeral: true });
            }
            if ([4, 6, 9, 11].includes(month) && day > 30) {
                return interaction.reply({ content: 'Ngày sinh nhật không hợp lệ cho tháng này.', ephemeral: true });
            }

            // Cập nhật và LƯU vào MongoDB
            user.birthday = { month, day };
            await user.save(); // ✅ Sửa lỗi: Thay thế saveDB() bằng user.save()

            const embed = new EmbedBuilder()
                .setTitle('**<a:Verified:1406631971509243974> Cài Đặt Sinh Nhật Thành Công!**')
                .setDescription(`Ngày sinh nhật của bạn đã được đặt là **ngày ${day} tháng ${month}**.`)
                .setColor('#ff69b4');
            
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } else if (subcommand === 'xem') {
            const targetUser = interaction.options.getUser('nguoidung') || interaction.user;
            // Lấy dữ liệu của người dùng mục tiêu
            const targetUserData = await getUser(targetUser.id);
            // Lấy đối tượng Guild Member của người dùng mục tiêu để lấy displayName
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const targetDisplayName = targetMember ? targetMember.displayName : targetUser.username;
            
            if (!targetUserData.birthday || !targetUserData.birthday.day) {
                return interaction.reply({ content: `**${targetUser.username}** chưa đặt ngày sinh nhật.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎂 Bạn Đang Xem Sinh Nhật Của **${targetDisplayName}**`)
                .setDescription(`Sinh nhật của **${targetDisplayName}** là ngày **${targetUserData.birthday.day}** tháng **${targetUserData.birthday.month}**.`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor('#00ffc0');

            await interaction.reply({ embeds: [embed] });
        }
    }
};
