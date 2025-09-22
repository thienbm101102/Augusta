const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// --- Cấu hình trò chơi ---
const HORSES = ['<:87484pinkhorse:1413162074938277888>', '🐎', '🏇', '<a:51622unicornmagic:1413162071897669652>', '🦄'];
const HORSE_NAMES = ['Tia Chớp', 'Ngàn Cân', 'Lửa Đỏ', 'Sao Băng', 'Thần Gió'];
const activeGames = new Map();
const BET_OPTIONS = [500, 1000, 2000, 5000, 10000]; // Số tiền cược
const RACE_LENGTH = 15; // Chiều dài đường đua

// Tỷ lệ cược cơ bản, có thể chỉnh sửa
const ODDS = {
    'Tia Chớp': 1.8,
    'Ngàn Cân': 2.5,
    'Lửa Đỏ': 3.0,
    'Sao Băng': 2.2,
    'Thần Gió': 1.9,
};

// Lớp game để quản lý trạng thái
class HorseRacingGame {
    constructor(interaction, betTime = 30) {
        this.channelId = interaction.channel.id;
        this.gameMessage = null;
        this.state = 'betting';
        this.bets = new Map();
        this.betTime = betTime;
        this.countdownInterval = null;
        this.raceInterval = null;
        this.positions = HORSES.map(() => 0);
    }

    async init(interaction) {
        const embed = this.createBettingEmbed();
        const components = this.createBettingComponents();
        
        this.gameMessage = await interaction.reply({ embeds: [embed], components, fetchReply: true });
        this.startCountdown();
    }

    createBettingEmbed(timeLeft) {
        const pot = Array.from(this.bets.values()).reduce((sum, bet) => sum + (bet.amount || 0), 0);
        const allBets = Array.from(this.bets.entries())
            .filter(([_, bet]) => bet.horseIndex !== null && bet.amount !== null)
            .map(([userId, bet]) => `<@${userId}> đã cược **${bet.amount.toLocaleString()}**<a:diamondgem:1402590496647413811> vào **${HORSE_NAMES[bet.horseIndex]}**`)
            .join('\n') || 'Chưa có ai đặt cược';

        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('**<a:Verified:1406631971509243974> Cuộc Đua Ngựa Sắp Bắt Đầu!**')
            .setDescription('Hãy chọn con ngựa bạn muốn cược và số tiền của bạn.')
            .addFields(
                {
                    name: 'Tỷ lệ cược:',
                    value: HORSE_NAMES.map(name => `${HORSES[HORSE_NAMES.indexOf(name)]} **${name}**: \`x${ODDS[name]}\``).join('\n'),
                    inline: false
                },
                {
                    name: 'Tổng tiền cược',
                    value: `\`${pot.toLocaleString()}\`<a:diamondgem:1402590496647413811>`,
                    inline: false
                },
                {
                    name: 'Những người đã cược',
                    value: allBets,
                    inline: false
                }
            )
            .setFooter({ text: `Thời gian đặt cược: ${timeLeft ?? this.betTime} giây` });
        return embed;
    }

    createBettingComponents() {
        const horseButtons = new ActionRowBuilder().addComponents(
            ...HORSE_NAMES.map((name, index) => new ButtonBuilder()
                .setCustomId(`duangua_bet_${index}`)
                .setLabel(`${name}`)
                .setStyle(ButtonStyle.Secondary)
            )
        );
        const betButtons = new ActionRowBuilder().addComponents(
            ...BET_OPTIONS.map(bet => new ButtonBuilder()
                .setCustomId(`duangua_amount_${bet}`)
                .setLabel(`${bet.toLocaleString()}`)
                .setStyle(ButtonStyle.Primary)
            )
        );
        return [horseButtons, betButtons];
    }

    async startCountdown() {
        this.countdownInterval = setInterval(async () => {
            this.betTime--;
            if (this.betTime <= 0) {
                clearInterval(this.countdownInterval);
                this.startRace();
            } else {
                const updatedEmbed = this.createBettingEmbed(this.betTime);
                await this.gameMessage.edit({ embeds: [updatedEmbed] }).catch(() => {});
            }
        }, 1000);
    }

    async handleBet(interaction) {
        const [_, type, value] = interaction.customId.split('_');
        const userId = interaction.user.id;
        let userBet = this.bets.get(userId) || { horseIndex: null, amount: null };

        if (type === 'bet') {
            userBet.horseIndex = parseInt(value);
        } else if (type === 'amount') {
            userBet.amount = parseInt(value);
        }

        if (userBet.amount > await getBalance(userId)) {
             return interaction.reply({
                content: 'Bạn không đủ tiền để đặt cược số tiền này!',
                ephemeral: true
            });
        }
        
        this.bets.set(userId, userBet);
        
        const updatedEmbed = this.createBettingEmbed(this.betTime);
        await interaction.update({ embeds: [updatedEmbed] });
    }
    
