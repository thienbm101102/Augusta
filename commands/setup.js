// commands/setup.js

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
// 📌 Đảm bảo đường dẫn này đúng:
const Config = require('../models/Config'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Thiết lập kênh confession')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Thiết lập kênh duyệt và kênh công khai')
        .addChannelOption(option =>
          option.setName('duyet')
            .setDescription('Kênh để duyệt confession')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        ) // <-- Dấu đóng ngoặc của addChannelOption
        .addChannelOption(option =>
          option.setName('cong_khai')
            .setDescription('Kênh sẽ đăng confession sau khi duyệt')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        ) // <-- Dấu đóng ngoặc của addChannelOption (Dòng này có thể là dòng 16 gây lỗi)
    ), // <-- Dấu đóng ngoặc của addSubcommand
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }); 

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) { 
        return await interaction.editReply({ 
            content: '❌ Bạn cần có quyền **Quản Trị Viên (Administrator)** để thiết lập lệnh này.', 
        });
    }

    const duyet = interaction.options.getChannel('duyet');
    const congKhai = interaction.options.getChannel('cong_khai');

    try {
        // LƯU VÀO MONGODB
        await Config.findOneAndUpdate(
            { _id: 'config' },
            {
                reviewChannel: duyet.id,
                publicChannel: congKhai.id
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        
        await interaction.editReply({ 
            content: `✅ Đã thiết lập thành công! Cấu hình Confession đã được **lưu vào MongoDB**.\n- Kênh Duyệt: ${duyet}\n- Kênh Công Khai: ${congKhai}`, 
        });
    } catch (error) {
        console.error("❌ Lỗi khi lưu cấu hình Confession vào MongoDB:", error);
        await interaction.editReply({
            content: `❌ Lỗi: Không thể lưu cấu hình vào DB. Chi tiết lỗi: ${error.message}`,
        });
    }
  }
};
