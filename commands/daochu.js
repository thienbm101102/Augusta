const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { addBalance } = require('../db');

// ==========================================
// 🎲 THƯ VIỆN & THUẬT TOÁN XÁO TRỘN TỪ (SHUFFLE ENGINE)
// ==========================================

/**
 * Thuật toán Fisher-Yates xáo trộn mảng ngẫu nhiên
 */
function fisherYatesShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Hàm xáo trộn chữ cái của từ/cụm từ
 * @param {string} text Từ gốc cần đảo
 * @returns {string} Chuỗi ký tự đã xáo trộn
 */
function scrambleText(text) {
    const cleanText = text.trim().toLowerCase();
    // Tách tất cả ký tự (bỏ khoảng trắng)
    const chars = cleanText.replace(/\s+/g, '').split('');
    
    // Xáo trộn cho đến khi khác từ gốc (nếu độ dài > 1)
    let scrambled = fisherYatesShuffle(chars);
    let attempts = 0;
    while (scrambled.join('') === chars.join('') && chars.length > 1 && attempts < 10) {
        scrambled = fisherYatesShuffle(chars);
        attempts++;
    }
    
    // Trả về dạng các chữ cái in hoa cách nhau bằng khoảng trắng
    return scrambled.join(' ').toUpperCase();
}

// ==========================================
// 📚 DANH SÁCH TỪ DỰ PHÒNG (NẾU KHÔNG CÓ FILE TỪ ĐIỂN)
// ==========================================
const DEFAULT_WORD_LIST = [
    { word: 'truyền thông', hint: 'Quá trình trao đổi, truyền tải thông tin' },
    { word: 'hoàng hôn', hint: 'Thời điểm mặt trời lặn cuối ngày' },
    { word: 'bình minh', hint: 'Thời điểm mặt trời bắt đầu mọc' },
    { word: 'lập trình', hint: 'Viết mã code tạo ra phần mềm' },
    { word: 'mặt trăng', hint: 'Vệ tinh tự nhiên duy nhất của Trái Đất' },
    { word: 'kim cương', hint: 'Loại khoáng vật cứng nhất và rất giá trị' },
    { word: 'phát triển', hint: 'Biến đổi theo hướng tiến bộ, mở rộng' },
    { word: 'vĩnh cửu', hint: 'Tồn tại mãi mãi không bao giờ kết thúc' },
    { word: 'hải đăng', hint: 'Ngọn đèn chiếu sáng cho tàu thuyền trên biển' },
    { word: 'thời gian', hint: 'Thứ trôi qua không bao giờ quay trở lại' },
    { word: 'vũ trụ', hint: 'Khu vực không gian bao la chứa các thiên hà' },
    { word: 'kỷ niệm', hint: 'Ký ức về những điều đã qua' },
    { word: 'anh hùng', hint: 'Người có công lao, chí khí phi thường' },
    { word: 'sáng tạo', hint: 'Tạo ra những giá trị mới mẻ, độc đáo' }
];

// Nạp thêm từ từ file tu_dien.txt nếu có
function getRandomWord() {
    try {
        const dictPath = path.join(__dirname, '../tu_dien.txt');
        if (fs.existsSync(dictPath)) {
            const data = fs.readFileSync(dictPath, 'utf8');
            const lines = data.split('\n')
                .map(l => l.trim().toLowerCase())
                .filter(l => l.length > 2);
            if (lines.length > 0) {
                const randomWord = lines[Math.floor(Math.random() * lines.length)];
                return { word: randomWord, hint: `Cụm từ gồm ${randomWord.split(' ').length} từ` };
            }
        }
    } catch (e) {
        // Sử dụng danh sách mặc định nếu lỗi đọc file
    }
    return DEFAULT_WORD_LIST[Math.floor(Math.random() * DEFAULT_WORD_LIST.length)];
}

