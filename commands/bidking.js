const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// 🎲 HỆ THỐNG VẬT PHẨM & GIÁ TRỊ ẨN
const LOOT_TABLE = [
    // ⚪ Thường (Common) - 50%
    { name: 'Bình Máu Nhỏ', rarity: 'Thường', color: '#b0c4de', basePrice: 1000, minSell: 1000, maxSell: 3000, weight: 500, emoji: '🧪' },
    { name: 'Kiếm Gỗ Mục', rarity: 'Thường', color: '#b0c4de', basePrice: 1500, minSell: 1500, maxSell: 4000, weight: 450, emoji: '🗡️' },
    
    // 🔵 Hiếm (Rare) - 30%
    { name: 'Khiên Sắt Hiệp Sĩ', rarity: 'Hiếm', color: '#3498db', basePrice: 10000, minSell: 10000, maxSell: 25000, weight: 300, emoji: '🛡️' },
    { name: 'Nhẫn Bạc Tinh Xảo', rarity: 'Hiếm', color: '#3498db', basePrice: 15000, minSell: 15000, maxSell: 35000, weight: 250, emoji: '💍' },

    // 🟣 Sử Thi (Epic) - 15%
    { name: 'Áo Choàng Bóng Tối', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 50000, minSell: 50000, maxSell: 120000, weight: 120, emoji: '🧥' },
    { name: 'Kiếm Quang Minh', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 80000, minSell: 80000, maxSell: 150000, weight: 100, emoji: '✨' },

    // 🟡 Huyền Thoại (Legendary) - 4%
    { name: 'Vương Miện Cổ Đại', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 200000, minSell: 200000, maxSell: 600000, weight: 35, emoji: '👑' },
    { name: 'Gậy Phép Tối Cao', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 300000, minSell: 300000, maxSell: 800000, weight: 25, emoji: '🪄' },

    // 🔴 Thần Thoại (Mythic) - 1%
    { name: 'Trứng Rồng Hủy Diệt', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 1000000, minSell: 1000000, maxSell: 3000000, weight: 8, emoji: '🐉' },
    { name: 'Chén Thánh Bất Tử', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 3000000, minSell: 3000000, maxSell: 10000000, weight: 2, emoji: '🏺' }
];

const activeAuctions = new Map();

const HYPE_EMOJIS = ['⬜', '⬛', '🟧', '🟥', '🔥'];

