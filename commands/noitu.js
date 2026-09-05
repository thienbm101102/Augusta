const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Tải bộ từ điển tiếng Việt vào bộ nhớ (Sử dụng Set để truy xuất O(1) cực nhanh)
let validWords = new Set();
try {
    const dictPath = path.join(__dirname, 'tu_dien.txt');
    const data = fs.readFileSync(dictPath, 'utf8');
    
    // Tách dòng, xóa khoảng trắng thừa và chỉ lấy các từ ghép có 2 âm tiết
    const wordsArray = data.split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.split(' ').length === 2); 
        
    validWords = new Set(wordsArray);
    console.log(`[Nối Từ] Đã load thành công ${validWords.size} từ vựng 2 âm tiết.`);
} catch (error) {
    console.warn("[Nối Từ] ⚠️ Không tìm thấy file tu_dien.txt. Game sẽ chạy nhưng KHÔNG có tính năng check từ điển.");
}

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noitu')
        .setDescription('Chơi nối từ tiếng Việt với từ điển chuẩn')
        .addSubcommand(subcmd => 
            subcmd.setName('start')
                .setDescription('Bắt đầu ván nối từ mới')
        )
        .addSubcommand(subcmd => 
            subcmd.setName('stop')
                .setDescription('Dừng ván nối từ hiện tại')
        ),
        
    async execute(interaction) {
        const subcmd = interaction.options.getSubcommand();
        const channelId = interaction.channelId;
        
        if (subcmd === 'stop') {
            if (!activeGames.has(channelId)) {
                return interaction.reply({ content: 'Kênh này hiện không có ván nối từ nào!', ephemeral: true });
            }
            const game = activeGames.get(channelId);
            game.collector.stop('force_stop');
            activeGames.delete(channelId);
            return interaction.reply({ content: '🛑 Đã kết thúc trò chơi nối từ!' });
        }
        
        if (subcmd === 'start') {
            if (activeGames.has(channelId)) {
                return interaction.reply({ content: 'Kênh này đang chơi nối từ rồi!', ephemeral: true });
            }
            
            // Lấy ngẫu nhiên 1 từ trong bộ từ điển làm từ mồi (nếu có từ điển), nếu không thì dùng từ mặc định
            let startWord = 'hòa bình';
            if (validWords.size > 0) {
                const wordsArray = Array.from(validWords);
                startWord = wordsArray[Math.floor(Math.random() * wordsArray.length)];
            }
            
            const syllables = startWord.split(' ');
            const lastSyllable = syllables[1];
            
            const embed = new EmbedBuilder()
                .setTitle('🔤 TRÒ CHƠI NỐI TỪ BẮT ĐẦU!')
                .setDescription(`Từ khởi đầu: **${startWord.toUpperCase()}**\n\nNgười tiếp theo hãy gõ một từ có 2 tiếng bắt đầu bằng chữ: **${lastSyllable.toUpperCase()}**\n\n*Luật: Từ có nghĩa, không trùng lặp, không tự nối của mình.*`)
                .setColor('#3498db')
                .setFooter({ text: `Từ điển đang hoạt động: ${validWords.size > 0 ? 'BẬT ✅' : 'TẮT ❌'} | Hết hạn sau 60s` });
                
            await interaction.reply({ embeds: [embed] });
            
            const filter = m => !m.author.bot; 
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
            
            const gameState = {
                currentWord: startWord,
                lastSyllable: lastSyllable,
                lastPlayerId: null,
                collector: collector,
                usedWords: new Set([startWord.toLowerCase()])
            };
            
            activeGames.set(channelId, gameState);
            
            collector.on('collect', async m => {
                const content = m.content.trim().toLowerCase();
                const words = content.split(/\s+/);
                
                // Bỏ qua nếu không phải 2 chữ
                if (words.length !== 2) return;
                
                // Bỏ qua nếu sai chữ cái nối
                if (words[0] !== gameState.lastSyllable) return;
                
                // Check tự kỷ
                if (m.author.id === gameState.lastPlayerId) {
                    return m.reply('❌ Không được tự nối từ của chính mình!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                }
                
                // Check trùng lặp
                if (gameState.usedWords.has(content)) {
                    return m.reply('♻️ Từ này đã được sử dụng rồi!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                }

                // Check TỪ ĐIỂN (Trọng tâm)
                if (validWords.size > 0 && !validWords.has(content)) {
                    return m.reply('📚 Từ này vô nghĩa hoặc không có trong từ điển tiếng Việt!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                }
                
                // Hợp lệ
                gameState.currentWord = content;
                gameState.lastSyllable = words[1];
                gameState.lastPlayerId = m.author.id;
                gameState.usedWords.add(content);
                
                await m.react('✅').catch(() => {});
                collector.resetTimer();
            });
            
            collector.on('end', (collected, reason) => {
                activeGames.delete(channelId);
                if (reason === 'time') {
                    const endEmbed = new EmbedBuilder()
                        .setTitle('⏳ HẾT GIỜ!')
                        .setDescription(`Đã 60 giây trôi qua mà không ai nối được chữ **${gameState.lastSyllable.toUpperCase()}**.\n\n🏆 Tổng số từ nối được: **${gameState.usedWords.size}** từ.`)
                        .setColor('#e74c3c');
                    interaction.channel.send({ embeds: [endEmbed] }).catch(() => {});
                }
            });
        }
    }
};