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
                .setTitle('❌ Lỗi Cấu hình')
                .setDescription('Không tìm thấy khóa API Gemini (GEMINI_API_KEY). Vui lòng thiết lập khóa API để Trợ Lý Ảo hoạt động.');
            
            return interaction.editReply({ embeds: [errorEmbed] });
        }


        try {
            const userQuestion = interaction.options.getString('question');

            // 2. Lấy ngày hiện tại theo giờ Việt Nam
            // Lệnh này đảm bảo bot luôn biết ngày/giờ chính xác theo múi giờ bạn muốn.
            const vnTime = dayjs().tz('Asia/Ho_Chi_Minh').format('dddd, D [tháng] M [năm] YYYY');
            
            // 3. Xây dựng Full Prompt bằng cách chèn ngữ cảnh thời gian
            const dateContext = `Dựa trên thông tin thời gian thực: Hiện tại là ${vnTime} theo múi giờ Việt Nam (UTC+7).`;
            const fullPrompt = `${dateContext}\n\nCâu hỏi của người dùng là: ${userQuestion}`;


            // 4. GỌI API GEMINI VỚI CÚ PHÁP ĐÚNG
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                config: {
                    // Đặt nhiệt độ thấp để tăng độ chính xác của câu trả lời
                    temperature: 0.2
                },
                // SỬA LỖI CÚ PHÁP: Cấu trúc contents phải là array of objects
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            });

            const replyText = response.text;
            
            // Tạo Embed và phản hồi
            const answerEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`**<a:Verified:1406631971509243974> Trợ Lý Ảo Qiuyuan From 「 ✦ Áp Lực Chơi Game ✦ 」**`)
                .setDescription(`**<a:AbbyFlower:1393909312761364541> Câu hỏi:** ${userQuestion}\n---------------------\n**<a:AbbyHappy:1393909327848538122> Phản hồi:**\n${replyText}`)
                .setFooter({ text: 'Phản hồi được tạo bởi Qiuyuan, có thể đúng hoặc sai nên hãy kiểm tra lại nhé !!!' });

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


