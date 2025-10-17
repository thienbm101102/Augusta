const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

// Khởi tạo client AI (Sử dụng khóa API đã có)
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('image')
        .setDescription('Tạo hình ảnh từ văn bản bằng mô hình Gemini (Imagen).')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Mô tả chi tiết về hình ảnh bạn muốn tạo (bằng tiếng Anh).')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        if (!process.env.GEMINI_API_KEY) {
            return interaction.editReply('❌ Lỗi: Không tìm thấy GEMINI_API_KEY.');
        }

        try {
            const prompt = interaction.options.getString('prompt');
            
            // --- GỌI API TẠO HÌNH ẢNH ---
            const response = await ai.models.generateImages({
                model: 'imagen-3.0-generate-002', // Mô hình tạo ảnh
                prompt: prompt,
                config: {
                    numberOfImages: 1, // Tạo 1 hình ảnh
                    outputMimeType: 'image/png', // Định dạng hình ảnh
                    aspectRatio: '1:1', // Tỷ lệ khung hình (1:1, 16:9, 4:3, ...)
                },
            });

            // Lấy dữ liệu hình ảnh (base64)
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            
            // Chuyển đổi Base64 thành Buffer
            const imageBuffer = Buffer.from(base64ImageBytes, 'base64');
            
            // Tạo AttachmentBuilder
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'generated-image.png' });

            // Tạo Embed thông báo
            const embed = new EmbedBuilder()
                .setTitle('✨ Hình Ảnh Được Tạo')
                .setDescription(`**Prompt:** ${prompt}`)
                .setImage('attachment://generated-image.png') // Tham chiếu đến attachment
                .setColor(0x00FF00)
                .setFooter({ text: `Tạo bởi ${interaction.user.tag}` });
            
            // Gửi hình ảnh và embed
            await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

        } catch (error) {
            console.error("Lỗi khi tạo hình ảnh:", error);
            await interaction.editReply('❌ Đã xảy ra lỗi khi tạo hình ảnh. Vui lòng kiểm tra prompt hoặc log lỗi.');
        }
    },
};