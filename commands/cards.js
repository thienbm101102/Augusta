const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance, getUser, saveDB, getDB } = require('../db');
const { CARDS, CARD_RARITY_RATE } = require('../card_data');
const { v4: uuidv4 } = require('uuid');

const CARD_PACK_COST = 50000;
const MAX_CARDS_PER_PACK = 3;
const ITEMS_PER_PAGE = 1;

const CARD_SELL_PRICES = {
    'Thường': Math.floor(CARD_PACK_COST * 0.2),
    'Hiếm': Math.floor(CARD_PACK_COST * 0.5),
    'Sử Thi': Math.floor(CARD_PACK_COST * 1.0),
};

const RARITIES_WITH_IMAGES = ['Sử Thi', 'Huyền Thoại', 'Thần Thoại'];
const RARITIES_WITHOUT_IMAGES = ['Thường', 'Hiếm'];

function getRandomCard() {
    const rarityKeys = Object.keys(CARD_RARITY_RATE);
    let rand = Math.random();
    
    for (const rarity of rarityKeys) {
        if (rand < CARD_RARITY_RATE[rarity]) {
            const cardsInRarity = CARDS[rarity];
            const randomIndex = Math.floor(Math.random() * cardsInRarity.length);
            return {
                type: cardsInRarity[randomIndex].name.replace(/\s/g, '_'),
                rarity: rarity,
                data: cardsInRarity[randomIndex]
            };
        }
        rand -= CARD_RARITY_RATE[rarity];
    }
    return null;
}

async function renderCollectionPage(interaction, cardsToDisplay, page, rarity) {
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedCards = cardsToDisplay.slice(start, end);
    const totalPages = Math.ceil(cardsToDisplay.length / ITEMS_PER_PAGE);

    let title = `Bộ Sưu Tập Thẻ Của ${interaction.member.displayName}`;
    let description = `Bạn đang sở hữu **${cardsToDisplay.reduce((sum, card) => sum + card.count, 0)}** thẻ bài.`;
    if (rarity) {
        title = `Bộ Sưu Tập Thẻ [${rarity}] của ${interaction.member.displayName}`;
        description = `Bạn đang sở hữu **${cardsToDisplay.reduce((sum, card) => sum + card.count, 0)}** thẻ bài ${rarity}.`;
    }
    description += `\n Trang **${page + 1}/${totalPages === 0 ? 1 : totalPages}**`;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#3498db');

    if (paginatedCards.length > 0) {
        const firstCardData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === paginatedCards[0].type);
        if (firstCardData && RARITIES_WITH_IMAGES.includes(firstCardData.rarity)) {
            embed.setImage(firstCardData.imageUrl);
        }
        
        paginatedCards.forEach(card => {
            const cardData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === card.type);
            if (cardData) {
                embed.addFields({
                    name: `**${cardData.name}** [${card.rarity}]`,
                    value: `**Số lượng:** ${card.count}\n**Chỉ số:** Tấn công: ${cardData.stats.attack}, Máu: ${cardData.stats.hp}`,
                    inline: false
                });
            }
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`prev_collection_${rarity || 'all'}`)
            .setLabel('Trang Trước')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`next_collection_${rarity || 'all'}`)
            .setLabel('Trang Sau')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1)
    );

    // Sử dụng i.editReply thay vì interaction.editReply để phản hồi lại tương tác của nút bấm
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row] });
    }
}

