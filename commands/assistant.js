// commands/assistant.js

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// Thêm thư viện GoogleGenAI
const { GoogleGenAI } = require('@google/genai');

// Khởi tạo client AI
// CHÚ Ý: Đảm bảo bạn đã đặt biến môi trường process.env.GEMINI_API_KEY
// Bot sẽ sử dụng khóa API từ biến môi trường này.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ----------------------------------------------------------------
// HÀM GỌI API GEMINI THỰC TẾ
// ----------------------------------------------------------------
/**
 * Gọi API Gemini để lấy câu trả lời chi tiết.
 * @param {string} prompt Câu hỏi của người dùng.
 * @returns {Promise<string>} Câu trả lời từ AI.
 */
async function getAIResponse(prompt) {
    if (!process.env.GEMINI_API_KEY) {
        return "❌ Lỗi cấu hình: Không tìm thấy khóa API Gemini (GEMINI_API_KEY). Vui lòng thiết lập khóa API để Trợ Lý Ảo hoạt động.";
    }

    // Sử dụng mô hình gemini-2.5-flash cho phản hồi nhanh và hiệu quả
    const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
        // Đặt nhiệt độ thấp để tăng độ chính xác, giảm sự sáng tạo
        temperature: 0.2
    },
    // SỬA: Chỉ định contents một lần duy nhất với cấu trúc đối tượng
    // Chúng ta sử dụng fullPrompt (đã chứa ngữ cảnh ngày/giờ)
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }], 
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hỏi Trợ Lý Ảo bất cứ điều gì bạn muốn!')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('Nội dung câu hỏi của bạn dành cho Trợ Lý Ảo.')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const prompt = interaction.options.getString('prompt');
        
        // Hoãn trả lời vì gọi API AI mất thời gian
        await interaction.deferReply(); 

        try {
            const aiResponse = await getAIResponse(prompt);

            const embed = new EmbedBuilder()
                .setTitle(`<a:Verified:1406631971509243974> **Trợ Lý Qiuyuan From「 ✦ Áp Lực Chơi Game ✦ 」**`)
                .setDescription(`**<a:AbbyGive:1393909321263222856> Câu hỏi của bạn:** *${prompt}*\n------------\n**<a:AbbyHappy:1393909327848538122> Phản hồi:**\n${aiResponse}`)
                .setColor('#FF5733') 
                .setFooter({ text: `Hỏi bởi ${interaction.member.displayName}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // Ghi lỗi chi tiết ra console để dễ dàng debug
            console.error("Lỗi khi gọi API AI (Gemini):", error);
            await interaction.editReply({ 
                content: '❌ Rất tiếc, đã xảy ra lỗi khi cố gắng kết nối với dịch vụ AI. Vui lòng kiểm tra console log để xem chi tiết lỗi.', 
                ephemeral: true 
            });
        }
    },
};





