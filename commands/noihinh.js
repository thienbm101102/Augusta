const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// Danh sách các cặp emoji
const emojis = [
    '🍎', '🍌', '🍇', '🍉', '🍊', '🍍', '🍓', '🍒',
    '🍋', '🥝', '🥥', '🥭', '🍐', '🍑', '🌶️', '🌽',
];

const BOARD_SIZE = 4; // Kích thước bàn cờ (BOARD_SIZE x BOARD_SIZE)
const TIME_LIMIT_MINUTES = 1; // Thời gian tối đa để hoàn thành game (phút)
const activeGames = new Map();

function createBoard() {
    const pairs = emojis.slice(0, (BOARD_SIZE * BOARD_SIZE) / 2);
    const shuffledEmojis = [...pairs, ...pairs].sort(() => Math.random() - 0.5);
    const board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board.push(shuffledEmojis.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE));
    }
    return board;
}

function createButtons(board, revealedCards) {
    const components = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < BOARD_SIZE; j++) {
            const isRevealed = revealedCards.some(card => card.row === i && card.col === j);
            const button = new ButtonBuilder()
                .setCustomId(`noihinh-flip-${i}-${j}`)
                .setLabel(isRevealed ? board[i][j] : '\u200B')
                .setStyle(isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary)
                .setDisabled(isRevealed);
            row.addComponents(button);
        }
        components.push(row);
    }
    return components;
}

function updateEmbed(game) {
    const timeRemaining = Math.floor((game.endTime - Date.now()) / 1000);
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('<a:Verified:1406631971509243974> **Nối Hình**')
        .setDescription(`Tìm tất cả các cặp emoji trong **${TIME_LIMIT_MINUTES}** phút!`)
        .addFields(
            { name: 'Thời gian còn lại:', value: `${Math.max(0, timeRemaining)} giây` },
            { name: 'Số cặp đã tìm:', value: `${game.pairsFound} / ${(BOARD_SIZE * BOARD_SIZE) / 2}` }
        );
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('noihinh')
        .setDescription('Chơi game Nối Hình'),
    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        if (activeGames.has(userId)) {
            return interaction.editReply({ content: 'Bạn đã có một game đang diễn ra. Hãy hoàn thành nó trước!', ephemeral: true });
        }

        const board = createBoard();
        const game = {
            board,
            revealed: [],
            firstFlip: null,
            pairsFound: 0,
            originalPlayerId: userId,
            messageId: null,
            endTime: Date.now() + TIME_LIMIT_MINUTES * 60 * 1000,
            timer: null,
            winnings: 10000 // Tiền thưởng khi thắng game
        };

        const embed = updateEmbed(game);
        const components = createButtons(game.board, game.revealed);

        const reply = await interaction.editReply({ embeds: [embed], components, fetchReply: true });
        game.messageId = reply.id;
        activeGames.set(userId, game);

        // Thiết lập bộ đếm thời gian
        game.timer = setTimeout(async () => {
            if (activeGames.has(userId)) {
                activeGames.delete(userId);
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('Hết Giờ!')
                    .setDescription('Bạn đã hết thời gian để hoàn thành trò chơi.')
                    .setColor('#e74c3c');
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        }, TIME_LIMIT_MINUTES * 60 * 1000);
    },
    async handleButton(interaction) {
        const userId = interaction.user.id;
        const game = activeGames.get(userId);

        if (!game || interaction.message.id !== game.messageId) {
            return interaction.reply({ content: 'Không có game nào của bạn đang diễn ra', ephemeral: true });
        }

        if (game.originalPlayerId !== userId) {
            return interaction.reply({ content: 'Đây không phải game của bạn!', ephemeral: true });
        }

        const [_, __, row, col] = interaction.customId.split('-');
        const card = { row: parseInt(row), col: parseInt(col) };

        // Kiểm tra xem thẻ đã được lật chưa
        if (game.revealed.some(c => c.row === card.row && c.col === card.col)) {
            return interaction.reply({ content: 'Thẻ này đã được lật rồi!', ephemeral: true });
        }

        if (!game.firstFlip) {
            // Đây là thẻ đầu tiên được lật
            game.firstFlip = card;
            game.revealed.push(card);
            const newEmbed = updateEmbed(game);
            const updatedComponents = createButtons(game.board, game.revealed);
            await interaction.update({ embeds: [newEmbed], components: updatedComponents });
        } else {
            // Đây là thẻ thứ hai, kiểm tra xem có khớp không
            const firstCard = game.firstFlip;
            const card1Emoji = game.board[firstCard.row][firstCard.col];
            const card2Emoji = game.board[card.row][card.col];

            // Thêm thẻ thứ hai vào mảng revealed để hiển thị nó
            game.revealed.push(card);
            const updatedButtonsForSecondFlip = createButtons(game.board, game.revealed);

            if (card1Emoji === card2Emoji) {
                // Là một cặp!
                game.firstFlip = null;
                game.pairsFound++;

                const newEmbed = updateEmbed(game).setDescription('**Là một cặp!** Tiếp tục tìm nhé.');

                // Kiểm tra điều kiện thắng
                if (game.pairsFound === (BOARD_SIZE * BOARD_SIZE) / 2) {
                    clearTimeout(game.timer);
                    activeGames.delete(userId);
                    const finalEmbed = new EmbedBuilder()
                        .setTitle('<a:AbbyHappy:1393909327848538122> **Chúc mừng! Bạn đã thắng!**')
                        .setDescription(`Bạn đã hoàn thành trò chơi và nhận được **${game.winnings.toLocaleString()}**<a:diamondgem:1402590496647413811>!`)
                        .setColor('#2ecc71');
                    await addBalance(userId, game.winnings);
                    await interaction.update({ embeds: [finalEmbed], components: [] });
                } else {
                    // Tiếp tục
                    await interaction.update({ embeds: [newEmbed], components: updatedButtonsForSecondFlip });
                }
            } else {
                // Không phải cặp, lật lại sau 2 giây
                game.firstFlip = null;
                await interaction.update({ embeds: [updateEmbed(game).setDescription('**Không khớp! Vui lòng thử lại nhé**.'), components: updatedButtonsForSecondFlip });

                setTimeout(async () => {
                    const newRevealed = game.revealed.filter(c =>
                        !(c.row === card.row && c.col === card.col) &&
                        !(c.row === firstCard.row && c.col === firstCard.col)
                    );
                    game.revealed = newRevealed;
                    const finalComponents = createButtons(game.board, game.revealed);
                    const newEmbed = updateEmbed(game)
                        .setDescription('Không khớp! Vui lòng thử lại nhé.');
                    try {
                        await interaction.editReply({ embeds: [newEmbed], components: finalComponents });
                    } catch (e) {
                        console.error('Lỗi khi cập nhật tin nhắn:', e);
                    }
                }, 2000);
            }
        }
    }
};
