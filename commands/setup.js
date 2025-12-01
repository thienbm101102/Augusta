const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const Config = require('../models/Config'); // 📌 Import Config Model
const mongoose = require('mongoose'); // Cần mongoose để đảm bảo chạy
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Thiết lập kênh confession')
    // Đảm bảo chỉ Quản trị viên mới dùng được
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Thiết lập kênh duyệt và kênh công khai')
        .addChannelOption(option =>
          option.setName('duyet')
            .setDescription('Kênh để duyệt confession')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(option =>
          option.setName('cong_khai')
            .setDescription('Kênh sẽ đăng confession sau khi duyệt')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    // 📌 Dùng deferReply ngay lập tức để tránh lỗi Unknown Interaction
    await interaction.deferReply({ ephemeral: true }); 

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return await interaction.editReply({ 
            content: '❌ Bạn cần có quyền **Quản Trị Viên (Administrator)** để thiết lập lệnh này.', 
        });
    }

    const duyet = interaction.options.getChannel('duyet');
    const congKhai = interaction.options.getChannel('cong_khai');

    try {
        // Lưu cấu hình vào MongoDB: Tìm tài liệu có _id='config', nếu không có thì tạo mới (upsert: true)
        await Config.findOneAndUpdate(
            { _id: 'config' },
            {
                reviewChannel: duyet.id,
                publicChannel: congKhai.id
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        await interaction.editReply({ 
            content: `✅ Đã thiết lập thành công! Cấu hình kênh đã được **lưu vào MongoDB**.\n- Kênh Duyệt: ${duyet}\n- Kênh Công Khai: ${congKhai}`, 
        });
    } catch (error) {
        console.error("❌ Lỗi khi lưu cấu hình vào MongoDB:", error);
        await interaction.editReply({
            content: `❌ Lỗi: Không thể lưu cấu hình vào DB. Chi tiết lỗi: ${error.message}`,
        });
    }
  }
};
