// hangman.js (Phiên bản mới hỗ trợ tiếng Việt có dấu)
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance, deductBalance } = require('../db');

// ✅ Hàm loại bỏ dấu (chuẩn hóa Unicode)
// Dùng để so sánh chữ cái đoán với từ bí mật mà không cần nút bấm cho chữ có dấu
function removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// ✅ Danh sách các từ có dấu
const words = [
    "CHÈ", "BÀO", "CÂY", "ĐÀO", "GẠO", "HÁT", "HOA", "KEM", "LÁI", "LÚA",
    "MỆT", "NẤU", "QUẦN", "SƠN", "THÂN", "TAY", "TẾT", "THU", "XE", "VUI",
    "GIAO THÔNG", "CÔNG VIỆC", "HỘI NGHỊ", "GIA ĐÌNH", "TRƯỜNG HỌC", "MÁY TÍNH",
    "ĐỌC SÁCH", "CHƠI GAME", "HỌC TẬP", "NGHỈ NGƠI", "VUI VẺ", "BUỒN BÃ", "HẠNH PHÚC",
    "TẬP THỂ DỤC", "ĐI BỘ", "ĂN TỐI", "MẶT TRỜI", "MẶT TRĂNG", "NGÔI SAO", "MƯA", "GIÓ",
    "SÔNG", "NÚI", "CÂY XANH", "HOA HỒNG", "ĐẤT"
];

// Số lần đoán sai TỐI ĐA
const MAX_INCORRECT_GUESSES = 6;

// Trạng thái các game đang diễn ra (sử dụng message.id làm key)
const activeGames = new Map();

function createButtons(guessedLetters) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let rowCount = 0;

    for (const letter of alphabet) {
        const button = new ButtonBuilder()
            .setCustomId(`doanchu-guess-${letter}`)
            .setLabel(letter)
            .setStyle(guessedLetters.includes(letter) ? ButtonStyle.Secondary : ButtonStyle.Primary)
            .setDisabled(guessedLetters.includes(letter));

        if (rowCount < 5) {
            currentRow.addComponents(button);
            rowCount++;
        } else {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder().addComponents(button);
            rowCount = 1;
        }
    }
    
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }
    
    return rows.slice(0, 5);
}

