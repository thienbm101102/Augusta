const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');

// --- CÀI ĐẶT DAYJS VÀ MÚI GIỜ ---
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
// --- KẾT THÚC CÀI ĐẶT DAYJS ---


// --- KHỞI TẠO GOOGLE GENAI ---
// Đảm bảo GEMINI_API_KEY đã được thiết lập trong biến môi trường Render
const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});
// --- KẾT THÚC KHỞI TẠO ---

// --- LỜI NHẮC HỆ THỐNG TỐI ƯU ĐỘ CHÍNH XÁC ---
const systemInstruction = "Bạn là trợ lý AI thông minh và chính xác. Luôn trả lời bằng tiếng Việt. Câu trả lời của bạn phải ngắn gọn, chỉ tập trung vào thông tin được hỏi, và tránh cung cấp thông tin mơ hồ hoặc không liên quan. Nếu bạn không chắc chắn về thông tin, hãy sử dụng tính năng tra cứu thông tin (Google Search).";
// --- KẾT THÚC LỜI NHẮC ---


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask') // Hoặc /assistant, tùy thuộc bạn muốn gọi lệnh là gì
        .setDescription('Hỏi trợ lý AI bất kỳ câu hỏi nào.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Nội dung câu hỏi của bạn')
                .setRequired(true)),

    async execute(interaction) {
        // Trả lời ngay lập tức để tránh lỗi timeout
        await interaction.deferReply();

        // 1. Kiểm tra Khóa API
        if (!process.env.GEMINI_API_KEY) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitllời:**\n${replyText}`)
                .setFooter({ text: '<a:AbbyFlower:1393909312761364541> Phản hồi được tạo bởi Qiuyuan, có thể đúng hoặc sai nên hãy kiểm tra lại nhé !!!' });

            await interaction.editReply({ embeds: [answerEmbed] });

        } catch (error) {
            console.error("Lỗi khi gọi API Gemini:", error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Lỗi Xử lý API')
                .setDescription('Trợ Lý Ảo đang gặp lỗi nội bộ khi xử lý câu hỏi của bạn. Vui lòng kiểm tra log hoặc thử lại sau.');
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
}; // <-- Dấu đóng cuối cùng đảm bảo không bị lỗi SyntaxError





