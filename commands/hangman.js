const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// Danh sách các từ để đoán (tiếng Việt không dấu)
const words = [
    "CHIM", "BAO", "CAY", "DAO", "GAO", "HAT", "HOA", "KEM", "LAI", "LUA",
    "MEP", "NAU", "QUAN", "SON", "THAN", "TAY", "TET", "THU", "XE", "VUI",
    "GIAO THONG", "CONG VIEC", "HOI NGHI", "GIA DINH", "TRUONG HOC", "MAY TINH"
];

// Hình ảnh người treo cổ, mỗi phần tử là một trạng thái
const hangmanStages = [
    `\`\`\`
  +---+
  |   |
  |   
  |   
  |   
  |   
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  |   O
  |  
  |   
  |   
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  |   O
  |   |
  |   
  |   
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  |   O
  |  /|
  |   
  |   
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  |   O
  |  /|\\
  |   
  |   
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  |   O
  |  /|\\
  |  / 
  |   
=========\`\`\``,
    `\`\`\`
  +---+
  |   |
  |   O
  |  /|\\
  |  / \\
  |   
=========\`\`\``
];

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
    
    // Đẩy hàng cuối cùng
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }
    
    // Giới hạn tổng số hàng là 5
    if (rows.length > 5) {
        return rows.slice(0, 5);
    }

    return rows;
}

function updateEmbed(game) {
    const hiddenWord = game.word.split('').map(char => {
        if (char === ' ') return '  ';
        return game.guessedLetters.includes(char) ? char : '`_`';
    }).join(' ');

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('<a:Verified:1406631971509243974> **Đoán Từ Cùng Augusta**')
        .setDescription(
            `${hangmanStages[game.incorrectGuesses]}\n\n` +
            `**Từ bí mật:** ${hiddenWord}\n\n` +
            `**Các chữ đã đoán:** ${game.guessedLetters.join(', ')}\n\n` +
            `**Số lần đoán sai còn lại:** ${6 - game.incorrectGuesses}\n`
        )
    
    if (game.incorrectGuesses >= 6) {
        embed.setDescription(
            `${hangmanStages[game.incorrectGuesses]}\n\n` +
            `Bạn đã thua! Từ đúng là: **${game.word}**`
        );
        embed.setColor('#c0392b');
    } else if (!hiddenWord.includes('_')) {
        embed.setDescription(`Chúc mừng! Bạn đã đoán đúng từ: **${game.word}**`);
        embed.setColor('#2ecc71');
    }
    
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('doanchu')
        .setDescription('Bắt đầu chơi game Đoán Từ'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const randomWord = words[Math.floor(Math.random() * words.length)];
        
        // Khởi tạo trạng thái game
        const game = {
            word: randomWord.toUpperCase(),
            guessedLetters: [],
            incorrectGuesses: 0,
            player: interaction.user.username,
        };

        const embed = updateEmbed(game);
        const components = createButtons(game.guessedLetters);
        
        const reply = await interaction.reply({ embeds: [embed], components, fetchReply: true });
        
        // Lưu game vào bản đồ bằng ID tin nhắn
        activeGames.set(reply.id, game);
    },

    async handleButton(interaction) {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const game = activeGames.get(interaction.message.id);

        if (!game) {
            return interaction.editReply({ content: 'Không có game nào đang diễn ra cho tin nhắn này', components: [] });
        }
        
        const letter = interaction.customId.split('-')[2];
        
        if (game.guessedLetters.includes(letter)) {
            return; // Đã đoán chữ này rồi
        }
        
        game.guessedLetters.push(letter);
        
        let won = false;
        if (!game.word.includes(letter)) {
            game.incorrectGuesses++;
        } else {
            // Kiểm tra xem từ đã được đoán hết chưa
            const hiddenWord = game.word.split('').map(char => {
                if (char === ' ') return '  ';
                return game.guessedLetters.includes(char) ? char : '`_`';
            }).join(' ');
            if (!hiddenWord.includes('_')) {
                won = true;
            }
        }
        
        const embed = updateEmbed(game);
        
        if (game.incorrectGuesses >= 6) {
            // Game over, thua
            activeGames.delete(interaction.message.id);
            embed.setDescription(
                `${hangmanStages[game.incorrectGuesses]}\n\n` +
                `Không có ai đoán được từ. Từ đúng là: **${game.word}**`
            );
            embed.setColor('#c0392b');
            await interaction.editReply({ embeds: [embed], components: [] });
        } else if (won) {
            // Game over, thắng
            activeGames.delete(interaction.message.id);
            const reward = 1000;
            await addBalance(userId, reward); // Đã sửa: Thêm await
            embed.setDescription(
                `<a:AbbyHappy:1393909327848538122> Chúc mừng ${interaction.member.displayName} đã đoán đúng từ: **${game.word}**! <a:AbbyHappy:1393909327848538122>\n\n` +
                `Bạn đã nhận được **${reward.toLocaleString()}**<a:diamondgem:1402590496647413811>`
            );
            embed.setColor('#2ecc71');
            await interaction.editReply({ embeds: [embed], components: [] });
        } else {
            // Tiếp tục game
            const components = createButtons(game.guessedLetters);
            await interaction.editReply({ embeds: [embed], components });
        }
    }
};
