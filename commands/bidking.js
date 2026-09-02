const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// 🎲 HỆ THỐNG VẬT PHẨM & GIÁ TRỊ ẨN
// Hệ thống sẽ random giá trị thực (sellPrice) từ minSell đến maxSell
const LOOT_TABLE = [
    // ⚪ Thường (Common) - ~50%
    { name: 'Bình Máu Nhỏ', rarity: 'Thường', color: '#b0c4de', basePrice: 1000, minSell: 2000, maxSell: 5000, weight: 500, emoji: '🧪' },
    { name: 'Kiếm Gỗ Mục', rarity: 'Thường', color: '#b0c4de', basePrice: 1500, minSell: 3000, maxSell: 7000, weight: 450, emoji: '🗡️' },
    
    // 🔵 Hiếm (Rare) - ~30%
    { name: 'Khiên Sắt Hiệp Sĩ', rarity: 'Hiếm', color: '#3498db', basePrice: 10000, minSell: 15000, maxSell: 35000, weight: 300, emoji: '🛡️' },
    { name: 'Nhẫn Bạc Tinh Xảo', rarity: 'Hiếm', color: '#3498db', basePrice: 12000, minSell: 20000, maxSell: 45000, weight: 250, emoji: '💍' },

    // 🟣 Sử Thi (Epic) - ~15%
    { name: 'Áo Choàng Bóng Tối', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 50000, minSell: 80000, maxSell: 150000, weight: 120, emoji: '🧥' },
    { name: 'Kiếm Quang Minh', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 60000, minSell: 100000, maxSell: 200000, weight: 100, emoji: '✨' },

    // 🟡 Huyền Thoại (Legendary) - ~4%
    { name: 'Vương Miện Cổ Đại', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 200000, minSell: 300000, maxSell: 600000, weight: 35, emoji: '👑' },
    { name: 'Gậy Phép Tối Cao', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 250000, minSell: 400000, maxSell: 800000, weight: 25, emoji: '🪄' },

    // 🔴 Thần Thoại (Mythic) - ~1%
    { name: 'Trứng Rồng Hủy Diệt', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 1000000, minSell: 1500000, maxSell: 3000000, weight: 8, emoji: '🐉' },
    { name: 'Chén Thánh Bất Tử', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 2000000, minSell: 3000000, maxSell: 10000000, weight: 2, emoji: '🏺' }
];

const activeAuctions = new Map();

// Hàm quay vật phẩm ngẫu nhiên dựa trên trọng số (weight)
function getRandomItem() {
    const totalWeight = LOOT_TABLE.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of LOOT_TABLE) {
        if (random < item.weight) {
            // Tính toán luôn giá trị bán ra của vật phẩm này
            const actualValue = Math.floor(Math.random() * (item.maxSell - item.minSell + 1)) + item.minSell;
            return { ...item, actualValue };
        }
        random -= item.weight;
    }
    return { ...LOOT_TABLE[0], actualValue: LOOT_TABLE[0].minSell };
}

// Nút tăng giá sẽ thích ứng với giá khởi điểm của vật phẩm
function getDynamicButtons(basePrice, isDisabled = false) {
    let steps = [1000, 5000, 10000, 50000];
    if (basePrice >= 1000000) steps = [50000, 100000, 500000, 1000000];
    else if (basePrice >= 200000) steps = [10000, 50000, 100000, 200000];
    else if (basePrice >= 50000) steps = [5000, 10000, 50000, 100000];

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bidking_add_${steps[0]}`).setLabel(`+${steps[0].toLocaleString()}`).setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_add_${steps[1]}`).setLabel(`+${steps[1].toLocaleString()}`).setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_add_${steps[2]}`).setLabel(`+${steps[2].toLocaleString()}`).setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_add_${steps[3]}`).setLabel(`+${steps[3].toLocaleString()}`).setStyle(ButtonStyle.Danger).setDisabled(isDisabled)
        )
    ];
}