function updateEmbed(game) {
    // Hiển thị từ bí mật: Nếu chữ cái không dấu đã được đoán, thì hiện chữ cái CÓ DẤU tương ứng
    const hiddenWord = game.word.split('').map(char => {
        if (char === ' ') return '  ';
        const charNoDiacritics = removeDiacritics(char).toUpperCase();

        // Kiểm tra xem chữ cái không dấu đã được đoán chưa
        return game.guessedLetters.includes(charNoDiacritics) ? char : '`_`';
    }).join(' ');

    const wrongGuessesDisplay = '<a:AbbyCry:1393909295665643540> '.repeat(game.incorrectGuesses) + '<a:AbbyCheer:1393909243840827432> '.repeat(MAX_INCORRECT_GUESSES - game.incorrectGuesses);
    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('<a:Verified:1406631971509243974> **Đoán Từ Cùng Augusta**')
        .setDescription(
            `**Tiền cược:** **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>\n` +
            `**Trạng thái:** ${wrongGuessesDisplay}\n\n` +
            `**Từ bí mật:** ${hiddenWord}\n\n` +
            `**Các chữ đã đoán:** ${game.guessedLetters.join(', ') || 'Chưa đoán chữ nào'}\n\n` +
            `**Số lần đoán sai còn lại:** ${MAX_INCORRECT_GUESSES - game.incorrectGuesses}\n`
        );
    
    // Xử lý khi Game Over
    if (game.incorrectGuesses >= MAX_INCORRECT_GUESSES) {
        embed.setDescription(`Bạn đã thua! Từ đúng là: **${game.word}**\n\nBạn đã mất **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811> đã đặt cược.`);
        embed.setColor('#c0392b');
    } else if (!hiddenWord.includes('_')) {
        const reward = game.bet * 2;
        embed.setDescription(`Chúc mừng! Bạn đã đoán đúng từ: **${game.word}**\n\nBạn đã thắng **${reward.toLocaleString()}**<a:diamondgem:1402590496647413811>! (Lợi nhuận **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>)`);
        embed.setColor('#2ecc71');
    }
    
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('doanchu')
        .setDescription('Bắt đầu chơi game Đoán Từ với tiền cược')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Số tiền bạn muốn đặt cược (Tối thiểu 1000)')
                .setRequired(true)
                .setMinValue(1000)
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('bet');

        // Kiểm tra số dư và trừ tiền cược
        const balance = await getBalance(userId);
        if (balance < bet) {
            return interaction.reply({ 
                content: `❌ Bạn không đủ **${bet.toLocaleString()}**<a:diamondgem:1402590496647413811> để đặt cược. Số dư hiện tại: **${balance.toLocaleString()}**<a:diamondgem:1402590496647413811>`, 
                ephemeral: true 
            });
        }
        await deductBalance(userId, bet);

        const randomWord = words[Math.floor(Math.random() * words.length)];
        
        const game = {
            word: randomWord.toUpperCase(),
            guessedLetters: [], // Luôn lưu trữ chữ cái KHÔNG DẤU đã đoán
            incorrectGuesses: 0,
            player: interaction.user.username,
            bet: bet,
        };

        const embed = updateEmbed(game);
        const components = createButtons(game.guessedLetters);
        
        const reply = await interaction.reply({ embeds: [embed], components, fetchReply: true });
        
        activeGames.set(reply.id, game);
    },

    async handleButton(interaction) {
        await interaction.deferUpdate(); 
        const userId = interaction.user.id;
        const game = activeGames.get(interaction.message.id);

        if (!game) {
            return interaction.editReply({ content: 'Không có game nào đang diễn ra cho tin nhắn này', components: [] });
        }
        
        // Chữ cái đoán luôn là KHÔNG DẤU (A-Z)
        const letter = interaction.customId.split('-')[2]; 
        
        if (game.guessedLetters.includes(letter)) {
            return; 
        }
        
        game.guessedLetters.push(letter);
        
        let won = false;
        
        // ✅ Logic kiểm tra mới: Chuẩn hóa từ bí mật sang không dấu để kiểm tra
        const wordNoDiacritics = removeDiacritics(game.word).toUpperCase();
        
        if (!wordNoDiacritics.includes(letter)) {
            game.incorrectGuesses++;
        } else {
            // Kiểm tra chiến thắng (so sánh tất cả các chữ cái KHÔNG DẤU trong từ)
            const allLettersGuessed = wordNoDiacritics.split('').every(char => {
                if (char === ' ') return true;
                return game.guessedLetters.includes(char);
            });

            if (allLettersGuessed) {
                won = true;
            }
        }
        
        const embed = updateEmbed(game);
        
        if (game.incorrectGuesses >= MAX_INCORRECT_GUESSES) {
            activeGames.delete(interaction.message.id);
            await interaction.editReply({ embeds: [embed], components: [] });
        } else if (won) {
            activeGames.delete(interaction.message.id);
            const reward = game.bet * 2; 
            await addBalance(userId, reward);
            embed.setDescription(
                `<a:AbbyHappy:1393909327848538122> Chúc mừng **${interaction.member.displayName}** đã đoán đúng từ: **${game.word}**!\n\n` +
                `Bạn đã thắng **${reward.toLocaleString()}**<a:diamondgem:1402590496647413811> (bao gồm cả tiền cược **${game.bet.toLocaleString()}**). Lợi nhuận: **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>`
            );
            await interaction.editReply({ embeds: [embed], components: [] });
        } else {
            const components = createButtons(game.guessedLetters);
            await interaction.editReply({ embeds: [embed], components });
        }
    }
};



