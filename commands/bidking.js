const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// 🎲 HỆ THỐNG VẬT PHẨM & GIÁ TRỊ ẨN
const LOOT_TABLE = [
    { name: 'Bình Máu Nhỏ', rarity: 'Thường', color: '#b0c4de', basePrice: 1000, minSell: 1000, maxSell: 3000, weight: 500, emoji: '🧪' },
    { name: 'Kiếm Gỗ Mục', rarity: 'Thường', color: '#b0c4de', basePrice: 1500, minSell: 1500, maxSell: 4000, weight: 450, emoji: '🗡️' },
    
    { name: 'Khiên Sắt Hiệp Sĩ', rarity: 'Hiếm', color: '#3498db', basePrice: 10000, minSell: 10000, maxSell: 25000, weight: 300, emoji: '🛡️' },
    { name: 'Nhẫn Bạc Tinh Xảo', rarity: 'Hiếm', color: '#3498db', basePrice: 15000, minSell: 15000, maxSell: 35000, weight: 250, emoji: '💍' },

    { name: 'Áo Choàng Bóng Tối', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 50000, minSell: 50000, maxSell: 120000, weight: 120, emoji: '🧥' },
    { name: 'Kiếm Quang Minh', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 80000, minSell: 80000, maxSell: 150000, weight: 100, emoji: '✨' },

    { name: 'Vương Miện Cổ Đại', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 200000, minSell: 200000, maxSell: 600000, weight: 35, emoji: '👑' },
    { name: 'Gậy Phép Tối Cao', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 300000, minSell: 300000, maxSell: 800000, weight: 25, emoji: '🪄' },

    { name: 'Trứng Rồng Hủy Diệt', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 1000000, minSell: 1000000, maxSell: 3000000, weight: 8, emoji: '🐉' },
    { name: 'Chén Thánh Bất Tử', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 3000000, minSell: 3000000, maxSell: 10000000, weight: 2, emoji: '🏺' }
];

const activeAuctions = new Map();
const HYPE_EMOJIS = ['⬜', '⬛', '🟧', '🟥', '🔥'];

function getHypeMeter(level) {
    const meterLength = 10;
    const filledLength = Math.min(level, meterLength);
    const emptyLength = meterLength - filledLength;
    
    let emoji = HYPE_EMOJIS[1];
    if (level >= 8) emoji = HYPE_EMOJIS[4];
    else if (level >= 5) emoji = HYPE_EMOJIS[3];
    else if (level >= 3) emoji = HYPE_EMOJIS[2];

    return emoji.repeat(filledLength) + HYPE_EMOJIS[0].repeat(emptyLength);
}

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

