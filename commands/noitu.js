const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { addBalance, getBalance } = require('../db');

let validWords = new Set();
try {
    const dictPath = path.join(__dirname, '../tu_dien.txt');
    const data = fs.readFileSync(dictPath, 'utf8');
    const wordsArray = data.split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.split(' ').length === 2); 
    validWords = new Set(wordsArray);
} catch (error) {
    console.warn("⚠️ Không tìm thấy file tu_dien.txt. Game chạy không từ điển.");
}

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noitu')
        .setDescription('Chơi nối từ tiếng Việt'),
        
    async execute(interaction) {
        const channelId = interaction.channelId;
        const starterId = interaction.user.id;
        
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '❌ Kênh này đang có một ván nối từ diễn ra rồi!', ephemeral: true });
        }
        
        let startWord = 'hòa bình';
        if (validWords.size > 0) {
            const wordsArray = Array.from(validWords);
            startWord = wordsArray[Math.floor(Math.random() * wordsArray.length)];
        }
        const syllables = startWord.split(' ');
        const lastSyllable = syllables[1];
        
        const embed = new EmbedBuilder()
            .setTitle('🇻🇳 ĐẤU TRƯỜNG NỐI TỪ TIẾNG VIỆT')
            .setDescription(`Chủ phòng: <@${starterId}>\n\nTừ khởi đầu: 🟢 **${startWord.toUpperCase()}**\n\nNgười tiếp theo nối một từ 2 âm tiết bắt đầu bằng chữ:\n# 🎯 ${lastSyllable.toUpperCase()}\n\n*⚠️ Luật: Có nghĩa, không lặp lại, không tự nối của mình.*\n*💰 Thưởng: +100 tiền/từ đúng | 💎 Top 1 nhận 100,000 kim cương!*`)
            .setColor('#2ecc71')
            .setThumbnail('https://image-5.uhdpaper.com/wallpaper/hatsune-miku-error-anime-girl-hd-wallpaper-uhdpaper.com-227@5@o.jpg')
            .setFooter({ text: `Từ điển: ${validWords.size > 0 ? '✅' : '❌ Tắt'} | Hết hạn sau 60s` });
            
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`stop_noitu_${starterId}`)
                .setLabel('🛑 Dừng Trò Chơi')
                .setStyle(ButtonStyle.Danger)
        );
            
        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        
        const filter = m => !m.author.bot; 
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
        const btnCollector = reply.createMessageComponentCollector({ time: 60000 });
        
        const gameState = {
            currentWord: startWord,
            lastSyllable: lastSyllable,
            lastPlayerId: null,
            usedWords: new Set([startWord.toLowerCase()]),
            playerScores: new Map()
        };
        activeGames.set(channelId, gameState);

        btnCollector.on('collect', async i => {
            if (!i.customId.startsWith('stop_noitu_')) return;
            if (i.user.id !== starterId) {
                return i.reply({ content: '❌ Chỉ chủ phòng mới có thể dừng game!', ephemeral: true });
            }
            await i.deferUpdate();
            collector.stop('force_stop');
            btnCollector.stop();
        });
        
        collector.on('collect', async m => {
            const content = m.content.trim().toLowerCase();
            const words = content.split(/\s+/);
            
            if (words.length !== 2) return;
            if (words[0] !== gameState.lastSyllable) return;
            
            if (m.author.id === gameState.lastPlayerId) {
                return m.reply('🚫 Ế ế! Không được tự kỷ chơi một mình!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
            }
            if (gameState.usedWords.has(content)) {
                return m.reply(`♻️ Từ **${content.toUpperCase()}** đã có người dùng rồi!`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
            }
            if (validWords.size > 0 && !validWords.has(content)) {
                return m.reply(`📚 Chữ **${content.toUpperCase()}** không có trong từ điển tiếng Việt!`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
            }
            
            gameState.currentWord = content;
            gameState.lastSyllable = words[1];
            gameState.lastPlayerId = m.author.id;
            gameState.usedWords.add(content);
            
            const currentScore = gameState.playerScores.get(m.author.id) || 0;
            gameState.playerScores.set(m.author.id, currentScore + 1);
            
            // 💰 Cộng 100 tiền cho mỗi từ đúng bằng hàm addBalance chuẩn hệ thống
            try {
                await addBalance(m.author.id, 100);
            } catch (err) {
                console.error("Lỗi cộng tiền nối từ VN:", err);
            }
            
            await m.react('✅').catch(() => {});
            
            collector.resetTimer();
            btnCollector.resetTimer();
        });
        
        collector.on('end', async (collected, reason) => {
            activeGames.delete(channelId);
            
            let leaderboard = '';
            let rewardMsg = '';
            
            if (gameState.playerScores.size > 0) {
                const sortedScores = [...gameState.playerScores.entries()].sort((a, b) => b[1] - a[1]);
                
                // 💎 Cộng 100,000 kim cương cho Top 1 (tùy chỉnh hàm addBalance nếu hệ thống của bạn có hỗ trợ thêm tham số loại tiền tệ, hoặc gọi trực tiếp nếu addBalance quản lý chung)
                const top1Id = sortedScores[0][0];
                try {
                    // Nếu addBalance nhận đối số thứ 3 là loại tiền/diamond, hoặc dùng model riêng tùy theo cơ chế của addBalance trong ../db
                    // Ở đây gọi addBalance với 100,000 (nếu dùng chung số dư). Nếu bảng Diamond tách riêng, bạn có thể thay bằng hàm tương ứng trong ../db của bạn.
                    await addBalance(top1Id, 100000); 
                } catch (err) {
                    console.error("Lỗi cộng thưởng Top 1 VN:", err);
                }
                
                rewardMsg = `\n🎉 Chúc mừng <@${top1Id}> đạt Top 1 và nhận được phần thưởng lớn! 💎\n`;
                
                const top5 = sortedScores.slice(0, 5);
                const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
                leaderboard = top5.map((p, index) => `${medals[index]} <@${p[0]}>: **${p[1]}** từ`).join('\n');
            } else {
                leaderboard = '*Chưa có cao thủ nào ghi điểm.*';
            }

            let endTitle = '⏳ HẾT GIỜ!';
            let endColor = '#e74c3c';
            if (reason === 'force_stop') {
                endTitle = '🛑 TRÒ CHƠI ĐÃ KẾT THÚC';
                endColor = '#95a5a6';
            }

            const endEmbed = new EmbedBuilder()
                .setTitle(endTitle)
                .setDescription(`Trò chơi kết thúc tại chữ **${gameState.lastSyllable.toUpperCase()}**.\n\n📊 **TỔNG KẾT VÁN ĐẤU:**\n- Tổng số từ nối được: **${gameState.usedWords.size}**\n*(Mỗi từ đúng đã nhận được tiền thưởng)*\n${rewardMsg}\n🏆 **BẢNG XẾP HẠNG TOP 5:**\n${leaderboard}`)
                .setColor(endColor);
                
            reply.edit({ components: [] }).catch(() => {}); 
            interaction.channel.send({ embeds: [endEmbed] }).catch(() => {});
        });
    }
};
