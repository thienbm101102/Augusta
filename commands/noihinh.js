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
            const emoji = isRevealed ? board[i][j] : '?';
            
            // Chọn màu nút
            let buttonStyle = ButtonStyle.Primary;
            if (isRevealed) {
                // Nếu thẻ đã lật, sử dụng màu xanh lá cây
                buttonStyle = ButtonStyle.Secondary; 
            }

            const button = new ButtonBuilder()
                .setCustomId(`ghepcap-flip-${i}-${j}`)
                .setLabel(emoji)
                .setStyle(buttonStyle)
                .setDisabled(isRevealed);
            row.addComponents(button);
        }
        components.push(row);
    }
    return components;
}

function updateEmbed(game) {
    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('**<a:Verified:1406631971509243974> Nối Hình**')
        .setDescription(
            `Người chơi: **<@${game.originalPlayerId}>**\n` + 
            `Số tiền cược: **${game.bet.toLocaleString()}**<a:diamondgem:1418649012289933434>\n\n` +
            `Bạn có **${TIME_LIMIT_MINUTES} phút** để hoàn thành game!\n\n`
        )
        .addFields(
            { name: 'Số cặp đã tìm thấy:', value: `${game.pairsFound}/${(BOARD_SIZE * BOARD_SIZE) / 2}`, inline: true }
        )
        .setFooter({ text: 'Hãy lật hai tấm thẻ để tìm cặp giống nhau!' });

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ghepcap')
        .setDescription('Bắt đầu một game Nối Hình')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Số tiền bạn muốn đặt cược')
                .setRequired(true)
                .setMinValue(1000)
                .setMaxValue(50000)
            ),

    async execute(interaction) {
        // Khắc phục lỗi: Báo hiệu bot đang xử lý để tránh hết thời gian chờ
        await interaction.deferReply();

        const bet = interaction.options.getInteger('bet');
        const userId = interaction.user.id;
        const userBalance = getBalance(userId);

        if (userBalance < bet) {
            return interaction.editReply({
                content: `Bạn không đủ tiền! Bạn cần **${bet}**<a:diamondgem:1418649012289933434> nhưng chỉ có **${userBalance}**<a:diamondgem:1418649012289933434>.`,
                ephemeral: true
            });
        }
        
        addBalance(userId, -bet);
        const board = createBoard();
        const game = {
            board: board,
            revealed: [],
            pairsFound: 0,
            firstFlip: null,
            player: interaction.user.username,
            bet: bet,
            winnings: bet * 1, // Thưởng gấp đôi tiền cược
            originalPlayerId: userId,
        };

        const embed = updateEmbed(game);
        const components = createButtons(game.board, game.revealed);

        // Sau khi đã defer, dùng editReply để gửi tin nhắn
        const reply = await interaction.editReply({ embeds: [embed], components, fetchReply: true });
        activeGames.set(reply.id, game);

        // Đặt hẹn giờ
        game.timer = setTimeout(async () => {
            if (activeGames.has(reply.id)) {
                activeGames.delete(reply.id);
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#c0392b')
                    .setTitle('**<a:Verified:1406631971509243974> Hết Giờ!**')
                    .setDescription(
                        `Đáng tiếc, **<@${game.originalPlayerId}>** không thể hoàn thành game trong **${TIME_LIMIT_MINUTES} phút**!` +
                        `\n\nBạn đã mất **${game.bet.toLocaleString()}**<a:diamondgem:1418649012289933434>.`
                    );
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        }, TIME_LIMIT_MINUTES * 60 * 1000);
    },

    async handleButton(interaction) {
        await interaction.deferUpdate();
        const userId = interaction.user.id;
        const game = activeGames.get(interaction.message.id);

        if (!game) {
            return interaction.editReply({ content: 'Không có game nào đang diễn ra', components: [] });
        }
        if (userId !== game.originalPlayerId) {
            return interaction.followUp({ content: 'Bạn không phải người bắt đầu game này!', ephemeral: true });
        }

        const [command, action, row, col] = interaction.customId.split('-');
        const card = { row: parseInt(row), col: parseInt(col) };

        if (game.revealed.some(c => c.row === card.row && c.col === card.col)) {
            return;
        }

        // Lật lá bài thứ nhất
        if (!game.firstFlip) {
            game.firstFlip = card;
            game.revealed.push(card);
            const updatedComponents = createButtons(game.board, game.revealed);
            await interaction.editReply({ components: updatedComponents });
            return;
        }

        // Lật lá bài thứ hai
        game.revealed.push(card);
        const updatedComponents = createButtons(game.board, game.revealed);
        await interaction.editReply({ components: updatedComponents });

        const firstCardEmoji = game.board[game.firstFlip.row][game.firstFlip.col];
        const secondCardEmoji = game.board[card.row][card.col];

        // Nếu là một cặp
        if (firstCardEmoji === secondCardEmoji) {
            game.pairsFound++;
            game.firstFlip = null;

            if (game.pairsFound === (BOARD_SIZE * BOARD_SIZE) / 2) {
                // Thắng game
                clearTimeout(game.timer); // Dừng bộ đếm thời gian
                activeGames.delete(interaction.message.id);
                addBalance(userId, game.winnings);
                const finalEmbed = updateEmbed(game)
                    .setDescription(`<a:AbbyHappy:1393909327848538122> Chúc mừng, **<@${game.originalPlayerId}>** đã thắng!\nBạn đã tìm được tất cả các cặp và nhận được **${game.winnings.toLocaleString()}**<a:diamondgem:1418649012289933434>!`)
                    .setColor('#2ecc71');
                await interaction.editReply({ embeds: [finalEmbed], components: [] });
            } else {
                // Tiếp tục
                const newEmbed = updateEmbed(game);
                await interaction.editReply({ embeds: [newEmbed], components: updatedComponents });
            }
        } else {
            // Không phải cặp, lật lại sau 2 giây
            const firstCard = game.firstFlip;
            game.firstFlip = null;
            setTimeout(async () => {
                const newRevealed = game.revealed.filter(c => 
                    !(c.row === card.row && c.col === card.col) &&
                    !(c.row === firstCard.row && c.col === firstCard.col)
                );
                game.revealed = newRevealed;
                const finalComponents = createButtons(game.board, game.revealed);
                await interaction.editReply({ components: finalComponents });
            }, 2000);
        }
    }
};