function getHypeMeter(level) {
    const meterLength = 10;
    const filledLength = Math.min(level, meterLength);
    const emptyLength = meterLength - filledLength;
    
    let emoji = HYPE_EMOJIS[1]; // Đen
    if (level >= 8) emoji = HYPE_EMOJIS[4]; // Lửa
    else if (level >= 5) emoji = HYPE_EMOJIS[3]; // Đỏ
    else if (level >= 3) emoji = HYPE_EMOJIS[2]; // Cam

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
    const hypeLevel = Math.min(Math.floor(auction.totalBids / 3), 10); // Mỗi 3 bid tăng 1 level

    // Logic Hé Lộ Thông Tin
    let currentEmoji = '📦';
    let currentRarity = '???';
    let currentColor = '#95a5a6';
    let currentBasePrice = '???';
    let hypePhrase = "Khởi động nhẹ nhàng... Hộp vẫn đóng kín bưng!";

    if (hypeLevel >= 3) {
        currentRarity = auction.item.rarity;
        currentColor = auction.item.color;
        hypePhrase = "👀 Nắp rương khẽ mở... Có ánh sáng hắt ra!";
    }
    if (hypeLevel >= 5) {
        currentEmoji = auction.item.emoji;
        hypePhrase = "🔍 Hình dáng báu vật đã dần hiện rõ!";
    }
    if (hypeLevel >= 8) {
        currentBasePrice = auction.item.basePrice.toLocaleString();
        hypePhrase = "💰 Chuyên gia đã thẩm định giá sàn của vật phẩm!";
    }
    if (hypeLevel >= 10) {
        hypePhrase = "💥 CHÁY MÁY! KHÔ MÁU ĐI ANH EM ƠIIII!!!";
    }

    let desc = `**Chủ xị:** <@${auction.starter}>\n`;
    desc += `**Báu vật:** ${currentEmoji} **RƯƠNG BÍ ẨN**\n`;
    desc += `**Độ hiếm:** \`[${currentRarity}]\`\n`;
    desc += `**Định giá cơ bản:** \`${currentBasePrice}\` <a:diamondgem:1418649012289933434>\n\n`;
    
    desc += `**🔥 NHIỆT ĐỘ PHIÊN:** \`[Level ${hypeLevel}]\`\n`;
    desc += `${getHypeMeter(hypeLevel)}\n`;
    desc += `*${hypePhrase}*\n\n`;

    desc += `**Thời gian kết thúc:** <t:${auction.endTime}:R>\n`;
    desc += `**Giá thầu hiện tại:** \`${auction.currentBid.toLocaleString()}\` <a:diamondgem:1418649012289933434>\n`;
    desc += `**👑 NGƯỜI DẪN ĐẦU:** ${auction.highestBidder ? `<@${auction.highestBidder}>` : 'Chưa có ai'}\n`;
    
    desc += `\n*Rương càng nhận được nhiều lượt đẩy giá, bí mật bên trong sẽ càng lộ diện!*`;

    return new EmbedBuilder()
        .setTitle(`**<a:VerifiedTwitter:1418649004912148511> ĐẤU GIÁ "SINH TỬ"**`)
        .setDescription(desc)
        .setColor(currentColor)
        .setFooter({ text: 'Chú ý: Cược ở 10 giây cuối sẽ tự động cộng thêm 10 giây!' });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bidking')
        .setDescription('Khai mở hộp bí ẩn và tổ chức đấu giá mù đầy kích thích!')
        .addIntegerOption(option =>
            option.setName('giakhoidiem')
                .setDescription('Giá khởi điểm cho hộp bí ẩn (Mặc định 1,000, Tối thiểu 100)')
                .setRequired(false)
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

        const startPrice = interaction.options.getInteger('giakhoidiem') || 1000;
        const duration = interaction.options.getInteger('thoigian') || 40;
        const endTimeUnix = Math.floor(Date.now() / 1000) + duration;
        
        const itemData = getRandomItem();

        const suspenseEmbed = new EmbedBuilder()
            .setTitle('**ĐANG CHUẨN BỊ HỘP BÍ ẨN...**')
            .setDescription('Một khe nứt không gian vừa mở ra. Hệ thống đang trích xuất một báu vật ngẫu nhiên...')
            .setColor('#2c3e50');

        const reply = await interaction.editReply({ embeds: [suspenseEmbed], fetchReply: true });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const auction = {
            channelId: channelId,
            starter: interaction.user.id,
            item: itemData,
            currentBid: startPrice,
            highestBidder: null,
            totalBids: 0,
            endTime: endTimeUnix,
            timer: null,
            message: reply,
            isProcessing: false
        };
        activeAuctions.set(channelId, auction);

        const embed = createBlindAuctionEmbed(auction);
        const components = getDynamicButtons(auction.currentBid);

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
        if (!interaction.customId.startsWith('bidking_add_')) return;

        const channelId = interaction.channelId;
        const auction = activeAuctions.get(channelId);

        if (!auction || auction.message.id !== interaction.message.id) {
            return interaction.reply({ content: 'Phiên đấu giá này đã kết thúc hoặc bị lỗi.', ephemeral: true });
        }

        if (auction.isProcessing) {
            return interaction.reply({ content: 'Hệ thống đang bận, hãy thử lại sau!', ephemeral: true });
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
            auction.totalBids++; 

            const now = Math.floor(Date.now() / 1000);
            if (auction.endTime - now < 10) {
                auction.endTime += 10;
            }

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
                .setDescription(`Hộp bí ẩn không có chủ nhân. Khi mở ra, hệ thống phát hiện đó là ${auction.item.emoji} **${auction.item.name}**! Thật đáng tiếc...`)
                .setColor('#95a5a6');
            await auction.message.edit({ embeds: [embed], components: getDynamicButtons(auction.currentBid, true) }).catch(() => {});
            return;
        }

        const winnerId = auction.highestBidder;
        const winningPrice = auction.currentBid;
        let actualValue = auction.item.actualValue;
        
        // CƠ CHẾ BẠO KÍCH (CRITICAL)
        const isCrit = Math.random() < 0.10; 
        let critMultiplier = 1;
        if (isCrit) {
            critMultiplier = Math.floor(Math.random() * 9) + 2; 
            actualValue = actualValue * critMultiplier;
        }
        
        const profit = actualValue - winningPrice;

        await addBalance(winnerId, actualValue);

        let resultTitle = '<a:VerifiedTwitter:1418649004912148511> KHUI HỘP BÍ ẨN';
        let profitMsg = "";
        let finalColor = "";

        if (profit > 0) {
            profitMsg = `📈 **Lời to:** \`+${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#2ecc71';
            if (isCrit) {
                resultTitle = `💥💥💥 BẠO KÍCH SIÊU CẤP x${critMultiplier}!!! 💥💥💥`;
                finalColor = '#ff4500';
            }
        } else if (profit === 0) {
            profitMsg = `🤝 **Hòa vốn:** \`0\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#f1c40f';
        } else {
            profitMsg = `📉 **Lỗ sặc máu:** \`${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#e74c3c';
            if (isCrit) {
                resultTitle = `💀 BẠO KÍCH CŨNG KHÔNG CỨU ĐƯỢC (x${critMultiplier}) 💀`;
            }
        }

        const finalEmbed = new EmbedBuilder()
            .setTitle(resultTitle)
            .setDescription(`Búa đã gõ! <@${winnerId}> đã chốt hộp bí ẩn với giá **${winningPrice.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\nMở hộp ra, bên trong là:\n\n${auction.item.emoji} **${auction.item.name.toUpperCase()}**\nĐộ hiếm: **[${auction.item.rarity}]**`)
            .addFields(
                { name: 'Định giá thực tế', value: `\`${(auction.item.actualValue * (isCrit ? critMultiplier : 1)).toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Bạo kích', value: isCrit ? `**x${critMultiplier}**` : '\`Không\`', inline: true },
                { name: 'Kết quả', value: profitMsg, inline: false }
            )
            .setColor(finalColor)
            .setFooter({ text: 'Hệ thống đã tự động quy đổi vật phẩm và cộng tiền vào tài khoản của bạn.' });

        await auction.message.edit({ embeds: [finalEmbed], components: getDynamicButtons(auction.currentBid, true) }).catch(() => {});
    }
};
