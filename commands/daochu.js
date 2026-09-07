const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { addBalance } = require('../db');

// ==========================================
// 🎲 THƯ VIỆN & THUẬT TOÁN XÁO TRỘN TỪ
// ==========================================
function fisherYatesShuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function scrambleText(text) {
    const cleanText = text.trim().toLowerCase();
    const chars = cleanText.replace(/\s+/g, '').split('');
    
    let scrambled = fisherYatesShuffle(chars);
    let attempts = 0;
    while (scrambled.join('') === chars.join('') && chars.length > 1 && attempts < 10) {
        scrambled = fisherYatesShuffle(chars);
        attempts++;
    }
    return scrambled.join(' ').toUpperCase();
}

// ==========================================
// 📚 NẠP TỪ ĐIỂN (CHỈ LẤY CỤM 2 TỪ)
// ==========================================
const DEFAULT_WORD_LIST = [
    { word: 'truyền thông', hint: 'Quá trình trao đổi, truyền tải thông tin' },
    { word: 'hoàng hôn', hint: 'Thời điểm mặt trời lặn cuối ngày' },
    { word: 'lập trình', hint: 'Viết mã code tạo ra phần mềm' },
    { word: 'kim cương', hint: 'Loại khoáng vật cứng nhất và rất giá trị' },
    { word: 'phát triển', hint: 'Biến đổi theo hướng tiến bộ, mở rộng' }
];

function getRandomWord() {
    try {
        const dictPath = path.join(__dirname, '../tu_dien.txt');
        if (fs.existsSync(dictPath)) {
            const data = fs.readFileSync(dictPath, 'utf8');
            const lines = data.split('\n')
                .map(l => l.trim().toLowerCase())
                // Lọc cực gắt: Chỉ lấy những dòng cắt ra đúng 2 chữ
                .filter(l => l.split(/\s+/).length === 2); 
                
            if (lines.length > 0) {
                const randomWord = lines[Math.floor(Math.random() * lines.length)];
                return { word: randomWord, hint: `Cụm từ gồm 2 từ` };
            }
        }
    } catch (e) {}
    return DEFAULT_WORD_LIST[Math.floor(Math.random() * DEFAULT_WORD_LIST.length)];
}

const activeGames = new Map();
const REWARD_MONEY = 500;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daochu')
        .setDescription('Chơi Đảo Chữ liên hoàn (Chế độ 2 từ), game chỉ dừng khi không ai đoán được!'),

    async execute(interaction) {
        const channelId = interaction.channelId;
        const starterId = interaction.user.id;

        if (activeGames.has(channelId)) {
            return interaction.reply({ 
                content: '❌ Kênh này đang có một ván Đảo Chữ diễn ra rồi!', 
                ephemeral: true 
            });
        }

        let currentObj = getRandomWord();
        let gameState = {
            originalWord: currentObj.word.toLowerCase(),
            scrambled: scrambleText(currentObj.word),
            round: 1
        };
        activeGames.set(channelId, gameState);

        const embed = new EmbedBuilder()
            .setTitle(`🔤 ĐẤU TRƯỜNG ĐẢO CHỮ - VÒNG ${gameState.round}`)
            .setDescription(
                `Chủ phòng: <@${starterId}>\n\n` +
                `Các chữ cái đã bị xáo trộn:\n` +
                `# 🧩 \`${gameState.scrambled}\`\n\n` +
                `*💡 Gợi ý: ${currentObj.hint}*\n` +
                `*💰 Thưởng: **+${REWARD_MONEY.toLocaleString()}** tiền cho người đoán nhanh nhất!*`
            )
            .setColor('#f39c12')
            .setFooter({ text: 'Gõ đáp án vào kênh để trả lời | Trò chơi sẽ dừng nếu sau 60s không ai đoán được' });

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
                // 1. Cộng tiền
                try {
                    await addBalance(m.author.id, REWARD_MONEY);
                } catch (err) {
                    console.error("Lỗi cộng tiền đảo chữ:", err);
                }
                await m.react('🎉').catch(() => {});

                // 2. Thông báo người chiến thắng
                const winEmbed = new EmbedBuilder()
                    .setDescription(`🎉 Chúc mừng <@${m.author.id}> đã đoán đúng từ **${gameState.originalWord.toUpperCase()}** và nhận **+${REWARD_MONEY.toLocaleString()}** tiền!`)
                    .setColor('#2ecc71');
                await interaction.channel.send({ embeds: [winEmbed] }).catch(() => {});

                // 3. Chuẩn bị vòng tiếp theo (bốc từ mới)
                gameState.round += 1;
                currentObj = getRandomWord();
                gameState.originalWord = currentObj.word.toLowerCase();
                gameState.scrambled = scrambleText(currentObj.word);

                // 4. Gửi từ mới
                const nextEmbed = new EmbedBuilder()
                    .setTitle(`ĐẢO CHỮ - VÒNG ${gameState.round}`)
                    .setDescription(
                        `Các chữ cái đã bị xáo trộn:\n` +
                        `# 🧩 \`${gameState.scrambled}\`\n\n` +
                        `*💡 Gợi ý: ${currentObj.hint}*\n` +
                        `*💰 Thưởng: **+${REWARD_MONEY.toLocaleString()}** tiền!*`
                    )
                    .setColor('#3498db')
                    .setFooter({ text: 'Thời gian đã được làm mới lại 60 giây!' });

                await interaction.channel.send({ embeds: [nextEmbed] }).catch(() => {});

                // 5. Làm mới lại bộ đếm thời gian
                collector.resetTimer();
                btnCollector.resetTimer();
            }
        });

        // Kết thúc trò chơi
        collector.on('end', async (collected, reason) => {
            activeGames.delete(channelId);

            let endTitle = '⌛ HẾT GIỜ! TRÒ CHƠI KẾT THÚC';
            let endDescription = `Thời gian đã trôi qua mà không ai đoán được từ này.\n\n🔑 Đáp án chính xác là: **${gameState.originalWord.toUpperCase()}**\n\n📊 Kỷ lục ván này: Chơi đến **Vòng ${gameState.round}**`;
            let endColor = '#e74c3c';

            if (reason === 'force_stop') {
                endTitle = '🛑 TRÒ CHƠI ĐÃ BỊ HỦY';
                endDescription = `Chủ phòng đã dừng trò chơi.\n🔑 Đáp án đúng của vòng ${gameState.round} là: **${gameState.originalWord.toUpperCase()}**`;
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
