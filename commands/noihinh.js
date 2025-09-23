const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

const emojis = [
    '🍎', '🍌', '🍇', '🍉', '🍊', '🍍', '🍓', '🍒',
    '🍋', '🥝', '🥥', '🥭', '🍐', '🍑', '🌶️', '🌽',
];

const BOARD_SIZE = 4;
const TIME_LIMIT_MINUTES = 1;
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
    const remainingTime = Math.floor((game.endTime - Date.now()) / 1000);
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('<a:Verified:1406631971509243974> **Nối Hình**')
        .setDescription(`Tìm tất cả các cặp emoji trong **${TIME_LIMIT_MINUTES}** phút!`)
        .addFields(
            { name: 'Thời gian còn lại:', value: `${remainingTime > 0 ? remainingTime : 0} giây` },
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
            updateInterval: null,
            winnings: 10000
        };

        const embed = updateEmbed(game);
        const components = createButtons(game.board, game.revealed);
        
        const reply = await interaction.editReply({ embeds: [embed], components, fetchReply: true });
        game.messageId = reply.id;
        activeGames.set(userId, game);

        // Thiết lập bộ đếm thời gian hết giờ
        game.timer = setTimeout(async () => {
            if (activeGames.has(userId)) {
                activeGames.delete(userId);
                clearInterval(game.updateInterval);
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('Hết Giờ!')
                    .setDescription('Bạn đã hết thời gian để hoàn thành trò chơi.')
                    .setColor('#e74c3c');
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        }, TIME_LIMIT_MINUTES * 60 * 1000);
        
        // Thiết lập cập nhật đồng hồ mỗi giây
        game.updateInterval = setInterval(async () => {
            if (activeGames.has(userId)) {
                const updatedGame = activeGames.get(userId);
                const newEmbed = updateEmbed(updatedGame);
                try {
                    await interaction.editReply({ embeds: [newEmbed] });
                } catch (e) {
                    console.error('Lỗi khi cập nhật đồng hồ:', e);
                    clearInterval(game.updateInterval);
                    clearTimeout(game.timer);
                    activeGames.delete(userId);
                }
            }
        }, 1000);
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

        const [command, action, row, col] = interaction.customId.split('-');
        const card = { row: parseInt(row), col: parseInt(col) };

        if (game.revealed.some(c => c.row === card.row && c.col === card.col)) {
            return interaction.deferUpdate();
        }

        game.revealed.push(card);

        if (!game.firstFlip) {
            game.firstFlip = card;
            const newEmbed = updateEmbed(game);
            const updatedComponents = createButtons(game.board, game.revealed);
            await interaction.update({ embeds: [newEmbed], components: updatedComponents });
        } else {
            // Đã có tương tác lần 2
            await interaction.deferUpdate(); // Defer để đảm bảo phản hồi trong 3 giây
            
            const firstCard = game.firstFlip;
            const card1Emoji = game.board[firstCard.row][firstCard.col];
            const card2Emoji = game.board[card.row][card.col];
            
            // Cập nhật lại game state
            game.firstFlip = null;

            if (card1Emoji === card2Emoji) {
                game.pairsFound++;
                const newEmbed = updateEmbed(game);
                const updatedComponents = createButtons(game.board, game.revealed);
                await interaction.editReply({ embeds: [newEmbed], components: updatedComponents });

                if (game.pairsFound === (BOARD_SIZE * BOARD_SIZE) / 2) {
                    clearTimeout(game.timer);
                    clearInterval(game.updateInterval);
                    activeGames.delete(userId);
                    await addBalance(userId, game.winnings);
                    const finalEmbed = updateEmbed(game)
                        .setDescription(`<a:AbbyHappy:1393909327848538122> Chúc mừng, **<@${game.originalPlayerId}>** đã thắng!\\nBạn đã tìm được tất cả các cặp và nhận được **${game.winnings.toLocaleString()}**<a:diamondgem:1402590496647413811>!`)
                        .setColor('#2ecc71');
                    await interaction.editReply({ embeds: [finalEmbed], components: [] });
                }
            } else {
                // Không khớp, lật lại sau 2 giây
                const currentRevealed = [...game.revealed];
                const newRevealed = game.revealed.filter(c =>
                    !(c.row === card.row && c.col === card.col) &&
                    !(c.row === firstCard.row && c.col === firstCard.col)
                );
                game.revealed = newRevealed;
                
                // Hiển thị hai hình trong 2 giây
                const embedShowing = updateEmbed(game);
                embedShowing.setDescription("Không khớp! Vui lòng thử lại.");
                const componentsShowing = createButtons(game.board, currentRevealed);
                await interaction.editReply({ embeds: [embedShowing], components: componentsShowing });
                
                // Lật lại sau 2 giây
                setTimeout(async () => {
                    const finalComponents = createButtons(game.board, game.revealed);
                    const finalEmbed = updateEmbed(game);
                    try {
                        await interaction.editReply({ embeds: [finalEmbed], components: finalComponents });
                    } catch (e) {
                        console.error('Lỗi khi cập nhật tin nhắn:', e);
                    }
                }, 2000);
            }
        }
    }
};
