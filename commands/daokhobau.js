const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// --- Cấu hình trò chơi ---
const BOARD_SIZE = 5; // Kích thước bàn cờ (BOARD_SIZE x BOARD_SIZE)
const DIG_LIMIT = 5; // Số lượt đào tối đa ban đầu
const activeGames = new Map();

// Cấu hình vật phẩm và xác suất
const ITEMS = {
    TREASURE: { emoji: '<a:treasure_chest:1412753651855921162>', value: (bet) => bet * BOARD_SIZE * 1, type: 'treasure' },
    DIAMOND: { emoji: '💎', value: (bet) => bet * 2, type: 'diamond' },
    MONEY_BAG: { emoji: '🪙', value: (bet) => bet * 0.5, type: 'money' },
    BOMB: { emoji: '💣', value: (bet) => -bet, type: 'bomb' },
    SPIKES: { emoji: '💥', value: (bet) => -bet * 2, type: 'spikes' },
    PICKAXE: { emoji: '⛏️', value: 0, type: 'pickaxe' },
    EMPTY: { emoji: '🐜', value: 0, type: 'empty' }
};

const ITEM_PROBABILITIES = [
    { type: 'TREASURE', probability: 0.0001 },
    { type: 'DIAMOND', probability: 0.05 },
    { type: 'MONEY_BAG', probability: 0.1 },
    { type: 'PICKAXE', probability: 0.1 },
    { type: 'BOMB', probability: 0.1 },
    { type: 'SPIKES', probability: 0.05 },
    { type: 'EMPTY', probability: 0.5999 }
];

function getRandomItem() {
    const rand = Math.random();
    let cumulativeProbability = 0;
    for (const item of ITEM_PROBABILITIES) {
        cumulativeProbability += item.probability;
        if (rand < cumulativeProbability) {
            return ITEMS[item.type];
        }
    }
    return ITEMS.EMPTY; // Trường hợp mặc định
}

function createBoard() {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    
    // Đảm bảo luôn có kho báu
    const treasureRow = Math.floor(Math.random() * BOARD_SIZE);
    const treasureCol = Math.floor(Math.random() * BOARD_SIZE);

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (i === treasureRow && j === treasureCol) {
                board[i][j] = ITEMS.TREASURE;
            } else {
                board[i][j] = getRandomItem();
            }
        }
    }

    return board;
}

function createButtons(game) {
    const components = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < BOARD_SIZE; j++) {
            const isRevealed = game.revealed.some(card => card.row === i && card.col === j);
            const item = game.board[i][j];
            const button = new ButtonBuilder()
                .setCustomId(`daokhobau-dig-${i}-${j}`)
                .setLabel(isRevealed && item.type !== 'treasure' ? item.emoji : '\u200B')
                .setStyle(isRevealed ? (item.type === 'treasure' ? ButtonStyle.Success : ButtonStyle.Secondary) : ButtonStyle.Primary)
                .setDisabled(isRevealed || game.state !== 'playing');
            row.addComponents(button);
        }
        components.push(row);
    }
    return components;
}

