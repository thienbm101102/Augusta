const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Thiết lập kênh confession')
    // Chỉ người quản trị mới thấy và dùng được lệnh này
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
    // Kiểm tra quyền lần nữa trong hàm execute
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
            content: '❌ Bạn cần có quyền **Quản Trị Viên (Administrator)** để thiết lập lệnh này.', 
            ephemeral: true 
        });
    }

    const duyet = interaction.options.getChannel('duyet');
    const congKhai = interaction.options.getChannel('cong_khai');

    const config = {
      reviewChannel: duyet.id,
      publicChannel: congKhai.id
    };
    
    // Đảm bảo file config.json được lưu vào thư mục gốc của bot
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    
    await interaction.reply({ 
        content: `✅ Đã thiết lập thành công!\n- Kênh Duyệt: ${duyet}\n- Kênh Công Khai: ${congKhai}`, 
        ephemeral: true 
    });
  }
};
