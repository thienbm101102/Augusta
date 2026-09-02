const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// 🎲 HỆ THỐNG VẬT PHẨM & GIÁ TRỊ ẨN
const LOOT_TABLE = [
    // ⚪ Thường (Common) - 50%
    { name: 'Bình Máu Nhỏ', rarity: 'Thường', color: '#b0c4de', minSell: 500, maxSell: 2000, weight: 500, emoji: '🧪' },
    { name: 'Kiếm Gỗ Mục', rarity: 'Thường', color: '#b0c4de', minSell: 1000, maxSell: 3000, weight: 450, emoji: '🗡️' },
    
    // 🔵 Hiếm (Rare) - 30%
    { name: 'Khiên Sắt Hiệp Sĩ', rarity: 'Hiếm', color: '#3498db', minSell: 10000, maxSell: 25000, weight: 300, emoji: '🛡️' },
    { name: 'Nhẫn Bạc Tinh Xảo', rarity: 'Hiếm', color: '#3498db', minSell: 15000, maxSell: 30000, weight: 250, emoji: '💍' },

    // 🟣 Sử Thi (Epic) - 15%
    { name: 'Áo Choàng Bóng Tối', rarity: 'Sử Thi', color: '#9b59b6', minSell: 50000, maxSell: 120000, weight: 120, emoji: '🧥' },
    { name: 'Kiếm Quang Minh', rarity: 'Sử Thi', color: '#9b59b6', minSell: 80000, maxSell: 150000, weight: 100, emoji: '✨' },

    // 🟡 Huyền Thoại (Legendary) - 4%
    { name: 'Vương Miện Cổ Đại', rarity: 'Huyền Thoại', color: '#f1c40f', minSell: 200000, maxSell: 500000, weight: 35, emoji: '👑' },
    { name: 'Gậy Phép Tối Cao', rarity: 'Huyền Thoại', color: '#f1c40f', minSell: 300000, maxSell: 700000, weight: 25, emoji: '🪄' },

    // 🔴 Thần Thoại (Mythic) - 1%
    { name: 'Trứng Rồng Hủy Diệt', rarity: 'Thần Thoại', color: '#ff0000', minSell: 1000000, maxSell: 2500000, weight: 8, emoji: '🐉' },
    { name: 'Chén Thánh Bất Tử', rarity: 'Thần Thoại', color: '#ff0000', minSell: 2000000, maxSell: 5000000, weight: 2, emoji: '🏺' }
];

const activeAuctions = new Map();

function getRandomItem() {
    const totalWeight = LOOT_TABLE.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of LOOT_TABLE) {
        if (random < item.weight) {
            const actualValue = Math.floor(Math.random() * (item.maxSell - item.minSell + 1)) + item.minSell;
            return { ...item, actualValue };
        }
        random -= item.weight;
    }
    return { ...LOOT_TABLE[0], actualValue: LOOT_TABLE[0].minSell };
}

function getDynamicButtons(currentBid, isDisabled = false) {
    let steps = [100, 500, 1000, 5000];
    
    if (currentBid >= 1000000) steps = [50000, 100000, 200000, 500000];
    else if (currentBid >= 200000) steps = [10000, 50000, 100000, 200000];
    else if (currentBid >= 50000) steps = [5000, 10000, 20000, 50000];
    else if (currentBid >= 10000) steps = [1000, 2000, 5000, 10000];

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bidking_add_${steps[0]}`).setLabel(`+${steps[0].toLocaleString()}`).setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_add_${steps[1]}`).setLabel(`+${steps[1].toLocaleString()}`).setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_add_${steps[2]}`).setLabel(`+${steps[2].toLocaleString()}`).setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_add_${steps[3]}`).setLabel(`+${steps[3].toLocaleString()}`).setStyle(ButtonStyle.Danger).setDisabled(isDisabled)
        )
    ];
}

