const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path'); // 📌 Cần thêm path để xử lý đường dẫn

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
        )
        .addChannelOption(option =>
          option.setName('cong_khai')
            .setDescription('Kênh sẽ đăng confession sau khi duyệt')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    // 1. Kiểm tra quyền Quản Trị Viên
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ Bạn cần có quyền **Quản Trị Viên (Administrator)** để thiết lập lệnh này.', 
            ephemeral: true 
        });
    }

    // 2. Lấy tùy chọn
    const duyet = interaction.options.getChannel('duyet');
    const congKhai = interaction.options.getChannel('cong_khai');

    const config = {
      reviewChannel: duyet.id,
      publicChannel: congKhai.id
    };
    
    // 📌 Xử lý đường dẫn file cấu hình an toàn hơn
    // __dirname là thư mục hiện tại (/commands), '..' là quay lại thư mục gốc
    const configPath = path.join(__dirname, '..', 'config.json');

    try {
        // 3. Ghi file và bắt lỗi
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        await interaction.reply({ 
            content: `✅ Đã thiết lập thành công! Cấu hình đã được lưu vào file \`config.json\`.\n- Kênh Duyệt: ${duyet}\n- Kênh Công Khai: ${congKhai}`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error("❌ Lỗi khi ghi file config.json:", error);
        await interaction.reply({
            content: `❌ Lỗi: Không thể lưu cấu hình. Vui lòng kiểm tra quyền ghi của bot hoặc thư mục.\nChi tiết lỗi: ${error.message}`,
            ephemeral: true
        });
    }
  }
};