function updateEmbed(game) {
    let description = `**Số lượt đào còn lại:** ${game.digsLeft}\n\n`;
    description += `**Số tiền cược:** ${game.bet.toLocaleString()} <a:diamondgem:1418649012289933434>\n`;
    
    if (game.state === 'playing') {
        description += `Hãy nhấn vào ô bạn muốn đào!`;
    } else if (game.state === 'won') {
        description += `**Chúc mừng!** Bạn đã tìm thấy kho báu! ${ITEMS.TREASURE.emoji}`;
    } else if (game.state === 'lost-bomb') {
        description += `Bạn đã đào trúng một quả bom! Game đã kết thúc <a:AbbyShocked:1393909368138895411>`;
    } else if (game.state === 'lost-spikes') {
        description += `Bạn đã đào trúng thuốc nổ! Game đã kết thúc <a:AbbyShocked:1393909368138895411>`;
    } else {
        description += `Hết lượt đào! Không tìm thấy kho báu <a:AbbyShocked:1393909368138895411>`;
    }

    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('<a:VerifiedTwitter:1418649004912148511> **Đào Kho Báu**')
        .setDescription(description);

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daokhobau')
        .setDescription('Bắt đầu một game đào kho báu')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Số tiền bạn muốn cược để đào kho báu')
                .setRequired(true)
                .setMinValue(1000)
                .setMaxValue(50000)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        
        if (activeGames.has(interaction.user.id)) {
            return interaction.editReply({ content: 'Bạn đã có một game đang diễn ra. Hãy hoàn thành nó trước!', ephemeral: true });
        }
        
        const betAmount = interaction.options.getInteger('bet');
        const userBalance = await getBalance(interaction.user.id);
        
        if (userBalance < betAmount) {
            return interaction.editReply({ content: `Bạn không có đủ **${betAmount.toLocaleString()}**<a:diamondgem:1418649012289933434> để cược.`, ephemeral: true });
        }
        
        await addBalance(interaction.user.id, -betAmount);

        const game = {
            state: 'playing',
            bet: betAmount,
            digsLeft: DIG_LIMIT,
            board: createBoard(),
            revealed: [],
            messageId: null
        };
        activeGames.set(interaction.user.id, game);

        const embed = updateEmbed(game);
        const components = createButtons(game);
        
        const reply = await interaction.editReply({ embeds: [embed], components, fetchReply: true });
        game.messageId = reply.id;
    },

    async handleButton(interaction) {
        const game = activeGames.get(interaction.user.id);

        if (!game || interaction.message.id !== game.messageId) {
            return interaction.reply({ content: 'Không có game nào của bạn đang diễn ra', ephemeral: true });
        }
        
        if (game.state !== 'playing') {
            return interaction.reply({ content: 'Game đã kết thúc!', ephemeral: true });
        }
        
        const [command, action, row, col] = interaction.customId.split('-');
        const card = { row: parseInt(row), col: parseInt(col) };
        
        if (game.revealed.some(c => c.row === card.row && c.col === card.col)) {
            return interaction.deferUpdate();
        }

        game.revealed.push(card);
        const item = game.board[card.row][card.col];
        
        let messageToUser = `Bạn đã đào trúng **${item.emoji}**`;

        // === Xử lý từng loại vật phẩm mới ===
        if (item.type === 'treasure') {
            game.state = 'won';
            const winnings = item.value(game.bet);
            await addBalance(interaction.user.id, winnings);
            
            const updatedEmbed = updateEmbed(game);
            updatedEmbed.setDescription(`<a:AbbyHappy:1393909327848538122> **Chúc mừng!** Bạn đã tìm thấy kho báu ${item.emoji} và nhận được **${winnings.toLocaleString()}**<a:diamondgem:1418649012289933434>`);

            const updatedComponents = createButtons(game);
            updatedComponents.forEach(row => row.components.forEach(button => button.setDisabled(true)));
            
            await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
            activeGames.delete(interaction.user.id);
        } else if (item.type === 'diamond') {
            const winnings = item.value(game.bet);
            await addBalance(interaction.user.id, winnings);
            
            const updatedEmbed = updateEmbed(game);
            updatedEmbed.setDescription(`${messageToUser} và nhận được **${winnings.toLocaleString()}**<a:diamondgem:1418649012289933434>.\n\nTiếp tục đào nào!`);
            const updatedComponents = createButtons(game);
            await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
        } else if (item.type === 'money') {
            const winnings = item.value(game.bet);
            await addBalance(interaction.user.id, winnings);
            
            const updatedEmbed = updateEmbed(game);
            updatedEmbed.setDescription(`${messageToUser} và nhận được **${winnings.toLocaleString()}**<a:diamondgem:1418649012289933434>.\n\nTiếp tục đào nào!`);
            const updatedComponents = createButtons(game);
            await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
        } else if (item.type === 'pickaxe') {
            game.digsLeft++;
            const updatedEmbed = updateEmbed(game);
            updatedEmbed.setDescription(`${messageToUser}! Bạn có thêm một lượt đào!\n\nSố lượt đào còn lại: **${game.digsLeft}**`);
            const updatedComponents = createButtons(game);
            await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
        } else if (item.type === 'bomb' || item.type === 'spikes') {
            game.state = item.type === 'bomb' ? 'lost-bomb' : 'lost-spikes';
            const losses = item.value(game.bet);
            await addBalance(interaction.user.id, losses);
            
            const updatedEmbed = updateEmbed(game);
            updatedEmbed.setDescription(`${messageToUser}! Bạn mất **${Math.abs(losses).toLocaleString()}**<a:diamondgem:1418649012289933434>. Game đã kết thúc`);
            
            const updatedComponents = createButtons(game);
            updatedComponents.forEach(row => row.components.forEach(button => button.setDisabled(true)));

            await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
            activeGames.delete(interaction.user.id);
        } else { // Empty
            game.digsLeft--;
            if (game.digsLeft <= 0) {
                game.state = 'lost';
                const updatedEmbed = updateEmbed(game);
                updatedEmbed.setDescription(`Hết lượt đào! Bạn đã thua và mất **${game.bet.toLocaleString()}**<a:diamondgem:1418649012289933434>`);
                const updatedComponents = createButtons(game);
                updatedComponents.forEach(row => row.components.forEach(button => button.setDisabled(true)));
                await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
                activeGames.delete(interaction.user.id);
            } else {
                const updatedEmbed = updateEmbed(game);
                updatedEmbed.setDescription(`${messageToUser} và không có gì xảy ra. Tiếp tục đào thôi nào!`);
                const updatedComponents = createButtons(game);
                await interaction.update({ embeds: [updatedEmbed], components: updatedComponents });
            }
        }
    }
};



