const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// Danh sách các vật phẩm có thể câu được và hệ số nhân của chúng
const lootTable = [
    { name: 'Rác thải', multiplier: -1, weight: 50, emoji: '<:4661_trash:1412876576475054241>' },
    { name: 'Giày rách', multiplier: -1, weight: 40, emoji: '👞' },
    { name: 'Cá Trích', multiplier: 0.5, weight: 60, emoji: '🐟' },
    { name: 'Mực Biển', multiplier: 1, weight: 25, emoji: '<a:93381squidswims:1412879487686938794>' },
    { name: 'Cá Ngựa', multiplier: 1.5, weight: 20, emoji: '<a:36680seahorse:1412879490744451103>' },
    { name: 'Cá Hồi', multiplier: 2, weight: 15, emoji: '🍣' },
    { name: 'Sứa Biển', multiplier: 2, weight: 10, emoji: '<a:1707jellyfish:1412877825178079252>' },
    { name: 'Cá Vàng', multiplier: 3, weight: 10, emoji: '<:57551goldenkoi:1412510566517309470>' },
    { name: 'Ngọc Trai', multiplier: 5, weight: 5, emoji: '<a:95202clamwithpearl:1412881368526098635>' },
    { name: 'Kho Báu Biển Sâu', multiplier: 10, weight: 4, emoji: '<a:treasure_chest:1412753651855921162>' },
    { name: 'Cá Heo', multiplier: 10, weight: 3, emoji: '<:57720dolphin:1412879493353308200>' },
    { name: 'Cá Voi', multiplier: 20, weight: 2, emoji: '🐳' },
    { name: 'Thủy Quái Kraken', multiplier: 30, weight: 1, emoji: '🦑' },
];

function getRandomLoot() {
    let totalWeight = lootTable.reduce((sum, item) => sum + item.weight, 0);
    let randomNum = Math.random() * totalWeight;

    for (const item of lootTable) {
        if (randomNum < item.weight) {
            return item;
        }
        randomNum -= item.weight;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cauca')
        .setDescription('Bắt đầu đi câu cá thôiiii')
        .addIntegerOption(option =>
            option.setName('bait')
                .setDescription('Số tiền mồi bạn muốn bỏ ra')
                .setRequired(true)
                .setMinValue(1000)
                .setMaxValue(50000)
        ),

    async execute(interaction) {
        const baitCost = interaction.options.getInteger('bait');
        const userBalance = getBalance(interaction.user.id);

        if (userBalance < baitCost) {
            return interaction.reply({
                content: `🎣 Bạn không đủ tiền mồi! Bạn cần **${baitCost}**<a:diamondgem:1402590496647413811> nhưng chỉ có **${userBalance}**<a:diamondgem:1402590496647413811>.`,
                ephemeral: true
            });
        }
        
        // Trừ tiền mồi ngay lập tức
        addBalance(interaction.user.id, -baitCost);
        
        const initialEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('<:fishing:1412513704989429760> Đang Câu Cá ...')
            .setDescription('**Bạn đang kiên nhẫn chờ đợi, có thứ gì đó đang cắn câu!**\n\n')
            .setFooter({ text: `Người câu: ${interaction.member.displayName}` });

        await interaction.reply({ embeds: [initialEmbed] });

        // Tạo hiệu ứng chờ
        await new Promise(resolve => setTimeout(resolve, 3000));

        const loot = getRandomLoot();
        const winnings = baitCost * loot.multiplier;
        addBalance(interaction.user.id, winnings);
        const newBalance = getBalance(interaction.user.id);

        let resultMessage;
        let finalColor;

        if (loot.multiplier > 5) {
            resultMessage = `<a:AbbyHappy:1393909327848538122> **Sự xuất hiện của ${loot.name} đã làm cả vùng biển dậy sóng! Bạn đã câu được vật phẩm Huyền Thoại!**`;
            finalColor = '#FFD700'; // Vàng
        } else if (loot.multiplier > 0) {
            resultMessage = `<a:AbbyFlower:1393909312761364541> **Từ dưới đáy biển, bạn kéo cần lên và nhận được:**`;
            finalColor = '#2ECC71'; // Xanh lá
        } else {
            resultMessage = `<a:AbbyShocked:1393909368138895411> **Ôi không, có vẻ hôm nay không phải ngày may mắn của bạn...**`;
            finalColor = '#E74C3C'; // Đỏ
        }

        const finalEmbed = new EmbedBuilder()
            .setColor(finalColor)
            .setTitle('**<:fishing:1412513704989429760> Kết Quả Câu Cá**')
            .setDescription(resultMessage)
            .addFields(
                { name: 'Vật phẩm nhận:', value: `${loot.emoji} ${loot.name}`, inline: true },
                { name: 'Thu về:', value: `${winnings.toLocaleString()}<a:diamondgem:1402590496647413811>`, inline: true },
            )
            .setFooter({ text: `Người câu: ${interaction.member.displayName}` });

        await interaction.editReply({ embeds: [finalEmbed] });
    },
};