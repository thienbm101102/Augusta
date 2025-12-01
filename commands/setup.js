// commands/setup.js

// 📌 RẤT QUAN TRỌNG: Phải require cả PermissionsBitField (hoặc dùng PermissionFlagsBits)
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const Config = require('../models/Config'); 
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Thiết lập kênh confession')
    // Đảm bảo chỉ Quản trị viên mới dùng được
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
    .addSubcommand(sub =>
      // ... (Các option) ...
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }); 

    // 📌 KIỂM TRA QUYỀN
    // Nếu bạn đang dùng PermissionsBitField trong index.js, hãy dùng PermissionsBitField.Flags.Administrator
    // Nếu không, hãy dùng PermissionFlagsBits.Administrator (đã được require ở trên)
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) { 
        return await interaction.editReply({ 
            content: '❌ Bạn cần có quyền **Quản Trị Viên (Administrator)** để thiết lập lệnh này.', 
        });
    }

    const duyet = interaction.options.getChannel('duyet');
    const congKhai = interaction.options.getChannel('cong_khai');

    try {
        // Lưu cấu hình vào MongoDB
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
