const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Tải bộ từ điển tiếng Anh vào bộ nhớ
let validWords = new Set();
try {
    const dictPath = path.join(__dirname, 'en_dict.txt');
    const data = fs.readFileSync(dictPath, 'utf8');
    
    // Tách dòng, lấy các từ chỉ chứa chữ cái (không số, không ký tự đặc biệt) và dài hơn 1 ký tự
    const wordsArray = data.split('\n')
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 1 && /^[a-z]+$/.test(w)); 
        
    validWords = new Set(wordsArray);
    console.log(`[Word Chain] Đã load thành công ${validWords.size} từ vựng tiếng Anh.`);
} catch (error) {
    console.warn("[Word Chain] ⚠️ Không tìm thấy file en_dict.txt. Game sẽ chạy nhưng KHÔNG check từ điển.");
}

const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordchain')
        .setDescription('Chơi nối từ tiếng Anh (Word Chain)')
        .addSubcommand(subcmd => 
            subcmd.setName('start')
                .setDescription('Bắt đầu ván nối từ tiếng Anh')
        )
        .addSubcommand(subcmd => 
            subcmd.setName('stop')
                .setDescription('Dừng ván hiện tại')
        ),
        
    async execute(interaction) {
        const subcmd = interaction.options.getSubcommand();
        const channelId = interaction.channelId;
        
        if (subcmd === 'stop') {
            if (!activeGames.has(channelId)) {
                return interaction.reply({ content: 'Kênh này hiện không có ván nối từ tiếng Anh nào!', ephemeral: true });
            }
            const game = activeGames.get(channelId);
            game.collector.stop('force_stop');
            activeGames.delete(channelId);
            return interaction.reply({ content: '🛑 Đã kết thúc trò chơi Word Chain!' });
        }
        
        if (subcmd === 'start') {
            if (activeGames.has(channelId)) {
                return interaction.reply({ content: 'Kênh này đang chơi rồi! Nhìn xuống tin nhắn dưới cùng để tham gia.', ephemeral: true });
            }
            
            // Lấy ngẫu nhiên 1 từ làm mồi
            let startWord = 'discord';
            if (validWords.size > 0) {
                const wordsArray = Array.from(validWords);
                startWord = wordsArray[Math.floor(Math.random() * wordsArray.length)];
            }
            
            const lastLetter = startWord.slice(-1);
            
            const embed = new EmbedBuilder()
                .setTitle('🔠 TRÒ CHƠI NỐI TỪ TIẾNG ANH (WORD CHAIN)!')
                .setDescription(`Từ khởi đầu: **${startWord.toUpperCase()}**\n\nNgười tiếp theo hãy gõ một chữ bắt đầu bằng ký tự: **${lastLetter.toUpperCase()}**\n\n*Luật: 1 từ duy nhất tiếng Anh, không lặp lại, không tự nối.*`)
                .setColor('#e67e22')
                .setFooter({ text: `Từ điển: ${validWords.size > 0 ? 'BẬT ✅' : 'TẮT ❌'} | Hết hạn sau 60s` });
                
            await interaction.reply({ embeds: [embed] });
            
            const filter = m => !m.author.bot; 
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });
            
            const gameState = {
                currentWord: startWord,
                lastLetter: lastLetter,
                lastPlayerId: null,
                collector: collector,
                usedWords: new Set([startWord.toLowerCase()])
            };
            
            activeGames.set(channelId, gameState);
            
            collector.on('collect', async m => {
                const content = m.content.trim().toLowerCase();
                
                // Chỉ chấp nhận tin nhắn chứa 1 từ duy nhất
                if (content.includes(' ')) return;
                
                // Bỏ qua nếu từ không bắt đầu bằng chữ cái cuối của từ trước
                if (!content.startsWith(gameState.lastLetter)) return;
                
                // Check tự kỷ
                if (m.author.id === gameState.lastPlayerId) {
                    return m.reply('❌ Không được tự nối từ của chính mình!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                }
                
                // Check trùng lặp
                if (gameState.usedWords.has(content)) {
                    return m.reply('♻️ Từ này đã được sử dụng rồi!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                }

                // Check từ điển
                if (validWords.size > 0 && !validWords.has(content)) {
                    return m.reply('📚 Từ này vô nghĩa hoặc không có trong từ điển tiếng Anh!').then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
                }
                
                // Hợp lệ
                gameState.currentWord = content;
                gameState.lastLetter = content.slice(-1); // Lấy chữ cái cuối cùng
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
                        .setDescription(`Đã 60 giây trôi qua mà không ai nối được chữ **${gameState.lastLetter.toUpperCase()}**.\n\n🏆 Tổng số chuỗi từ: **${gameState.usedWords.size}** từ.`)
                        .setColor('#e74c3c');
                    interaction.channel.send({ embeds: [endEmbed] }).catch(() => {});
                }
            });
        }
    }
};