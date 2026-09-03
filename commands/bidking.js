const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance } = require('../db');

// 🎲 HỆ THỐNG VẬT PHẨM & GIÁ TRỊ THỰC
// BasePrice: Giá sàn hiển thị cho mọi người thấy
// minSell -> maxSell: Khoảng giá trị thực tế của vật phẩm (Hệ thống random ngầm)
const LOOT_TABLE = [
    { name: 'Bình Máu Nhỏ', rarity: 'Thường', color: '#b0c4de', basePrice: 1000, minSell: 1500, maxSell: 3000, weight: 500, emoji: '🧪' },
    { name: 'Kiếm Gỗ Mục', rarity: 'Thường', color: '#b0c4de', basePrice: 1500, minSell: 2000, maxSell: 4000, weight: 450, emoji: '🗡️' },
    
    { name: 'Khiên Sắt Hiệp Sĩ', rarity: 'Hiếm', color: '#3498db', basePrice: 10000, minSell: 12000, maxSell: 25000, weight: 300, emoji: '🛡️' },
    { name: 'Nhẫn Bạc Tinh Xảo', rarity: 'Hiếm', color: '#3498db', basePrice: 15000, minSell: 18000, maxSell: 35000, weight: 250, emoji: '💍' },

    { name: 'Áo Choàng Bóng Tối', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 50000, minSell: 60000, maxSell: 120000, weight: 120, emoji: '🧥' },
    { name: 'Kiếm Quang Minh', rarity: 'Sử Thi', color: '#9b59b6', basePrice: 80000, minSell: 90000, maxSell: 150000, weight: 100, emoji: '✨' },

    { name: 'Vương Miện Cổ Đại', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 200000, minSell: 250000, maxSell: 500000, weight: 35, emoji: '👑' },
    { name: 'Gậy Phép Tối Cao', rarity: 'Huyền Thoại', color: '#f1c40f', basePrice: 300000, minSell: 350000, maxSell: 700000, weight: 25, emoji: '🪄' },

    { name: 'Trứng Rồng Hủy Diệt', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 1000000, minSell: 1200000, maxSell: 3000000, weight: 8, emoji: '🐉' },
    { name: 'Chén Thánh Bất Tử', rarity: 'Thần Thoại', color: '#ff0000', basePrice: 3000000, minSell: 3500000, maxSell: 10000000, weight: 2, emoji: '🏺' }
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

// Nút bấm cố định theo Giá Sàn để tránh nhảy số làm người chơi ấn nhầm
function getDynamicButtons(basePrice, isDisabled = false) {
    let steps = [100, 500, 1000, 5000];
    if (basePrice >= 1000000) steps = [50000, 100000, 200000, 500000];
    else if (basePrice >= 200000) steps = [10000, 50000, 100000, 200000];
    else if (basePrice >= 50000) steps = [5000, 10000, 20000, 50000];
    else if (basePrice >= 10000) steps = [1000, 2000, 5000, 10000];

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
    const hypeLevel = Math.min(Math.floor(auction.totalBids / 3), 10); 
    
    let currentEmoji = '📦';
    let currentName = 'RƯƠNG MÙ BÍ ẨN';
    let currentRarity = '???';
    let currentColor = '#95a5a6';
    let hypePhrase = "Chưa có nhiều manh mối... Rương vẫn đóng kín bưng!";

    if (hypeLevel >= 3) {
        currentRarity = auction.item.rarity;
        currentColor = auction.item.color;
        hypePhrase = "👀 Nắp rương khẽ mở... Màu sắc đã lọt ra! (Đã lộ Độ Hiếm)";
    }
    if (hypeLevel >= 6) {
        currentEmoji = auction.item.emoji;
        currentName = auction.item.name.toUpperCase();
        hypePhrase = "🔍 Hình dáng báu vật đã hiện rõ! (Đã lộ Vật Phẩm)";
    }
    if (hypeLevel >= 10) {
        hypePhrase = "💥 CHÁY MÁY! KHÔ MÁU ĐI ANH EM ƠIIII!!!";
    }

    let desc = `**Chủ xị:** <@${auction.starter}>\n`;
    desc += `**Báu vật:** ${currentEmoji} **${currentName}**\n`;
    desc += `**Độ hiếm:** \`[${currentRarity}]\`\n`;
    desc += `**💰 Giá sàn (Thẩm định):** \`${auction.item.basePrice.toLocaleString()}\` <a:diamondgem:1418649012289933434>\n`;
    desc += `**💎 Giá trị thực:** \`???\` <a:diamondgem:1418649012289933434> *(Bí mật)*\n\n`;
    
    desc += `**🔥 NHIỆT ĐỘ PHIÊN:** \`[Level ${hypeLevel}]\`\n`;
    desc += `${getHypeMeter(hypeLevel)}\n`;
    desc += `*${hypePhrase}*\n\n`;

    desc += `**Thời gian chốt thầu:** <t:${auction.endTime}:R>\n`;
    desc += `**Giá thầu hiện tại:** \`${auction.currentBid.toLocaleString()}\` <a:diamondgem:1418649012289933434>\n`;
    desc += `**👑 NGƯỜI DẪN ĐẦU:** ${auction.highestBidder ? `<@${auction.highestBidder}>` : 'Chưa có ai'}\n`;
    
    desc += `\n**⚠️ LUẬT CHƠI:**\n- Cược chênh lệch **quá thấp (<70%)**: Thương nhân hủy kèo.\n- Cược chênh lệch **quá cao (>130%)**: Khớp lệnh nhưng bị LỖ.\n- Nằm trong vùng an toàn: Nhận tiền lời & Cơ hội BẠO KÍCH!`;

    return new EmbedBuilder()
        .setTitle(`**<a:VerifiedTwitter:1418649004912148511> ĐẤU GIÁ "SINH TỬ"**`)
        .setDescription(desc)
        .setColor(currentColor);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bidking')
        .setDescription('Tổ chức đấu giá sinh tử! Bơm giá, săn bạo kích và coi chừng bị úp bô.')
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
            .setDescription('Hệ thống đang trích xuất một báu vật ngẫu nhiên. Chuẩn bị tiền nào...')
            .setColor('#2c3e50');

        const reply = await interaction.editReply({ embeds: [suspenseEmbed], fetchReply: true });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // currentBid khởi điểm sẽ bằng với Giá Sàn để làm mốc
        const auction = {
            channelId: channelId,
            starter: interaction.user.id,
            item: itemData,
            currentBid: itemData.basePrice,
            highestBidder: null,
            totalBids: 0,
            endTime: endTimeUnix,
            timer: null,
            message: reply,
            isProcessing: false
        };
        activeAuctions.set(channelId, auction);

        const embed = createAuctionEmbed(auction);
        const components = getDynamicButtons(auction.item.basePrice);

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
            return interaction.reply({ content: 'Phiên đấu giá này đã kết thúc.', ephemeral: true });
        }

        if (auction.isProcessing) {
            return interaction.reply({ content: 'Chậm lại một chút! Đang có người khác đẩy giá.', ephemeral: true });
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
                    content: `<a:AbbyCry:1393909295665643540> Bạn không đủ tiền! Cần **${newBid.toLocaleString()}** <a:diamondgem:1418649012289933434>`, 
                    ephemeral: true 
                });
            }

            // Xử lý trừ/hoàn tiền ngay lập tức
            if (auction.highestBidder === userId) {
                // Tự đẩy giá chính mình
                await addBalance(userId, -addAmount);
            } else {
                // Có người cướp top -> Hoàn lại toàn bộ tiền cọc cho người cũ
                if (auction.highestBidder) {
                    await addBalance(auction.highestBidder, auction.currentBid);
                }
                // Trừ tiền cọc của người mới
                await addBalance(userId, -newBid);
            }

            auction.currentBid = newBid;
            auction.highestBidder = userId;
            auction.totalBids++; 

            // Anti-snipe
            const now = Math.floor(Date.now() / 1000);
            if (auction.endTime - now < 10) {
                auction.endTime += 10;
            }

            const updatedEmbed = createAuctionEmbed(auction);
            const updatedComponents = getDynamicButtons(auction.item.basePrice);

            await auction.message.edit({ embeds: [updatedEmbed], components: updatedComponents }).catch(() => {});

        } catch (error) {
            console.error("Lỗi khi xử lý đấu giá BidKing:", error);
        } finally {
            auction.isProcessing = false;
        }
    },

    async endAuction(channelId, auction) {
        activeAuctions.delete(channelId);
        
        const actualValue = auction.item.actualValue;

        if (!auction.highestBidder) {
            const embed = new EmbedBuilder()
                .setTitle('⚖️ KẾT THÚC ĐẤU GIÁ - HỦY BỎ')
                .setDescription(`Rương mở ra: ${auction.item.emoji} **${auction.item.name}** [${auction.item.rarity}]\nGiá trị thực: **${actualValue.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\n📉 **Không có ai tham gia!** Lô hàng đã bị thương nhân thu hồi.`)
                .setColor('#95a5a6');
            await auction.message.edit({ embeds: [embed], components: getDynamicButtons(auction.item.basePrice, true) }).catch(() => {});
            return;
        }

        const winnerId = auction.highestBidder;
        const winningPrice = auction.currentBid;
        
        // Vùng an toàn 70% - 130%
        const minAcceptable = Math.floor(actualValue * 0.7);
        const maxAcceptable = Math.floor(actualValue * 1.3);

        // Trường hợp 1: Trả giá quá bèo (< 70%)
        if (winningPrice < minAcceptable) {
            // Hoàn lại tiền cọc cho người giữ top
            await addBalance(winnerId, winningPrice);
            
            const failEmbed = new EmbedBuilder()
                .setTitle('⚖️ KẾT THÚC ĐẤU GIÁ - GIAO DỊCH THẤT BẠI')
                .setDescription(`Rương mở ra: ${auction.item.emoji} **${auction.item.name}** [${auction.item.rarity}]\nGiá trị thực: **${actualValue.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\n📉 **Thương nhân từ chối bán!** Mức giá ${winningPrice.toLocaleString()} quá thấp so với giá trị vật phẩm.\n✅ Tiền cọc đã được hoàn trả 100% cho <@${winnerId}>.`)
                .setColor('#95a5a6');
            await auction.message.edit({ embeds: [failEmbed], components: getDynamicButtons(auction.item.basePrice, true) }).catch(() => {});
            return;
        }

        // Trường hợp 2 & 3: Mua hớ (> 130%) HOẶC Khớp lệnh thành công (70% - 130%)
        // Cả 2 trường hợp này người chơi đều được nhận tiền bán vật phẩm (tiền cọc đã trừ lúc bấm nút rồi)
        
        let finalReward = actualValue;
        let isCrit = false;
        let critMultiplier = 1;

        // Bạo kích CHỈ áp dụng nếu nằm trong vùng an toàn
        if (winningPrice <= maxAcceptable) {
            isCrit = Math.random() < 0.10; 
            if (isCrit) {
                critMultiplier = Math.floor(Math.random() * 9) + 2; 
                finalReward = actualValue * critMultiplier;
            }
        }

        await addBalance(winnerId, finalReward);
        const profit = finalReward - winningPrice;

        let profitMsg = "";
        let resultTitle = '<a:VerifiedTwitter:1418649004912148511> GIAO DỊCH THÀNH CÔNG!';
        let finalColor = '#2ecc71';

        if (profit > 0) {
            profitMsg = `📈 **Lời to:** \`+${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434>`;
            if (isCrit) {
                resultTitle = `💥💥💥 BẠO KÍCH SIÊU CẤP x${critMultiplier}!!! 💥💥💥`;
                finalColor = '#ff4500';
            }
        } else if (profit === 0) {
            profitMsg = `🤝 **Hòa vốn:** \`0\` <a:diamondgem:1418649012289933434>`;
            finalColor = '#f1c40f';
        } else {
            profitMsg = `📉 **Lỗ sặc máu:** \`${profit.toLocaleString()}\` <a:diamondgem:1418649012289933434> (Mua hớ rồi!)`;
            finalColor = '#e74c3c';
            resultTitle = '💸 ÚP BÔ THÀNH CÔNG!';
        }

        const finalEmbed = new EmbedBuilder()
            .setTitle(resultTitle)
            .setDescription(`Búa đã gõ! <@${winnerId}> chốt đơn với mức giá **${winningPrice.toLocaleString()}** <a:diamondgem:1418649012289933434>\n\nMở rương ra, bên trong là:\n${auction.item.emoji} **${auction.item.name.toUpperCase()}**\nĐộ hiếm: **[${auction.item.rarity}]**`)
            .addFields(
                { name: 'Vùng giá hợp lý (±30%)', value: `Từ \`${minAcceptable.toLocaleString()}\` đến \`${maxAcceptable.toLocaleString()}\``, inline: false },
                { name: 'Giá trị thực tế', value: `\`${actualValue.toLocaleString()}\` <a:diamondgem:1418649012289933434>`, inline: true },
                { name: 'Bạo kích', value: isCrit ? `**x${critMultiplier}**` : '\`Không\`', inline: true },
                { name: 'Kết quả', value: profitMsg, inline: false }
            )
            .setColor(finalColor)
            .setFooter({ text: 'Hệ thống đã tự động quy đổi vật phẩm và cộng tiền vào tài khoản của bạn.' });

        await auction.message.edit({ embeds: [finalEmbed], components: getDynamicButtons(auction.item.basePrice, true) }).catch(() => {});
    }
};
