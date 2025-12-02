const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const Config = require('../models/Config'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('Quản lý tính năng Bot đọc tin nhắn.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Thiết lập kênh văn bản bot sẽ đọc tin nhắn')
                .addChannelOption(option =>
                    option.setName('text_channel')
                        .setDescription('Kênh văn bản bot sẽ đọc tin nhắn')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const textChannel = interaction.options.getChannel('text_channel');

        try {
            await Config.findOneAndUpdate(
                { _id: 'config' },
                {
                    ttsTextChannel: textChannel.id,
                    // Giữ nguyên các trường khác (như confession)
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await interaction.editReply({
                content: `✅ Thiết lập TTS thành công! Bot sẽ đọc tin nhắn từ kênh ${textChannel} vào kênh thoại của người gửi.`,
            });
        } catch (error) {
            console.error("❌ Lỗi khi lưu cấu hình TTS vào MongoDB:", error);
            await interaction.editReply({
                content: `❌ Lỗi: Không thể lưu cấu hình TTS vào DB. Chi tiết lỗi: ${error.message}`,
            });
        }
    },
};