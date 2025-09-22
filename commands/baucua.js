const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// --- Cấu hình trò chơi ---
// Cấu trúc lại để lưu tên và ID của emoji
const animals = {
    'bau': { name: 'gourd', id: '1412686985063170098', animated: false },
    'cua': { name: '5229crab', id: '1412686982831931415', animated: true },
    'tom': { name: 'empreitadaprojectshrimp', id: '1412686980759945246', animated: true },
    'ca': { name: '47967koifish', id: '1412686973906456658', animated: true },
    'ga': { name: '371590chickenspin', id: '1412686970622054561', animated: true },
    'nai': { name: '32607deerdance', id: '1412686967510143006', animated: true },
};

function getEmojiUrl(animalKey) {
    const emoji = animals[animalKey];
    const extension = emoji.animated ? 'gif' : 'png';
    return `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}`;
}

const bettingTime = 30; // Thời gian đặt cược (giây)

// Lưu trạng thái các game đang diễn ra
const activeGames = new Map();
const playerCurrentBetAmount = new Map(); // Lưu số tiền cược hiện tại của mỗi người chơi

function getBettingButtons(selectedAmount) {
    const amounts = [100, 500, 1000, 5000];
    const components = [];

    // Nút chọn số tiền
    const amountRow = new ActionRowBuilder();
    for (const amount of amounts) {
        amountRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`baucua-amount-${amount}`)
                .setLabel(amount.toLocaleString())
                .setStyle(selectedAmount === amount ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
    }
    components.push(amountRow);

    // Nút đặt cược
    const betRow1 = new ActionRowBuilder();
    const betRow2 = new ActionRowBuilder();
    const animalKeys = Object.keys(animals);
    for (let i = 0; i < animalKeys.length; i++) {
        const animalKey = animalKeys[i];
        const animalEmoji = animals[animalKey];
        const button = new ButtonBuilder()
            .setCustomId(`baucua-bet-${animalKey}`)
            .setEmoji({ name: animalEmoji.name, id: animalEmoji.id, animated: animalEmoji.animated })
            .setStyle(ButtonStyle.Primary);
        if (i < 3) {
            betRow1.addComponents(button);
        } else {
            betRow2.addComponents(button);
        }
    }
    components.push(betRow1, betRow2);

    return components;
}