function createBlindAuctionEmbed(auction) {
    let desc = `**Chủ xị:** <@${auction.starter}>\n`;
    desc += `**Báu vật:** 📦 **RƯƠNG MÙ BÍ ẨN**\n`;
    desc += `**Độ hiếm:** \`[???]\`\n`;
    desc += `**Định giá:** \`???\` <a:diamondgem:1418649012289933434>\n\n`;
    
    // Sử dụng Discord Timestamp gốc (<t:thoigian:R>)
    desc += `**Thời gian kết thúc:** <t:${auction.endTime}:R>\n`;
    
    desc += `**Giá đấu hiện tại:** \`${auction.currentBid.toLocaleString()}\` <a:diamondgem:1418649012289933434>\n`;
    desc += `**Người dẫn đầu:** ${auction.highestBidder ? `<@${auction.highestBidder}>` : 'Chưa có ai'}\n`;
    
    desc += `\n*Rương này có thể chứa đồ Thần Phẩm giá trị triệu đô, hoặc chỉ là một đồ ghẻ... Nhấn nút để đấu giá!*`;

    return new EmbedBuilder()
        .setTitle(`**<a:VerifiedTwitter:1418649004912148511> ĐẤU GIÁ RƯƠNG BÍ ẨN**`)
        .setDescription(desc)
        .setColor('#95a5a6')
        .setFooter({ text: 'Chú ý: Cược ở 10 giây cuối sẽ tự động cộng thêm 10 giây!' });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bidking')
        .setDescription('Khai mở rương báu vật bí ẩn và tổ chức đấu giá mù!')
        .addIntegerOption(option =>
            option.setName('giakhoidiem')
                .setDescription('Giá khởi điểm cho rương báu (Tối thiểu 100)')
                .setRequired(true)
                .setMinValue(100)
        )
        .addIntegerOption(option =>
            option.setName('thoigian')
                .setDescription('Thời lượng đấu giá (10 - 120 giây) - Mặc định: 40s')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(120)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const channelId = interaction.channelId;

        if (activeAuctions.has(channelId)) {
            return interaction.editReply({ 
                content: '<a:AbbyShocked:1393909368138895411> Đang có một phiên đấu giá diễn ra tại kênh này! Vui lòng đợi kết thúc.', 
                ephemeral: true 
            });
        }

        const startPrice = interaction.options.getInteger('giakhoidiem');
        const duration = interaction.options.getInteger('thoigian') || 40;
        const endTimeUnix = Math.floor(Date.now() / 1000) + duration;
        
        const itemData = getRandomItem();

        const suspenseEmbed = new EmbedBuilder()
            .setTitle('<a:VerifiedTwitter:1418649004912148511> **ĐANG TÌM KIẾM RƯƠNG BÁU ẨN...**')
            .setDescription('Một khe nứt không gian vừa mở ra. Hệ thống đang trích xuất một vật phẩm ngẫu nhiên...')
            .setColor('#2c3e50');

        const reply = await interaction.editReply({ embeds: [suspenseEmbed], fetchReply: true });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const auction = {
            channelId: channelId,
            starter: interaction.user.id,
            item: itemData,
            currentBid: startPrice,
            highestBidder: null,
            endTime: endTimeUnix,
            timer: null,
            message: reply,
            isProcessing: false
        };
        activeAuctions.set(channelId, auction);

        const embed = createBlindAuctionEmbed(auction);
        const components = getDynamicButtons(auction.currentBid);

        await reply.edit({ embeds: [embed], components }).catch(() => {});

        // Đếm ngược ngầm: Khác biệt ở đây là BOT không update tin nhắn mỗi giây nữa
        // Nó chỉ kiểm tra giờ của hệ thống xem đã tới hạn hay chưa
        auction.timer = setInterval(async () => {
            const now = Math.floor(Date.now() / 1000);
            if (now >= auction.endTime) {
                clearInterval(auction.timer);
                await this.endAuction(channelId, auction);
            }
        }, 1000);
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('bidking_add_')) return;

        const channelId = interaction.channelId;
        const auction = activeAuctions.get(channelId);

        if (!auction || auction.message.id !== interaction.message.id) {
            return interaction.reply({ content: 'Phiên đấu giá này đã kết thúc hoặc bị lỗi.', ephemeral: true });
        }

        if (auction.isProcessing) {
            return interaction.reply({ content: 'Hệ thống đang xử lý một mức giá khác, hãy thử lại!', ephemeral: true });
        }
        
        await interaction.deferUpdate();
        auction.isProcessing = true;

        try {
            const addAmount = parseInt(interaction.customId.split('_')[2]);
            const newBid = auction.currentBid + addAmount;
            const userId = interaction.user.id;

            const userBalance = await getBalance(userId);
            if (userBalance < newBid) {
                auction.isProcessing = false;
                return interaction.followUp({ 
                    content: `<a:AbbyCry:1393909295665643540> Bạn không đủ tiền! Bạn cần **${newBid.toLocaleString()}** <a:diamondgem:1418649012289933434>`, 
                    ephemeral: true 
                });
            }

            if (auction.highestBidder === userId) {
                await addBalance(userId, -addAmount);
            } else {
                if (auction.highestBidder) {
                    await addBalance(auction.highestBidder, auction.currentBid);
                }
                await addBalance(userId, -newBid);
            }

            auction.currentBid = newBid;
            auction.highestBidder = userId;

            // Anti-snipe: Nếu thời gian còn lại dưới 10 giây, tự động cộng thêm 10 giây
            const now = Math.floor(Date.now() / 1000);
            if (auction.endTime - now < 10) {
                auction.endTime += 10;
            }

            // Giao diện sẽ tự động format lại <t:...:R> với endTime mới
            const updatedEmbed = createBlindAuctionEmbed(auction);
            const updatedComponents = getDynamicButtons(auction.currentBid);

            await interaction.editReply({ embeds: [updatedEmbed], components: updatedComponents });

        } catch (error) {
            console.error("Lỗi khi xử lý đấu giá BidKing:", error);
        } finally {
            auction.isProcessing = false;
        }
    },

    async endAuction(channelId, auction) {
        activeAuctions.delete(channelId);

        if (!auction.highestBidder) {
            const embed = new EmbedBuilder()
                .setTitle('⚖️ KẾT THÚC ĐẤU GIÁ')
                .setDescription(`Rương mù không có chủ. Khi mở ra, hệ thống phát hiện đó là ${auction.item.emoji} **${auction.item.name}**! Thật đáng tiếc...`)
                .setColor('#95a5a6');
            await auction.message.edit({ embeds: [embed], components: getDynamicButtons(auction.currentBid, true) }).catch(() => {});
            return;
        }

        const winnerId = auction.highestBidder;
        const winningPrice = auction.currentBid;
        const actualValue = auction.item.actualValue;
        const profit = actualValue - winningPrice;

        await addBalance(winnerId, actualValue);

        let profitMsg = "";
        let finalColor = "";

        if (profit > 0) {
            profitMsg = `📈 **Lời to:** \`+${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#2ecc71';
        } else if (profit === 0) {
            profitMsg = `🤝 **Hòa vốn:** \`0\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#f1c40f';
        } else {
            profitMsg = `📉 **Lỗ sặc máu:** \`${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434> (Tham thì thâm!)`;
            finalColor = '#e74c3c';
        }

        const finalEmbed = new EmbedBuilder()
            .setTitle('<a:VerifiedTwitter:1418649004912148511> KHUI RƯƠNG BÍ ẨN')
            .setDescription(`Búa đã gõ! <@${winnerId}> đã chốt rương với giá **${winningPrice.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\nMở rương ra, bên trong là:\n\n${auction.item.emoji} **${auction.item.name.toUpperCase()}**\nĐộ hiếm: **[${auction.item.rarity}]**`)
            .addFields(
                { name: 'Định giá thị trường', value: `\`${actualValue.toLocaleString()}\` <a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Kết quả', value: profitMsg, inline: false }
            )
            .setColor(finalColor)
            .setFooter({ text: 'Hệ thống đã tự động quy đổi vật phẩm thành tiền và cộng vào tài khoản của bạn.' });

        await auction.message.edit({ embeds: [finalEmbed], components: getDynamicButtons(auction.currentBid, true) }).catch(() => {});
    }
};