function getBlindButtons(basePrice, isDisabled = false) {
    let steps = [100, 500, 1000, 5000];
    if (basePrice >= 1000000) steps = [50000, 100000, 200000, 500000];
    else if (basePrice >= 200000) steps = [10000, 50000, 100000, 200000];
    else if (basePrice >= 50000) steps = [5000, 10000, 20000, 50000];
    else if (basePrice >= 10000) steps = [1000, 2000, 5000, 10000];

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bidking_blind_${steps[0]}`).setLabel(`Ném +${steps[0].toLocaleString()}`).setStyle(ButtonStyle.Secondary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_blind_${steps[1]}`).setLabel(`Ném +${steps[1].toLocaleString()}`).setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_blind_${steps[2]}`).setLabel(`Ném +${steps[2].toLocaleString()}`).setStyle(ButtonStyle.Primary).setDisabled(isDisabled),
            new ButtonBuilder().setCustomId(`bidking_blind_${steps[3]}`).setLabel(`Ném +${steps[3].toLocaleString()}`).setStyle(ButtonStyle.Danger).setDisabled(isDisabled)
        )
    ];
}

function createBlindAuctionEmbed(auction) {
    const hypeLevel = Math.min(Math.floor(auction.totalBids / 3), 10); 
    
    let currentEmoji = '📦';
    let currentRarity = '???';
    let currentColor = '#95a5a6';
    let hypePhrase = "Khởi động nhẹ nhàng... Giá thầu của tất cả mọi người đang được giấu kín!";

    if (hypeLevel >= 3) {
        currentRarity = auction.item.rarity;
        currentColor = auction.item.color;
        hypePhrase = "👀 Nắp rương khẽ mở... Có ánh sáng hắt ra! (Đã lộ Độ Hiếm)";
    }
    if (hypeLevel >= 6) {
        currentEmoji = auction.item.emoji;
        hypePhrase = "🔍 Hình dáng báu vật đã dần hiện rõ! (Đã lộ Hình Dáng)";
    }
    if (hypeLevel >= 10) {
        hypePhrase = "💥 CHÁY MÁY! KHÔ MÁU ĐI ANH EM ƠIIII!!!";
    }

    let desc = `**Chủ xị:** <@${auction.starter}>\n`;
    desc += `**Báu vật:** ${currentEmoji} **RƯƠNG MÙ BÍ ẨN**\n`;
    desc += `**Độ hiếm:** \`[${currentRarity}]\`\n`;
    desc += `**Giá trị thực:** \`???\` <a:diamondgem:1418649012289933434> *(Công bố phút chót)*\n\n`;
    
    desc += `**🔥 NHIỆT ĐỘ PHIÊN:** \`[Level ${hypeLevel}]\`\n`;
    desc += `${getHypeMeter(hypeLevel)}\n`;
    desc += `*${hypePhrase}*\n\n`;

    desc += `**👥 Số người đang rình mò:** \`${auction.bids.size}\` người\n`;
    desc += `**💸 Tổng số lượt ném tiền:** \`${auction.totalBids}\` lượt\n\n`;
    desc += `**Thời gian kết thúc:** <t:${auction.endTime}:R>\n`;
    
    desc += `\n**⚠️ ĐIỀU KIỆN CHIẾN THẮNG:**\n- Tổng tiền bạn ném vào rương không được chênh lệch quá **±30%** so với Giá Trị Thực.\n- Ai cược CAO NHẤT trong vùng an toàn sẽ ăn toàn bộ lợi nhuận!\n- Cược trượt sẽ được HOÀN TIỀN 100%.`;

    return new EmbedBuilder()
        .setTitle(`**<a:VerifiedTwitter:1418649004912148511> ĐẤU GIÁ MÙ "SINH TỬ"**`)
        .setDescription(desc)
        .setColor(currentColor);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bidking')
        .setDescription('Tổ chức đấu giá mù! Ném tiền ẩn danh và dự đoán giá trị thực.')
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

        const duration = interaction.options.getInteger('thoigian') || 40;
        const endTimeUnix = Math.floor(Date.now() / 1000) + duration;
        
        const itemData = getRandomItem();

        const suspenseEmbed = new EmbedBuilder()
            .setTitle('🔮 **ĐANG GIẢI MÃ RƯƠNG BÁU...**')
            .setDescription('Một khe nứt không gian vừa mở ra. Hệ thống đang trích xuất một báu vật ngẫu nhiên...')
            .setColor('#2c3e50');

        const reply = await interaction.editReply({ embeds: [suspenseEmbed], fetchReply: true });
        await new Promise(resolve => setTimeout(resolve, 3000));

        const auction = {
            channelId: channelId,
            starter: interaction.user.id,
            item: itemData,
            bids: new Map(), // Lưu trữ {userId: totalBidAmount}
            totalBids: 0,
            endTime: endTimeUnix,
            timer: null,
            message: reply,
        };
        activeAuctions.set(channelId, auction);

        const embed = createBlindAuctionEmbed(auction);
        const components = getBlindButtons(auction.item.basePrice);

        await reply.edit({ embeds: [embed], components }).catch(() => {});

        auction.timer = setInterval(async () => {
            const now = Math.floor(Date.now() / 1000);
            if (now >= auction.endTime) {
                clearInterval(auction.timer);
                await this.endAuction(channelId, auction);
            }
        }, 1000);
    },

    async handleButton(interaction) {
        if (!interaction.customId.startsWith('bidking_blind_')) return;

        const channelId = interaction.channelId;
        const auction = activeAuctions.get(channelId);

        if (!auction || auction.message.id !== interaction.message.id) {
            return interaction.reply({ content: 'Phiên đấu giá này đã kết thúc.', ephemeral: true });
        }
        
        const addAmount = parseInt(interaction.customId.split('_')[2]);
        const userId = interaction.user.id;

        const userBalance = await getBalance(userId);
        if (userBalance < addAmount) {
            return interaction.reply({ 
                content: `<a:AbbyCry:1393909295665643540> Bạn không đủ tiền! Cần **${addAmount.toLocaleString()}** <a:diamondgem:1418649012289933434>`, 
                ephemeral: true 
            });
        }

        // Trừ tiền cọc tạm thời
        await addBalance(userId, -addAmount);
        
        // Cộng dồn vào quỹ cược cá nhân của người chơi
        const currentUserBid = auction.bids.get(userId) || 0;
        const newUserBid = currentUserBid + addAmount;
        auction.bids.set(userId, newUserBid);
        
        auction.totalBids++; 

        const now = Math.floor(Date.now() / 1000);
        if (auction.endTime - now < 10) {
            auction.endTime += 10;
        }

        const updatedEmbed = createBlindAuctionEmbed(auction);
        const updatedComponents = getBlindButtons(auction.item.basePrice);

        // Trả lời riêng cho người chơi (éphemeral) để giữ bí mật giá
        await interaction.reply({ 
            content: `🤫 *Shh...* Bạn vừa lén ném thêm **${addAmount.toLocaleString()}** vào rương.\n💰 Tổng số tiền bạn đang cược: **${newUserBid.toLocaleString()}** <a:diamondgem:1418649012289933434>`, 
            ephemeral: true 
        });

        // Cập nhật giao diện chính
        await auction.message.edit({ embeds: [updatedEmbed], components: updatedComponents }).catch(() => {});
    },

    async endAuction(channelId, auction) {
        activeAuctions.delete(channelId);
        const actualValue = auction.item.actualValue;
        
        // Vùng an toàn ±30%
        const minAcceptable = Math.floor(actualValue * 0.7);
        const maxAcceptable = Math.floor(actualValue * 1.3);

        let winnerId = null;
        let highestValidBid = 0;
        let winnerOriginalBid = 0;

        // Tìm người thắng & Hoàn tiền cho những người không trúng thầu
        for (const [userId, bidAmount] of auction.bids.entries()) {
            if (bidAmount >= minAcceptable && bidAmount <= maxAcceptable) {
                if (bidAmount > highestValidBid) {
                    highestValidBid = bidAmount;
                    winnerId = userId;
                    winnerOriginalBid = bidAmount;
                }
            }
        }

        // Hoàn tiền cho TẤT CẢ những người không phải Winner
        for (const [userId, bidAmount] of auction.bids.entries()) {
            if (userId !== winnerId) {
                await addBalance(userId, bidAmount);
            }
        }

        if (!winnerId) {
            const failEmbed = new EmbedBuilder()
                .setTitle('⚖️ KẾT THÚC ĐẤU GIÁ - GIAO DỊCH THẤT BẠI')
                .setDescription(`Rương mở ra: ${auction.item.emoji} **${auction.item.name}** [${auction.item.rarity}]\nGiá trị thực: **${actualValue.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\n📉 **Không có ai định giá thành công!** (Cược quá bèo hoặc giành giật quá cao).\n✅ **Tiền cọc đã được hoàn trả 100% cho toàn bộ người chơi.**`)
                .setColor('#e74c3c');
            await auction.message.edit({ embeds: [failEmbed], components: getBlindButtons(auction.item.basePrice, true) }).catch(() => {});
            return;
        }

        // --- BẠO KÍCH CHO NGƯỜI THẮNG ---
        const isCrit = Math.random() < 0.10; 
        let finalReward = actualValue;
        let critMultiplier = 1;
        
        if (isCrit) {
            critMultiplier = Math.floor(Math.random() * 9) + 2; 
            finalReward = actualValue * critMultiplier;
        }
        
        // Cộng tiền bán vật phẩm cho người thắng (tiền cọc winnerOriginalBid đã bị trừ trước đó rồi)
        await addBalance(winnerId, finalReward);
        const profit = finalReward - winnerOriginalBid;

        let profitMsg = profit >= 0 
            ? `📈 **Lời to:** \`+${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`
            : `📉 **Lỗ nhẹ:** \`${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`;

        let resultTitle = '<a:VerifiedTwitter:1418649004912148511> GIAO DỊCH THÀNH CÔNG!';
        let finalColor = '#2ecc71';

        if (isCrit) {
            resultTitle = `💥💥💥 BẠO KÍCH SIÊU CẤP x${critMultiplier}!!! 💥💥💥`;
            finalColor = '#ff4500';
        }

        const finalEmbed = new EmbedBuilder()
            .setTitle(resultTitle)
            .setDescription(`Búa đã gõ! <@${winnerId}> là người định giá chuẩn xác và chịu chi nhất với mức cược **${winnerOriginalBid.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\nMở rương ra, bên trong là:\n${auction.item.emoji} **${auction.item.name.toUpperCase()}**\nĐộ hiếm: **[${auction.item.rarity}]**`)
            .addFields(
                { name: 'Vùng giá an toàn (±30%)', value: `Từ \`${minAcceptable.toLocaleString()}\` đến \`${maxAcceptable.toLocaleString()}\``, inline: false },
                { name: 'Định giá thực tế', value: `\`${actualValue.toLocaleString()}\` <a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Bạo kích', value: isCrit ? `**x${critMultiplier}**` : '\`Không\`', inline: true },
                { name: 'Kết quả', value: profitMsg, inline: false }
            )
            .setColor(finalColor)
            .setFooter({ text: 'Người thắng đã nhận tiền thưởng. Các người chơi khác đã được hoàn tiền 100%.' });

        await auction.message.edit({ embeds: [finalEmbed], components: getBlindButtons(auction.item.basePrice, true) }).catch(() => {});
    }
};