function createGameEmbed(game, time) {
    let description = `**Thời gian đặt cược còn lại:** ${time} giây\n\n`;
    description += `**Tiền cược của người chơi:**\n`;
    const betsByPlayer = new Map();
    for (const [userId, userBets] of game.bets.entries()) {
        const userTag = `<@${userId}>`;
        let betString = '';
        let totalBet = 0;
        for (const [animalKey, amount] of userBets.entries()) {
            // Sử dụng emoji đúng cách
            betString += ` <${animals[animalKey].animated ? 'a' : ''}:${animals[animalKey].name}:${animals[animalKey].id}> **${amount.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
            totalBet += amount;
        }
        betsByPlayer.set(userTag, { string: betString, total: totalBet });
    }

    if (betsByPlayer.size === 0) {
        description += 'Chưa có ai đặt cược!';
    } else {
        const sortedPlayers = [...betsByPlayer.entries()].sort((a, b) => b[1].total - a[1].total);
        for (const [userTag, data] of sortedPlayers) {
            description += `${userTag} đã cược: ${data.string}\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('<a:Verified:1406631971509243974> **Bầu Cua Cùng Augusta**')
        .setDescription(description)
        .setFooter({ text: 'Nhấp vào nút để chọn số tiền và đặt cược!' });

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('baucua')
        .setDescription('Bắt đầu một ván bầu cua mới, mọi người có 30 giây để đặt cược.'),

    async execute(interaction) {
        // Khắc phục lỗi: Báo hiệu bot đang xử lý để tránh hết thời gian chờ
        await interaction.deferReply();

        // Kiểm tra xem đã có game đang diễn ra trong kênh chưa
        if (activeGames.has(interaction.channelId)) {
            return interaction.editReply({ content: 'Đã có một ván Bầu Cua đang diễn ra trong kênh này!', ephemeral: true });
        }

        const game = {
            bets: new Map(),
            state: 'betting',
            timer: null,
            bettingTimeLeft: bettingTime,
            messageId: null,
            channelId: interaction.channelId
        };
        activeGames.set(interaction.channelId, game);

        const embed = createGameEmbed(game, game.bettingTimeLeft);
        const components = getBettingButtons(0);

        const reply = await interaction.editReply({ embeds: [embed], components, fetchReply: true });
        game.messageId = reply.id;

        // Bắt đầu đếm ngược
        const countdownInterval = setInterval(async () => {
            game.bettingTimeLeft--;
            if (game.bettingTimeLeft >= 0) {
                const updatedEmbed = createGameEmbed(game, game.bettingTimeLeft);
                await interaction.editReply({ embeds: [updatedEmbed] }).catch(() => {});
            } else {
                clearInterval(countdownInterval);
                this.endBettingPhase(interaction, game);
            }
        }, 1000);
    },

    async endBettingPhase(interaction, game) {
        // Đổi trạng thái và vô hiệu hóa nút
        game.state = 'rolling';
        const disabledButtons = getBettingButtons(0).map(row => {
            row.components.forEach(button => button.setDisabled(true));
            return row;
        });

        // Vô hiệu hóa các nút của tin nhắn gốc
        await interaction.editReply({ components: disabledButtons });

        // Tung xúc xắc
        const diceResults = [
            Object.keys(animals)[Math.floor(Math.random() * 6)],
            Object.keys(animals)[Math.floor(Math.random() * 6)],
            Object.keys(animals)[Math.floor(Math.random() * 6)]
        ];

        // Tạo chuỗi emoji để gửi trong tin nhắn riêng
        const dice1 = `<${animals[diceResults[0]].animated ? 'a' : ''}:${animals[diceResults[0]].name}:${animals[diceResults[0]].id}>`;
        const dice2 = `<${animals[diceResults[1]].animated ? 'a' : ''}:${animals[diceResults[1]].name}:${animals[diceResults[1]].id}>`;
        const dice3 = `<${animals[diceResults[2]].animated ? 'a' : ''}:${animals[diceResults[2]].name}:${animals[diceResults[2]].id}>`;

        let winners = new Map();
        let losers = new Map();
        
        // Xử lý tiền cược và tính toán thắng/thua
        for (const [userId, userBets] of game.bets.entries()) {
            let totalWinnings = 0;
            let totalLosses = 0;

            for (const [animal, amount] of userBets.entries()) {
                const matches = diceResults.filter(result => result === animal).length;
                if (matches > 0) {
                    // Logic tính tiền thắng: amount * số lần xuất hiện
                    const winnings = amount * matches;
                    totalWinnings += winnings;
                } else {
                    // Logic tính tiền thua: amount * 1
                    totalLosses += amount;
                }
            }
            
            const netResult = totalWinnings - totalLosses;
            if (netResult > 0) {
                winners.set(userId, netResult);
            } else {
                losers.set(userId, netResult);
            }
            // Sửa lỗi: Thêm await trước addBalance
            await addBalance(userId, netResult);
        }
        
        let winnerString = `**Thắng:**\n`;
        if (winners.size > 0) {
            const winnerPhrases = [
                'quá đỉnh!',
                'thật may mắn!',
                'kiếm tiền siêu nhanh!',
                'may mắn quá trời!',
                'trúng đậm rồi!'
            ];
            winnerString += [...winners.entries()].map(([userId, amount]) => `<@${userId}>: Nhận **${amount.toLocaleString()}**<a:diamondgem:1402590496647413811> ${winnerPhrases[Math.floor(Math.random() * winnerPhrases.length)]}`).join('\n');
        } else {
            winnerString += 'Không có ai';
        }

        let loserString = `\n\n**Thua:**\n`;
        if (losers.size > 0) {
            const loserPhrases = [
                'chia buồn cùng bạn',
                'lần sau nhất định phải thắng',
                'thật tiếc quá',
                'mất tiền rồi, huhu',
                'cần buff thêm động lực để gỡ lại'
            ];
            loserString += [...losers.entries()].map(([userId, amount]) => `<@${userId}>: **${Math.abs(amount).toLocaleString()}**<a:diamondgem:1402590496647413811> ${loserPhrases[Math.floor(Math.random() * loserPhrases.length)]}`).join('\n');
        } else {
            loserString += 'Không có ai';
        }

        // Gửi tin nhắn mới để hiển thị kết quả
        const resultMessage = await interaction.followUp({ content: 'Đang lắc xúc xắc...' });

        // Cập nhật tin nhắn để hiển thị từng emoji
        await new Promise(resolve => setTimeout(resolve, 1000));
        await resultMessage.edit({ content: `${dice1}` });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await resultMessage.edit({ content: `${dice1} ${dice2}` });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await resultMessage.edit({ content: `${dice1} ${dice2} ${dice3}` });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Gửi tin nhắn thứ hai chứa danh sách người thắng và thua
        await interaction.followUp({ content: winnerString + loserString });
        
        activeGames.delete(interaction.channelId);
    },

    async handleButton(interaction) {
        await interaction.deferUpdate();
        const [command, action, value] = interaction.customId.split('-');
        const userId = interaction.user.id;
        const game = activeGames.get(interaction.channelId);

        if (!game || game.state !== 'betting') {
            return interaction.followUp({ content: 'Đã hết thời gian đặt cược hoặc không có ván đấu nào đang diễn ra.', ephemeral: true });
        }

        // Sửa lỗi: Thêm await trước getBalance
        const userBalance = await getBalance(userId);

        if (action === 'amount') {
            const amount = parseInt(value);
            playerCurrentBetAmount.set(userId, amount);
            await interaction.followUp({ content: `Bạn đã chọn cược **${amount.toLocaleString()}**<a:diamondgem:1402590496647413811>. Bây giờ hãy chọn linh vật.`, ephemeral: true });
            return;
        }

        if (action === 'bet') {
            const betAmount = playerCurrentBetAmount.get(userId) || 100; // Mặc định 100 nếu chưa chọn
            const animal = value;

            if (userBalance < betAmount) {
                return interaction.followUp({ content: `Bạn không đủ **${betAmount}**<a:diamondgem:1402590496647413811> để cược.`, ephemeral: true });
            }

            // Ghi nhận cược
            if (!game.bets.has(userId)) {
                game.bets.set(userId, new Map());
            }
            const userBets = game.bets.get(userId);
            const currentBetOnAnimal = userBets.get(animal) || 0;

            userBets.set(animal, currentBetOnAnimal + betAmount);

            // Cập nhật embed
            const updatedEmbed = createGameEmbed(game, game.bettingTimeLeft);
            await interaction.editReply({ embeds: [updatedEmbed] });
        }
    },
};
