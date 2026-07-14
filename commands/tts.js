// commands/tts-setup.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
// 📌 Đảm bảo bạn đã có file models/Config.js
const Config = require('../models/Config'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Thiết lập kênh TTS (Text-to-Speech)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Chọn kênh mà bot sẽ đọc tin nhắn')
                .addChannelOption(option =>
                    option.setName('kênh_chat')
                        .setDescription('Kênh văn bản bot sẽ đọc tin nhắn')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); 

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) { 
            return await interaction.editReply({ 
                content: '❌ Bạn cần có quyền **Quản Trị Viên (Administrator)** để thiết lập lệnh này.', 
            });
        }

        const ttsChannel = interaction.options.getChannel('kênh_chat');

        try {
            // LƯU VÀO MONGODB (sẽ cập nhật nếu đã tồn tại)
            await Config.findOneAndUpdate(
                { _id: 'config' }, // Tìm tài liệu cấu hình chung
                { ttsTextChannel: ttsChannel.id }, // Cập nhật trường ttsTextChannel
                { upsert: true, new: true, setDefaultsOnInsert: true } // Tạo mới nếu chưa có
            );
            
            await interaction.editReply({ 
                content: `✅ Đã thiết lập thành công! Kênh TTS đã được đặt là ${ttsChannel}. Cấu hình đã được **lưu vào MongoDB**.\nBot sẽ đọc tin nhắn ở kênh này nếu người dùng đang trong kênh thoại.`, 
            });
        } catch (error) {
            console.error("❌ Lỗi khi lưu cấu hình TTS vào MongoDB:", error);
            await interaction.editReply({
                content: `❌ Lỗi: Không thể lưu cấu hình vào DB. Chi tiết lỗi: ${error.message}`,
            });
        }
    }
};
