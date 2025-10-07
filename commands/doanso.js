const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// --- Cấu hình trò chơi ---
const activeGames = new Map();
const GUESSING_TIME = 60000; // Thời gian đoán (60 giây)
const MAX_NUMBER = 100; // Số lớn nhất có thể đoán

module.exports = {
    data: new SlashCommandBuilder()
        .setName('doanso')
        .setDescription('Bắt đầu một vòng chơi Đoán Số')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Số tiền cược của bạn')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const betAmount = interaction.options.getInteger('bet');
        const channelId = interaction.channel.id;
        // Sửa lỗi: Thêm await trước getBalance
        const userBalance = await getBalance(userId);

        // Nếu đã có game đang hoạt động
        if (activeGames.has(channelId)) {
            const game = activeGames.get(channelId);
            if (game.state === 'guessing') {
                // Người chơi đang tham gia vào game đang chạy
                if (game.players.has(userId)) {
                    return interaction.reply({
                        content: `Bạn đã tham gia vòng chơi này rồi. Hãy đợi kết quả nhé!`,
                        ephemeral: true
                    });
                }
                
                // Kiểm tra đủ tiền để tham gia không
                if (userBalance < betAmount) {
                    return interaction.reply({
                        content: `Bạn không đủ tiền để tham gia vòng này. Cần **${betAmount}**<a:diamondgem:1402590496647413811> nhưng bạn chỉ có **${userBalance.toLocaleString()}**<a:diamondgem:1402590496647413811>.`,
                        ephemeral: true
                    });
                }

                // Sửa lỗi: Thêm await trước addBalance
                await addBalance(userId, -betAmount);
                game.players.set(userId, { bet: betAmount });
                game.pot += betAmount;

                const updatedEmbed = EmbedBuilder.from(game.message.embeds[0])
                    .spliceFields(0, 1, {
                        name: 'Tiền thưởng:',
                        value: `**${game.pot.toLocaleString()}**<a:diamondgem:1402590496647413811>`,
                        inline: true
                    })
                    .spliceFields(1, 1, {
                        name: 'Người chơi:',
                        value: Array.from(game.players.keys()).map(id => `<@${id}>`).join(', '),
                        inline: true
                    });
                
                await game.message.edit({ embeds: [updatedEmbed] });

                return interaction.reply({
                    content: `<a:AbbyCheers:1393909248076943380> Bạn đã tham gia vòng chơi với **${betAmount.toLocaleString()}**<a:diamondgem:1402590496647413811>!`,
                    ephemeral: true
                });
            } else {
                // Nếu game đã kết thúc nhưng vẫn còn trong map
                activeGames.delete(channelId);
                return interaction.reply({ content: 'Đã có lỗi xảy ra. Vui lòng thử lại lệnh `/doanso`', ephemeral: true });
            }
        }

        if (userBalance < betAmount) {
            return interaction.reply({ content: `<a:AbbyCry:1393909295665643540> Bạn không đủ tiền! Bạn cần **${betAmount}**<a:diamondgem:1402590496647413811> nhưng bạn chỉ có **${userBalance.toLocaleString()}**<a:diamondgem:1402590496647413811>.`, ephemeral: true });
        }

        // Sửa lỗi: Thêm await trước addBalance
        await addBalance(userId, -betAmount);
        const targetNumber = Math.floor(Math.random() * MAX_NUMBER) + 1;
        const game = {
            state: 'guessing',
            targetNumber,
            players: new Map([[userId, { bet: betAmount }]]),
            pot: betAmount,
            channelId,
            message: null,
            timeout: null,
        };
        activeGames.set(channelId, game);

        const embed = new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('**<a:Verified:1406631971509243974> Đoán Số May Mắn**')
            .setDescription(`Một số đã được chọn ngẫu nhiên từ **1 đến ${MAX_NUMBER}**.\n\nHãy nhắn tin số mà bạn nghĩ là đúng!`)
            .addFields(
                { name: 'Tiền thưởng:', value: `**${game.pot.toLocaleString()}**<a:diamondgem:1402590496647413811>`, inline: true },
                { name: 'Người chơi:', value: `<@${userId}>`, inline: true }
            )
            .setFooter({ text: 'Bạn có 60 giây để đoán!' });

        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
        game.message = reply;

        game.timeout = setTimeout(async () => {
            if (activeGames.has(channelId)) {
                activeGames.delete(channelId);
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('HẾT GIỜ!')
                    .setDescription(`Không có ai đoán đúng trong thời gian quy định.\nSố may mắn là: **${game.targetNumber}**`);
                await reply.edit({ embeds: [timeoutEmbed] });
            }
        }, GUESSING_TIME);
    },
    
    // Tự động xử lý tin nhắn để đoán số
    async handleMessage(message) {
        if (!activeGames.has(message.channel.id)) return;
        if (message.author.bot) return;

        const guess = parseInt(message.content);
        if (isNaN(guess)) return;

        const game = activeGames.get(message.channel.id);
        const userId = message.author.id;
        
        // Kiểm tra xem người này có tham gia game không
        if (!game.players.has(userId)) return;

        if (guess === game.targetNumber) {
            // Thắng!
            const winner = game.players.get(userId);
            const winnings = game.pot;
            // Sửa lỗi: Thêm await trước addBalance
            await addBalance(userId, winnings); // Cộng tiền
            
            const finalEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('<a:AbbyFlower:1393909312761364541> **Chúc Mừng!** <a:AbbyFlower:1393909312761364541>')
                .setDescription(`**<@${userId}>** đã đoán đúng số **${game.targetNumber}**!\n\nBạn đã thắng **${winnings.toLocaleString()}**<a:diamondgem:1402590496647413811>!`);

            activeGames.delete(message.channel.id);
            clearTimeout(game.timeout);
            await message.channel.send({ embeds: [finalEmbed] });
        } else if (guess < game.targetNumber) {
            await message.reply('Số cần tìm lớn hơn! ⬆️');
        } else {
            await message.reply('Số cần tìm nhỏ hơn! ⬇️');
        }
    }
};