async function renderMarketPage(interaction, page) {
    const marketplace = getDB().marketplace || [];
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedListings = marketplace.slice(start, end);
    const totalPages = Math.ceil(marketplace.length / ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('<a:Verified:1406631971509243974> **Các Thẻ Bài Đang Được Bán**')
        .setDescription(`Có **${marketplace.length}** rao bán trên thị trường.\nTrang **${page + 1}/${totalPages}**`)
        .setColor('#2ecc71');

    if (paginatedListings.length > 0) {
        const firstListingData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === paginatedListings[0].cardType);
        if (firstListingData && RARITIES_WITH_IMAGES.includes(firstListingData.rarity)) {
            embed.setImage(firstListingData.imageUrl);
        }

        paginatedListings.forEach(listing => {
            const cardData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === listing.cardType);
            if (cardData) {
                embed.addFields({
                    name: `Rao bán: **${cardData.name}** [${listing.rarity}]`,
                    value: `**Số lượng:** ${listing.amount}\n**Giá:** ${listing.price}<a:diamondgem:1402590496647413811>\n**Người bán:** <@${listing.sellerId}>\n**ID:** \`${listing.id}\``,
                    inline: false
                });
            }
        });
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('prev_market')
            .setLabel('Trang Trước')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId('next_market')
            .setLabel('Trang Sau')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1)
    );

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row] });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thebai')
        .setDescription('Lệnh cho trò chơi sưu tập thẻ bài')
        .addSubcommand(subcommand =>
            subcommand
                .setName('mo')
                .setDescription('Mở một gói thẻ bài mới')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                .setDescription('Xem bộ sưu tập thẻ bài của bạn')
                .addStringOption(option =>
                    option.setName('rarity')
                        .setDescription('Lọc theo độ hiếm của thẻ')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Thường', value: 'Thường' },
                            { name: 'Hiếm', value: 'Hiếm' },
                            { name: 'Sử Thi', value: 'Sử Thi' },
                            { name: 'Huyền Thoại', value: 'Huyền Thoại' },
                            { name: 'Thần Thoại', value: 'Thần Thoại' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Bán một thẻ bài để lấy tiền')
                .addStringOption(option =>
                    option.setName('card_name')
                        .setDescription('Tên thẻ bài bạn muốn bán')
                        .setRequired(true)
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('market')
                .setDescription('Thị trường trao đổi thẻ giữa người chơi')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('raoban')
                        .setDescription('Đăng bán một thẻ bài của bạn trên thị trường')
                        .addStringOption(option =>
                            option.setName('card_name')
                                .setDescription('Tên thẻ bài bạn muốn bán')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option.setName('price')
                                .setDescription('Giá bán của thẻ')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addIntegerOption(option =>
                            option.setName('amount')
                                .setDescription('Số lượng thẻ muốn bán (mặc định là 1)')
                                .setRequired(false)
                                .setMinValue(1)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('xem')
                        .setDescription('Xem các thẻ bài đang được rao bán trên thị trường')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('mua')
                        .setDescription('Mua một thẻ bài từ thị trường')
                        .addStringOption(option =>
                            option.setName('listing_id')
                                .setDescription('ID của thẻ bạn muốn mua')
                                .setRequired(true)
                        )
                )
        ),
    async execute(interaction) {
        // Luôn deferReply() ở đầu để tránh lỗi hết hạn tương tác
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const user = getUser(userId);
            
            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand();

            if (subcommandGroup === 'market') {
                switch (subcommand) {
                    case 'raoban': {
    const cardName = interaction.options.getString('card_name');
    const price = interaction.options.getInteger('price');
    const amount = interaction.options.getInteger('amount') || 1;

    // Lấy database mới nhất để đảm bảo dữ liệu đồng bộ
    const db = getDB();
    const user = db.users[userId];

    if (!user) {
        return interaction.editReply({ content: 'Không tìm thấy thông tin người dùng. Vui lòng thử lại sau.' });
    }

    const allCards = Object.values(CARDS).flat();
    const cardToFind = allCards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
    
    if (!cardToFind) {
        return interaction.editReply({ content: `Không tìm thấy thẻ bài với tên \`${cardName}\`.`, ephemeral: true });
    }

    const userCard = user.cards.find(c => c.type === cardToFind.name.replace(/\s/g, '_'));
    
    if (!userCard || userCard.count < amount) {
        return interaction.editReply({ content: `Bạn không có đủ **${amount}** thẻ **${cardToFind.name}** để bán.`, ephemeral: true });
    }

    // Trừ thẻ khỏi bộ sưu tập của người dùng
    userCard.count -= amount;
    if (userCard.count === 0) {
        user.cards = user.cards.filter(c => c.type !== userCard.type);
    }

    // Tạo rao bán mới và thêm vào marketplace
    const newListing = {
        id: uuidv4(),
        cardType: cardToFind.name.replace(/\s/g, '_'),
        rarity: cardToFind.rarity,
        sellerId: userId,
        price: price,
        amount: amount
    };

    if (!db.marketplace) db.marketplace = [];
    db.marketplace.push(newListing);
    
    // Lưu lại toàn bộ thay đổi
    saveDB();

    await interaction.editReply(`Đã đăng bán **${amount}** thẻ **${cardToFind.name}** với tổng giá **${price * amount}**<a:diamondgem:1402590496647413811>. ID: \`${newListing.id}\``);
    break;
}
                    case 'xem': {
                        const marketplace = getDB().marketplace || [];
                        if (marketplace.length === 0) {
                            return interaction.editReply({ content: 'Thị trường hiện chưa có rao bán nào.' });
                        }

                        let page = 0;
                        await renderMarketPage(interaction, page);

                        const filter = i => i.user.id === interaction.user.id && (i.customId === 'prev_market' || i.customId === 'next_market');
                        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 }); // Tăng thời gian lắng nghe lên 10 phút

                        collector.on('collect', async i => {
                            await i.deferUpdate();
                            
                            const marketplace = getDB().marketplace || [];
                            const totalPages = Math.ceil(marketplace.length / ITEMS_PER_PAGE);

                            if (i.customId === 'next_market') {
                                page = (page + 1) % totalPages;
                            } else if (i.customId === 'prev_market') {
                                page = (page - 1 + totalPages) % totalPages;
                            }
                            
                            await renderMarketPage(i, page);
                        });

                        collector.on('end', async () => {
                            try {
                                const disabledRow = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder().setCustomId('prev_market').setLabel('Trang Trước').setStyle(ButtonStyle.Secondary).setDisabled(true),
                                    new ButtonBuilder().setCustomId('next_market').setLabel('Trang Sau').setStyle(ButtonStyle.Secondary).setDisabled(true)
                                );
                                await interaction.editReply({ components: [disabledRow] });
                            } catch (e) {
                                console.error('Error disabling buttons:', e.message);
                            }
                        });
                        break;
                    }

                    case 'mua': {
    const listingId = interaction.options.getString('listing_id');
    
    // Lấy database mới nhất để đảm bảo dữ liệu đồng bộ
    const db = getDB();
    const marketplace = db.marketplace || [];
    const listing = marketplace.find(l => l.id === listingId);

    if (!listing) {
        return interaction.editReply({ content: 'Không tìm thấy rao bán này. Vui lòng kiểm tra lại ID.', ephemeral: true });
    }
    if (listing.sellerId === userId) {
        return interaction.editReply({ content: 'Bạn không thể mua thẻ của chính mình.', ephemeral: true });
    }

    const buyer = getUser(userId);
    const seller = getUser(listing.sellerId);
    const totalCost = listing.price * listing.amount;

    if (buyer.balance < totalCost) {
        return interaction.editReply({ content: `Bạn không đủ tiền để mua thẻ này. Cần **${totalCost}**<a:diamondgem:1402590496647413811>.`, ephemeral: true });
    }

    addBalance(userId, -totalCost);
    addBalance(listing.sellerId, totalCost);

    const cardData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === listing.cardType);
    const existingCard = buyer.cards.find(c => c.type === listing.cardType);
    if (existingCard) {
        existingCard.count += listing.amount;
    } else {
        buyer.cards.push({ type: listing.cardType, rarity: listing.rarity, count: listing.amount });
    }

    // Xóa rao bán khỏi marketplace
    db.marketplace = db.marketplace.filter(l => l.id !== listingId);
    saveDB();

    const embed = new EmbedBuilder()
        .setTitle(`<a:Verified:1406631971509243974> **Giao dịch thành công**`)
        .setDescription(`Bạn đã mua thành công **${listing.amount}** thẻ **${cardData.name}** từ <@${listing.sellerId}> với giá **${totalCost}**<a:diamondgem:1402590496647413811>.`)
        .setColor('#3498db')
        .setThumbnail(cardData.imageUrl);
        
    await interaction.editReply({ embeds: [embed] });
    break;
}
                }
            } else {
                switch (subcommand) {
                    case 'mo': {
                        if (getBalance(userId) < CARD_PACK_COST) {
                            // Sửa lỗi: dùng editReply thay cho reply
                            return interaction.editReply({ content: `Bạn không đủ tiền để mua một gói thẻ. Cần **${CARD_PACK_COST}**<a:diamondgem:1402590496647413811>.`, ephemeral: true });
                        }
    
                        addBalance(userId, -CARD_PACK_COST);
                        
                        const receivedCards = [];
                        for (let i = 0; i < MAX_CARDS_PER_PACK; i++) {
                            const card = getRandomCard();
                            if (card) {
                                const existingCard = user.cards.find(c => c.type === card.type);
                                if (existingCard) {
                                    existingCard.count++;
                                } else {
                                    user.cards.push({ ...card, count: 1 });
                                }
                                receivedCards.push(card);
                            }
                        }
                        saveDB();
    
                        const embeds = receivedCards.map(card => {
                            const existingCard = user.cards.find(c => c.type === card.type);
                            const embed = new EmbedBuilder()
                                .setTitle(`<a:Verified:1406631971509243974> **Bạn Đã Mở Một Gói Thẻ**`)
                                .setDescription(`Bạn nhận được thẻ **${card.data.name} [${card.rarity}]**`)
                                .setColor('#ffc800')
                                .setImage(card.data.imageUrl)
                                .addFields({
                                    name: `Thông tin thẻ`,
                                    value: `*${card.data.description}*\n**Số lượng:** ${existingCard.count}\n**Chỉ số:** Tấn công: ${card.data.stats.attack}, Máu: ${card.data.stats.hp}`,
                                    inline: false
                                });
                            return embed;
                        });
                        
                        await interaction.editReply({ embeds: embeds });
                        break;
                    }
    
                    case 'xem': {
                        if (!user.cards || user.cards.length === 0) {
                            return interaction.editReply({ content: 'Bạn chưa có thẻ bài nào. Hãy dùng `/cards mo` để mở gói thẻ đầu tiên!', ephemeral: true });
                        }
                        
                        const rarityOption = interaction.options.getString('rarity');
                        let cardsToShow = user.cards;

                        if (rarityOption) {
                            cardsToShow = user.cards.filter(c => c.rarity === rarityOption);
                            if (cardsToShow.length === 0) {
                                return interaction.editReply({ content: `Bạn không có thẻ bài nào với độ hiếm **${rarityOption}**.`, ephemeral: true });
                            }

                            let page = 0;
                            await renderCollectionPage(interaction, cardsToShow, page, rarityOption);

                            const filter = i => i.user.id === interaction.user.id && (i.customId.startsWith('prev_collection') || i.customId.startsWith('next_collection'));
                            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

                            collector.on('collect', async i => {
                                const [, , rarityId] = i.customId.split('_');

                                if (rarityId !== (rarityOption || 'all')) {
                                    return;
                                }

                                if (i.customId.startsWith('next_collection')) {
                                    page++;
                                } else if (i.customId.startsWith('prev_collection')) {
                                    page--;
                                }

                                await i.deferUpdate();
                                await renderCollectionPage(i, cardsToShow, page, rarityOption);
                            });

                            collector.on('end', async () => {
                                try {
                                    const disabledRow = new ActionRowBuilder().addComponents(
                                        new ButtonBuilder().setCustomId('prev_collection').setLabel('Trang Trước').setStyle(ButtonStyle.Secondary).setDisabled(true),
                                        new ButtonBuilder().setCustomId('next_collection').setLabel('Trang Sau').setStyle(ButtonStyle.Secondary).setDisabled(true)
                                    );
                                    await interaction.editReply({ components: [disabledRow] });
                                } catch (e) {
                                    console.error('Error disabling buttons:', e.message);
                                }
                            });
                        } else {
                            const embeds = [];

                            const imageCards = user.cards.filter(c => RARITIES_WITH_IMAGES.includes(c.rarity));
                            for (const card of imageCards) {
                                const cardData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === card.type);
                                if (cardData) {
                                    const embed = new EmbedBuilder()
                                        .setTitle(`${cardData.name} [${card.rarity}]`)
                                        .setDescription(`**Số lượng:** ${card.count}\n**Chỉ số:** Tấn công: ${cardData.stats.attack}, Máu: ${cardData.stats.hp}`)
                                        .setColor('#9b59b6')
                                        .setImage(cardData.imageUrl);
                                    embeds.push(embed);
                                }
                            }

                            const textCards = user.cards.filter(c => RARITIES_WITHOUT_IMAGES.includes(c.rarity));
                            if (textCards.length > 0) {
                                const textEmbed = new EmbedBuilder()
                                    .setTitle('Các Thẻ Thường và Hiếm')
                                    .setColor('#7f8c8d');
                                const textContent = textCards.map(card => {
                                    const cardData = Object.values(CARDS).flat().find(c => c.name.replace(/\s/g, '_') === card.type);
                                    if (cardData) {
                                        return `- **${cardData.name}** [${card.rarity}]: ${card.count} thẻ`;
                                    }
                                    return '';
                                });
                                textEmbed.setDescription(textContent.filter(Boolean).join('\n'));
                                embeds.push(textEmbed);
                            }

                            if (embeds.length === 0) {
                                return interaction.editReply({ content: 'Bạn chưa có thẻ bài nào. Hãy dùng `/cards mo` để mở gói thẻ đầu tiên!', ephemeral: true });
                            }

                            await interaction.editReply({ embeds: embeds });
                        }
                        break;
                    }
    
                    case 'ban': {
                        const cardName = interaction.options.getString('card_name');
                        
                        const allCards = Object.values(CARDS).flat();
                        const cardToFind = allCards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
    
                        if (!cardToFind) {
                            return interaction.editReply({ content: `Không tìm thấy thẻ bài với tên \`${cardName}\`.`, ephemeral: true });
                        }
    
                        const card = user.cards.find(c => c.type === cardToFind.name.replace(/\s/g, '_'));
    
                        if (!card || card.count <= 0) {
                            return interaction.editReply({ content: `Bạn không có thẻ bài \`${cardName}\` nào để bán.`, ephemeral: true });
                        }
    
                        const sellPrice = CARD_SELL_PRICES[card.rarity];
                        if (!sellPrice) {
                            return interaction.editReply({ content: 'Giá bán của thẻ này không xác định. Vui lòng liên hệ quản trị viên.' });
                        }
    
                        card.count--;
                        if (card.count === 0) {
                            const cardIndex = user.cards.findIndex(c => c.type === card.type);
                            user.cards.splice(cardIndex, 1);
                        }
                        
                        addBalance(userId, sellPrice);
                        saveDB();
    
                        const embed = new EmbedBuilder()
                            .setTitle(`<a:Verified:1406631971509243974> **Bán Thẻ Thành Công**`)
                            .setDescription(`Bạn đã bán **${cardToFind.name}** và nhận được **${sellPrice}**<a:diamondgem:1402590496647413811>.`)
                            .setColor('#2ecc71');
                        
                        await interaction.editReply({ embeds: [embed] });
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(error);
            // Sửa lỗi: luôn dùng editReply vì đã deferReply ở đầu
            await interaction.editReply({ content: 'Đã xảy ra lỗi khi thực thi lệnh này.' });
        }
    }
};