const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// Danh sách các biểu tượng và tỷ lệ thắng tương ứng
const symbols = ['🍒', '🍋', '🍇', '🌽', '🍉','🍓', '🍊', '🍏', '🍌'];
const odds = {
    '🍉🍉🍉': 30,
    '🌽🌽🌽': 20,
    '🍇🍇🍇': 15,
    '🍋🍋🍋': 10,
    '🍓🍓🍓': 9,
    '🍊🍊🍊': 8,
    '🍏🍏🍏': 7,
    '🍌🍌🍌': 6,
    '🍒🍒🍒': 5,
    '🍉🍉': 5,
    '🌽🌽': 4.5,
    '🍇🍇': 4,
    '🍋🍋': 3.5,
    '🍓🍓': 3,
    '🍊🍊': 2.5,
    '🍏🍏': 2,
    '🍌🍌': 1.5,
    '🍒🍒': 1,
    '🍒': 0.5
};

// Hàm quay máy xèng
const spin = () => {
    const reel = [];
    for (let i = 0; i < 3; i++) {
        reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    return reel;
};

// Hàm tính toán tiền thắng
const getWinnings = (reel, bet) => {
    const [s1, s2, s3] = reel;
    const allSymbols = reel.join('');

    // Kiểm tra 3 biểu tượng giống nhau
    if (s1 === s2 && s2 === s3) {
        if (odds[s1.repeat(3)]) return odds[s1.repeat(3)] * bet;
    }
    // Kiểm tra 2 biểu tượng giống nhau
    if (s1 === s2 && s2 !== s3) {
        if (odds[s1.repeat(2)]) return odds[s1.repeat(2)] * bet;
    }
    if (s2 === s3 && s2 !== s1) {
        if (odds[s2.repeat(2)]) return odds[s2.repeat(2)] * bet;
    }
    if (s1 === s3 && s1 !== s2) {
        if (odds[s1.repeat(2)]) return odds[s1.repeat(2)] * bet;
    }

    // Kiểm tra 1 biểu tượng cherry
    if (allSymbols.includes('🍒')) {
        return odds['🍒'] * bet;
    }

    return 0; // Không thắng
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quay')
        .setDescription('Bắt đầu chơi Trái Cây May Mắn')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Số tiền bạn muốn đặt cược')
                .setRequired(true)
                .setMinValue(1000)
                .setMaxValue(50000)
            ),

    async execute(interaction) {
        await interaction.deferReply();
        const bet = interaction.options.getInteger('bet');
        const userBalance = await getBalance(interaction.user.id);

        if (userBalance < bet) {
            return interaction.editReply({
                content: `<a:AbbyShocked:1393909368138895411> Bạn không đủ <a:diamondgem:1418649012289933434> để đặt **${bet}**! Số dư của bạn là **${userBalance}**<a:diamondgem:1418649012289933434>`,
                ephemeral: true
            });
        }
        
        // Trừ tiền cược ngay lập tức
        await addBalance(interaction.user.id, -bet);
        const spinning = '❓';
        const initialReel = `${spinning} ${spinning} ${spinning}`;
        const initialEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('<a:mariospin:1411006690815643780> Trái Cây May Mắn <a:mariospin:1411006690815643780>')
            .setDescription('**Đang quay...**')
            .addFields(
                { name: 'Ô số 1:', value: `\`\`\`\n${initialReel}\n\`\`\`` },
                { name: 'Bạn đặt:', value: `${bet.toLocaleString()}<a:diamondgem:1418649012289933434>`, inline: true },
            )
            .setFooter({ text: `Người chơi: ${interaction.member.displayName}` });

        // Gửi tin nhắn ban đầu với hiệu ứng quay
        await interaction.editReply({ embeds: [initialEmbed] });

        // Quay ngẫu nhiên và tính toán kết quả cuối cùng
        const finalReel = spin();
        const winnings = getWinnings(finalReel, bet);
        
        // Hiển thị từng biểu tượng một
        for (let i = 0; i < finalReel.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Chờ 0.5 giây
            
            let currentReel = '';
            for (let j = 0; j <= i; j++) {
                currentReel += `${finalReel[j]} `;
            }
            for (let j = i + 1; j < finalReel.length; j++) {
                currentReel += `${spinning} `;
            }
            
            const spinningEmbed = new EmbedBuilder(initialEmbed.toJSON())
                .setFields(
                    { name: 'Ô số 2:', value: `\`\`\`\n${currentReel.trim()}\n\`\`\`` },
                    { name: 'Bạn đặt:', value: `${bet.toLocaleString()}<a:diamondgem:1418649012289933434>`, inline: true },
                );

            await interaction.editReply({ embeds: [spinningEmbed] });
        }

        // Chờ thêm một chút trước khi hiển thị kết quả cuối cùng
        await new Promise(resolve => setTimeout(resolve, 500));

        // Cập nhật số dư cuối cùng và hiển thị tin nhắn kết quả
        await addBalance(interaction.user.id, winnings);
        const newBalance = await getBalance(interaction.user.id);

        // Tạo chuỗi bảng tỷ lệ thắng
        let oddsTable = '';
        for (const [combo, mult] of Object.entries(odds)) {
            oddsTable += `\`${combo}\`: x${mult} <a:diamondgem:1418649012289933434> đặt\n`;
        }

        const resultMessage = winnings > 0 ? `Chúc mừng, bạn đã thắng` : 'Chúc bạn may mắn lần sau!';
        
        const finalEmbed = new EmbedBuilder()
            .setColor(winnings > 0 ? '#00ff00' : '#ff0000')
            .setTitle('<a:mariospin:1411006690815643780> Trái Cây May Mắn <a:mariospin:1411006690815643780>')
            .setDescription('**Bạn Đã Quay Được**')
            .addFields(
                { name: 'Kết Quả:', value: `\`\`\`\n${finalReel.join(' ')}\n\`\`\`` },
                { name: 'Bạn đặt:', value: `${bet.toLocaleString()}<a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Thu về:', value: `${winnings.toLocaleString()}<a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Số dư mới:', value: `${newBalance.toLocaleString()}<a:diamondgem:1418649012289933434>`, inline: true },
                /*{ name: 'Bảng Tỷ Lệ Thắng', value: oddsTable },*/
            )
            .setFooter({ text: `${resultMessage} | Người chơi: ${interaction.member.displayName}` });

        await interaction.editReply({ embeds: [finalEmbed] });
    },
};

