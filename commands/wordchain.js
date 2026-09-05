const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

let validWords = new Set();
try {
    const dictPath = path.join(__dirname, 'en_dict.txt');
    const data = fs.readFileSync(dictPath, 'utf8');
    const wordsArray = data.split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 1 && /^[a-z]+$/.test(w)); 
    validWords = new Set(wordsArray);
} catch (error) {
    console.warn("⚠️ Không tìm thấy file en_dict.txt.");
}

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordchain')
        .setDescription('Chơi Word Chain (Nối chữ Tiếng Anh) giao diện mới'),
        
    async execute(interaction) {
        const channelId = interaction.channelId;
        const starterId = interaction.user.id;
        
        if (activeGames.has(channelId)) {
            return interaction.reply({ content: '❌ Kênh này đang có một ván Word Chain diễn ra rồi!', ephemeral: true });
        }
        
        let startWord = 'discord';
        if (validWords.size > 0) {
            const wordsArray = Array.from(validWords);
            startWord = wordsArray[Math.floor(Math.random() * wordsArray.length)];
        }
        const lastLetter = startWord.slice(-1);
        
        const embed = new EmbedBuilder()
            .setTitle('ĐẤU TRƯỜNG NỐI TỪ TIẾNG ANH')
            .setDescription(`Chủ phòng: <@${starterId}>\n\nTừ khởi đầu: 🟢 **${startWord.toUpperCase()}**\n\nNgười tiếp theo hãy gõ một từ Tiếng Anh bắt đầu bằng chữ cái:\n# 🎯 ${lastLetter.toUpperCase()}\n\n*⚠️ Luật: 1 từ duy nhất, có nghĩa, không lặp lại, không tự nối của mình.*`)
            .setColor('#3498db')
            .setThumbnail('https://image-5.uhdpaper.com/wallpaper/hatsune-miku-error-anime-girl-hd-wallpaper-uhdpaper.com-227@5@o.jpg')
            .setFooter({ text: `Từ điển: ${validWords.size > 0 ? '✅' : '❌ Tắt'} | Hết hạn sau 60s nếu không ai nối` });
            
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`stop_chain_${starterId}`)
                .setLabel('🛑 Dừng Trò Chơi')
                .setStyle(ButtonStyle.Danger)
        );
            
        const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        
        const filter = m => !m.author.bot; 
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
        const btnCollector = reply.createMessageComponentCollector({ time: 60000 });
        
        const gameState = {
            currentWord: startWord,
            lastLetter: lastLetter,
            lastPlayerId: null,
            usedWords: new Set([startWord.toLowerCase()]),
            playerScores: new Map()
        };
        activeGames.set(channelId, gameState);

        btnCollector.on('collect', async i => {
            if (!i.customId.startsWith('stop_chain_')) return;
            if (i.user.id !== starterId) {
                return i.reply({ content: '❌ Chỉ chủ phòng mới có thể dừng game!', ephemeral: true });
            }
            await i.deferUpdate();
            collector.stop('force_stop');
            btnCollector.stop();
        });
        
        collector.on('collect', async m => {
            const content = m.content.trim().toLowerCase();
            
            if (content.includes(' ')) return;
            if (!content.startsWith(gameState.lastLetter)) return;
            
            if (m.author.id === gameState.lastPlayerId) {
                return m.reply('🚫 Ế ế! Không được tự kỷ chơi một mình!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
            }
            if (gameState.usedWords.has(content)) {
                return m.reply(`♻️ Từ **${content.toUpperCase()}** đã có người dùng rồi!`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
            }
            if (validWords.size > 0 && !validWords.has(content)) {
                return m.reply(`📚 Chữ **${content.toUpperCase()}** không có trong từ điển tiếng Anh!`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
            }
            
            gameState.currentWord = content;
            gameState.lastLetter = content.slice(-1);
            gameState.lastPlayerId = m.author.id;
            gameState.usedWords.add(content);
            
            const currentScore = gameState.playerScores.get(m.author.id) || 0;
            gameState.playerScores.set(m.author.id, currentScore + 1);
            
            await m.react('✅').catch(() => {});
            
            collector.resetTimer();
            btnCollector.resetTimer();
        });
        
        collector.on('end', (collected, reason) => {
            activeGames.delete(channelId);
            
            let leaderboard = '';
            if (gameState.playerScores.size > 0) {
                const sortedScores = [...gameState.playerScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
                const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
                leaderboard = sortedScores.map((p, index) => `${medals[index]} <@${p[0]}>: **${p[1]}** từ`).join('\n');
            } else {
                leaderboard = '*Chưa có cao thủ nào ghi điểm.*';
            }

            let endTitle = '⏳ HẾT GIỜ!';
            let endColor = '#e74c3c';
            if (reason === 'force_stop') {
                endTitle = '🛑 TRÒ CHƠI KẾT THÚC';
                endColor = '#95a5a6';
            }

            const endEmbed = new EmbedBuilder()
                .setTitle(endTitle)
                .setDescription(`Trò chơi kết thúc. Không ai tìm được từ bắt đầu bằng chữ cái **${gameState.lastLetter.toUpperCase()}**.\n\n📊 **TỔNG KẾT VÁN ĐẤU:**\n- Tổng số từ nối được: **${gameState.usedWords.size}**\n\n🏆 **BẢNG XẾP HẠNG TOP 5:**\n${leaderboard}`)
                .setColor(endColor);
                
            reply.edit({ components: [] }).catch(() => {}); 
            interaction.channel.send({ embeds: [endEmbed] }).catch(() => {});
        });
    }
};