    async startRace() {
        this.state = 'racing';

        const horseButtons = this.createBettingComponents()[0].setComponents(
            ...this.createBettingComponents()[0].components.map(btn => btn.setDisabled(true))
        );
        const betButtons = this.createBettingComponents()[1].setComponents(
            ...this.createBettingComponents()[1].components.map(btn => btn.setDisabled(true))
        );

        const racingEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('**<a:Verified:1406631971509243974> Cuộc Đua Bắt Đầu!**')
            .setDescription(`Đường đua dài **${RACE_LENGTH}** bước!`)
            .addFields(
                { name: 'Đường đua:', value: this.getRaceTrack(), inline: false }
            );

        await this.gameMessage.edit({ embeds: [racingEmbed], components: [horseButtons, betButtons] });

        this.raceInterval = setInterval(async () => {
            let winnerIndex = -1;
            for (let i = 0; i < this.positions.length; i++) {
                this.positions[i] += Math.random() * 2;
                if (this.positions[i] >= RACE_LENGTH) {
                    winnerIndex = i;
                    break;
                }
            }

            const currentRaceEmbed = new EmbedBuilder(racingEmbed.toJSON())
                .spliceFields(0, 1, { name: 'Đường đua:', value: this.getRaceTrack(), inline: false });

            await this.gameMessage.edit({ embeds: [currentRaceEmbed] });

            if (winnerIndex !== -1) {
                clearInterval(this.raceInterval);
                this.endRace(winnerIndex);
            }
        }, 1000);
    }
    
    getRaceTrack() {
        return this.positions.map((pos, index) => {
            const spaces = Math.min(Math.round(pos), RACE_LENGTH);
            return '—'.repeat(spaces) + HORSES[index] + '—'.repeat(RACE_LENGTH - spaces);
        }).join('\n');
    }

    async endRace(winnerIndex) {
        this.state = 'ended';
        activeGames.delete(this.channelId);

        const winnerName = HORSE_NAMES[winnerIndex];
        const winnerEmoji = HORSES[winnerIndex];
        const winningOdds = ODDS[winnerName];

        const winners = [];
        let totalWinnings = 0;
        
        for (const [userId, bet] of this.bets.entries()) {
            // Trừ tiền cược của tất cả người chơi
            if (bet.amount) {
                await addBalance(userId, -bet.amount);
            }

            if (bet.horseIndex === winnerIndex) {
                const winnings = Math.floor(bet.amount * winningOdds);
                await addBalance(userId, winnings); // Cộng tiền thắng (tiền cược + lãi)
                winners.push(`<@${userId}> (Thắng: ${winnings.toLocaleString()}<a:diamondgem:1402590496647413811>)`);
                totalWinnings += winnings;
            }
        }

        const finalEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('**<a:Verified:1406631971509243974> Kết Quả Cuộc Đua**')
            .setDescription(`Ngựa chiến thắng là: **${winnerEmoji} ${winnerName}**!`)
            .addFields(
                { name: 'Tổng tiền thưởng', value: `${totalWinnings.toLocaleString()}<a:diamondgem:1402590496647413811>`, inline: false },
                { name: 'Người thắng', value: winners.length > 0 ? winners.join('\n') : 'Không có ai cả!', inline: false }
            )
            .setFooter({ text: 'Chúc bạn may mắn lần sau!' });

        await this.gameMessage.channel.send({ embeds: [finalEmbed] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duangua')
        .setDescription('Đặt cược và xem cuộc đua ngựa đầy kịch tính!'),

    async execute(interaction) {
        if (activeGames.has(interaction.channel.id)) {
            return interaction.reply({
                content: 'Một trận đua ngựa đang diễn ra. Vui lòng chờ đến khi kết thúc!',
                ephemeral: true
            });
        }
        const game = new HorseRacingGame(interaction);
        activeGames.set(interaction.channel.id, game);
        game.init(interaction);
    },

    async handleButton(interaction) {
        const [_, type, value] = interaction.customId.split('_');
        const channelId = interaction.channel.id;
        const game = activeGames.get(channelId);

        if (!game || game.state !== 'betting') {
            return interaction.reply({ content: 'Không có trận đua ngựa nào đang diễn ra để đặt cược!', ephemeral: true });
        }
        
        await game.handleBet(interaction);
    }
};
