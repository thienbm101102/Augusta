const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Xóa một số lượng tin nhắn nhất định khỏi kênh')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số lượng tin nhắn cần xóa (tối đa 100)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Chỉ xóa tin nhắn của người dùng này')),

    async execute(interaction) {
        // Kiểm tra quyền của người dùng
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({
                content: '❌ Bạn không có quyền để sử dụng lệnh này!',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');

        // Kiểm tra giá trị hợp lệ
        if (amount <= 0 || amount > 100) {
            return interaction.reply({
                content: '❌ Số lượng tin nhắn phải từ 1 đến 100.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // Lấy tin nhắn
        let fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });

        if (targetUser) {
            // Lọc tin nhắn của người dùng cụ thể
            fetchedMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
            if (fetchedMessages.size === 0) {
                return interaction.editReply({ content: 'Không tìm thấy tin nhắn nào của người dùng này trong giới hạn đã chọn.' });
            }
        }

        try {
            await interaction.channel.bulkDelete(fetchedMessages, true);
            const userReply = targetUser ? ` của **${targetUser.username}**` : '';
            await interaction.editReply({
                content: `✅ Đã xóa thành công **${fetchedMessages.size}** tin nhắn${userReply}.`
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply({
                content: '❌ Có lỗi xảy ra khi xóa tin nhắn. Vui lòng thử lại sau.'
            });
        }
    },
};