const activeGames = new Map();
const REWARD_MONEY = 500; // Tiền thưởng khi đoán đúng

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daochu')
        .setDescription('Trò chơi Đảo Chữ đoán từ nhận tiền thưởng!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        const starterId = interaction.user.id;

        if (activeGames.has(channelId)) {
            return interaction.reply({ 
                content: '❌ Kênh này đang có một ván Đảo Chữ diễn ra rồi!', 
                ephemeral: true 
            });
        }

        const selectedObj = getRandomWord();
        const originalWord = selectedObj.word;
        const scrambled = scrambleText(originalWord);

        const embed = new EmbedBuilder()
            .setTitle('🔤 ĐẤU TRƯỜNG ĐẢO CHỮ')
            .setDescription(
                `Chủ phòng: <@${starterId}>\n\n` +
                `Các chữ cái đã bị xáo trộn:\n` +
                `# 🧩 \`${scrambled}\`\n\n` +
                `*💡 Gợi ý: ${selectedObj.hint}*\n` +
                `*💰 Thưởng: **+${REWARD_MONEY.toLocaleString()}** tiền cho người đoán nhanh nhất!*`
            )
            .setColor('#f39c12')
            .setThumbnail('https://image-5.uhdpaper.com/wallpaper/hatsune-miku-error-anime-girl-hd-wallpaper-uhdpaper.com-227@5@o.jpg')
            .setFooter({ text: 'Hãy gõ đáp án trực tiếp vào kênh! | Thời gian: 60 giây' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`stop_daochu_${starterId}`)
                .setLabel('🛑 Dừng Trò Chơi')
                .setStyle(ButtonStyle.Danger)
        );

        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = m => !m.author.bot;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
        const btnCollector = reply.createMessageComponentCollector({ time: 60000 });

        const gameState = {
            originalWord: originalWord.toLowerCase(),
            scrambled: scrambled,
            winner: null
        };
        activeGames.set(channelId, gameState);

        // Xử lý nút dừng game
        btnCollector.on('collect', async i => {
            if (!i.customId.startsWith('stop_daochu_')) return;
            if (i.user.id !== starterId) {
                return i.reply({ content: '❌ Chỉ chủ phòng mới có thể dừng game!', ephemeral: true });
            }
            await i.deferUpdate();
            collector.stop('force_stop');
            btnCollector.stop();
        });

        // Lắng nghe câu trả lời
        collector.on('collect', async m => {
            const answer = m.content.trim().toLowerCase();

            if (answer === gameState.originalWord) {
                gameState.winner = m.author;
                
                // Cộng tiền cho người chiến thắng
                try {
                    await addBalance(m.author.id, REWARD_MONEY);
                } catch (err) {
                    console.error("Lỗi cộng tiền đảo chữ:", err);
                }

                await m.react('🎉').catch(() => {});
                collector.stop('guessed');
            }
        });

        // Kết thúc trò chơi
        collector.on('end', async (collected, reason) => {
            activeGames.delete(channelId);

            let endTitle = '⌛ HẾT GIỜ!';
            let endDescription = `Không ai đoán đúng đáp án lần này.\n\n🔑 Đáp án chính xác là: **${originalWord.toUpperCase()}**`;
            let endColor = '#e74c3c';

            if (reason === 'guessed' && gameState.winner) {
                endTitle = '🎉 ĐÃ CÓ NGƯỜI ĐOÁN ĐÚNG!';
                endDescription = `Chúc mừng <@${gameState.winner.id}> đã đoán chính xác từ **${originalWord.toUpperCase()}**!\n\n💰 Phần thưởng: **+${REWARD_MONEY.toLocaleString()}** tiền đã được cộng vào tài khoản.`;
                endColor = '#2ecc71';
            } else if (reason === 'force_stop') {
                endTitle = '🛑 TRÒ CHƠI ĐÃ BỊ HỦY';
                endDescription = `Chủ phòng đã dừng trò chơi.\n🔑 Đáp án đúng là: **${originalWord.toUpperCase()}**`;
                endColor = '#95a5a6';
            }

            const endEmbed = new EmbedBuilder()
                .setTitle(endTitle)
                .setDescription(endDescription)
                .setColor(endColor);

            reply.edit({ components: [] }).catch(() => {});
            interaction.channel.send({ embeds: [endEmbed] }).catch(() => {});
        });
    }
};