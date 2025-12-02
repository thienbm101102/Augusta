// commands/confess.js

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle // Cần thêm để dùng Button
} = require('discord.js');
// 📌 Đảm bảo đường dẫn này đúng:
const Config = require('../models/Config'); 

// SỬA: Dùng module.exports thay vì module.default
module.exports = { 
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Gửi một lời thú tội/tâm sự ẩn danh (Tối đa 256 ký tự)')
    .addStringOption(option =>
      option.setName('nội_dung')
        .setDescription('Nhập nội dung bạn muốn gửi')
        .setRequired(true)
        .setMaxLength(256) // Thêm giới hạn ký tự cho slash command
    ),
    
  async execute(interaction, client) {
    // Bắt đầu chờ phản hồi ngay để tránh lỗi timeout
    await interaction.deferReply({ ephemeral: true }); 

    const content = interaction.options.getString('nội_dung');
    
    // 📌 DÙNG MONGODB ĐỂ ĐỌC CONFIG
    const config = await Config.findById('config'); 
    
    if (!config || !config.reviewChannel) {
        return await interaction.editReply({ 
            content: '⚠️ Chưa thiết lập kênh duyệt (chạy /confession setup).', 
            ephemeral: true 
        });
    }

    const reviewChannel = await client.channels.fetch(config.reviewChannel).catch(() => null);
    if (!reviewChannel) {
        return await interaction.editReply({ 
            content: '⚠️ Không tìm thấy kênh duyệt. Vui lòng kiểm tra lại cấu hình.', 
            ephemeral: true 
        });
    }

    // Tạo Embed
    const embed = new EmbedBuilder()
      .setTitle('📝 Confession chờ duyệt')
      .setDescription(content)
      .setColor('Yellow')
      .setFooter({ text: `Gửi bởi: ${interaction.user.tag}` })
      .setTimestamp();

    // Tạo nút Duyệt/Từ chối
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('✅ Duyệt')
          .setStyle(ButtonStyle.Success)
          .setCustomId(`accept_temp`), // Dùng ID tạm
        new ButtonBuilder()
          .setLabel('❌ Từ chối')
          .setStyle(ButtonStyle.Danger)
          .setCustomId(`reject_temp`),
      );
    
    // Gửi tin nhắn và lấy ID
    const sent = await reviewChannel.send({ embeds: [embed], components: [row] });
    
    // Cập nhật Custom ID của nút với Message ID thật
    const finalRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('✅ Duyệt')
                .setStyle(ButtonStyle.Success)
                .setCustomId(`accept_${sent.id}`), 
            new ButtonBuilder()
                .setLabel('❌ Từ chối')
                .setStyle(ButtonStyle.Danger)
                .setCustomId(`reject_${sent.id}`),
        );
    
    await sent.edit({ components: [finalRow] });

    await interaction.editReply({ 
        content: '📬 Confession của bạn đã được gửi để chờ duyệt!', 
        ephemeral: true 
    });
  },
  
  // Xóa hàm handleButtons, vì logic nút Confession đã được xử lý trong index.js
};