function createAuctionEmbed(auction) {
    let desc = `**Người phát hiện rương:** <@${auction.starter}>\n`;
    desc += `**Báu vật:** ${auction.item.emoji} **${auction.item.name}**\n`;
    desc += `**Độ hiếm:** [${auction.item.rarity}]\n`;
    desc += `**Định giá thị trường:** \`???\` <a:diamondgem:1418649012289933434> *(Chỉ tiết lộ khi kết thúc)*\n`;
    desc += `**Thời gian còn lại:** \`${auction.timeLeft}\` giây\n\n`;
    desc += `**Giá thầu hiện tại:** \`${auction.currentBid.toLocaleString()}\` <a:diamondgem:1418649012289933434>\n`;
    desc += `**Người dẫn đầu:** ${auction.highestBidder ? `<@${auction.highestBidder}>` : 'Chưa có ai'}\n`;
    
    desc += `\n*Hãy cẩn thận! Nếu bạn đẩy giá thầu lên cao hơn giá trị thực của vật phẩm, bạn sẽ bị LỖ!*`;

    return new EmbedBuilder()
        .setTitle(`**<a:VerifiedTwitter:1418649004912148511> ĐẤU GIÁ BÍ ẨN BẮT ĐẦU**`)
        .setDescription(desc)
        .setColor(auction.item.color)
        .setFooter({ text: 'Chú ý: Cược ở 10 giây cuối sẽ tự động cộng thêm 10 giây!' });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bidking')
        .setDescription('Khai mở rương báu vật bí ẩn và tổ chức đấu giá sinh tử!')
        .addIntegerOption(option =>
            option.setName('thoigian')
                .setDescription('Thời lượng đếm ngược (10 - 120 giây) - Mặc định: 40s')
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

        const duration = interaction.options.getInteger('thoigian') || 40;
        
        // 1. Roll ngẫu nhiên vật phẩm
        const itemData = getRandomItem();

        // 2. Tạo hiệu ứng hồi hộp
        const suspenseEmbed = new EmbedBuilder()
            .setTitle('🔮 **ĐANG GIẢI MÃ RƯƠNG BÁU...**')
            .setDescription('Một khe nứt không gian vừa mở ra. Hệ thống đang trích xuất một vật phẩm ngẫu nhiên...')
            .setColor('#2c3e50');

        const reply = await interaction.editReply({ embeds: [suspenseEmbed], fetchReply: true });

        // Chờ 3 giây để tạo cảm giác hồi hộp
        await new Promise(resolve => setTimeout(resolve, 3000));

        const auction = {
            channelId: channelId,
            starter: interaction.user.id,
            item: itemData,
            currentBid: itemData.basePrice,
            highestBidder: null,
            timeLeft: duration,
            timer: null,
            message: reply,
            isProcessing: false
        };
        activeAuctions.set(channelId, auction);

        const embed = createAuctionEmbed(auction);
        const components = getDynamicButtons(itemData.basePrice);

        // 3. Chính thức bắt đầu đấu giá
        await reply.edit({ embeds: [embed], components }).catch(() => {});

        // Vòng lặp đếm ngược mỗi 2 giây
        auction.timer = setInterval(async () => {
            auction.timeLeft -= 2;

            if (auction.timeLeft <= 0) {
                clearInterval(auction.timer);
                await this.endAuction(channelId, auction);
            } else {
                const updatedEmbed = createAuctionEmbed(auction);
                await auction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
            }
        }, 2000);
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
                // Tự đẩy giá chính mình
                await addBalance(userId, -addAmount);
            } else {
                // Người mới đè giá
                if (auction.highestBidder) {
                    await addBalance(auction.highestBidder, auction.currentBid); // Hoàn tiền người cũ
                }
                await addBalance(userId, -newBid); // Trừ tiền người mới
            }

            auction.currentBid = newBid;
            auction.highestBidder = userId;

            // Anti-snipe: Dưới 10 giây tự cộng thêm 10 giây
            if (auction.timeLeft < 10) {
                auction.timeLeft += 10;
            }

            const updatedEmbed = createAuctionEmbed(auction);
            await interaction.editReply({ embeds: [updatedEmbed] });

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
                .setDescription(`Rất tiếc, vật phẩm ${auction.item.emoji} **${auction.item.name}** đã bị ế vì không có ai tham gia trả giá. Hệ thống đã thu hồi!`)
                .setColor('#95a5a6');
            await auction.message.edit({ embeds: [embed], components: getDynamicButtons(auction.item.basePrice, true) }).catch(() => {});
            return;
        }

        const winnerId = auction.highestBidder;
        const winningPrice = auction.currentBid;
        const actualValue = auction.item.actualValue;
        const profit = actualValue - winningPrice;

        // Cộng số tiền bán vật phẩm vào tài khoản người thắng
        await addBalance(winnerId, actualValue);

        let profitMsg = "";
        let finalColor = "";

        if (profit > 0) {
            profitMsg = `📈 **Lời to:** \`+${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#2ecc71'; // Màu xanh lá
        } else if (profit === 0) {
            profitMsg = `🤝 **Hòa vốn:** \`0\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#f1c40f'; // Màu vàng
        } else {
            profitMsg = `📉 **Lỗ sặc máu:** \`${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434> (Đấu giá quá tay rồi!)`;
            finalColor = '#e74c3c'; // Màu đỏ
        }

        const finalEmbed = new EmbedBuilder()
            .setTitle('<a:VerifiedTwitter:1418649004912148511> ĐẤU GIÁ KẾT THÚC!')
            .setDescription(`Vật phẩm ${auction.item.emoji} **${auction.item.name}** [${auction.item.rarity}] đã thuộc về <@${winnerId}>!`)
            .addFields(
                { name: 'Giá chốt thầu', value: `\`${winningPrice.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Giá trị thực tế', value: `\`${actualValue.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Kết quả', value: profitMsg, inline: false }
            )
            .setColor(finalColor)
            .setFooter({ text: 'Hệ thống đã tự động quy đổi vật phẩm thành tiền và cộng vào tài khoản của bạn.' });

        await auction.message.edit({ embeds: [finalEmbed], components: getDynamicButtons(auction.item.basePrice, true) }).catch(() => {});
    }
};