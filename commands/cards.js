const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance, getUser } = require('../db');
const { CARDS, CARD_RARITY_RATE } = require('../card_data');

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
        ),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const subcommand = interaction.options.getSubcommand();
            const user = await getUser(userId);

            switch (subcommand) {
                case 'mo': {
                    const userBalance = await getBalance(userId);
                    if (userBalance < CARD_PACK_COST) {
                        return interaction.editReply({ content: `Bạn không đủ tiền để mua một gói thẻ. Cần **${CARD_PACK_COST}**<a:diamondgem:1402590496647413811>.`, ephemeral: true });
                    }
    
                    await addBalance(userId, -CARD_PACK_COST);
                    
                    const receivedCards = [];
                    for (let i = 0; i < MAX_CARDS_PER_PACK; i++) {
                        const card = getRandomCard();
                        if (card) {
                            const existingCard = user.cards.find(c => c.type === card.type);
                            if (existingCard) {
                                existingCard.count++;
                            } else {
                                user.cards.push({ type: card.type, count: 1, rarity: card.rarity });
                            }
                            receivedCards.push(card);
                        }
                    }
                    await user.save();
    
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
                        return interaction.editReply({ content: 'Bạn chưa có thẻ bài nào. Hãy dùng `/thebai mo` để mở gói thẻ đầu tiên!', ephemeral: true });
                    }
                    
                    const rarityOption = interaction.options.getString('rarity');
                    const allCards = Object.values(CARDS).flat();
                    
                    if (rarityOption) {
                        const cardsToShow = user.cards.filter(c => c.rarity === rarityOption);
                        if (cardsToShow.length === 0) {
                            return interaction.editReply({ content: `Bạn không có thẻ bài nào với độ hiếm **${rarityOption}**.`, ephemeral: true });
                        }
                        
                        const cards = cardsToShow.map(card => {
                            const cardData = allCards.find(c => c.name.replace(/\s/g, '_') === card.type);
                            if (!cardData) return null;
                            const embed = new EmbedBuilder()
                                .setTitle(`${cardData.emoji} **${cardData.name}** [${card.rarity}]`)
                                .setDescription(`*${cardData.description}*`)
                                .addFields(
                                    { name: 'Số lượng', value: `\`${card.count}\``, inline: true },
                                    { name: 'Chỉ số', value: `ATK: \`${cardData.stats.attack}\`, HP: \`${cardData.stats.hp}\``, inline: true }
                                )
                                .setColor(cardData.color || '#3498db');
                            if (cardData.imageUrl) {
                                embed.setImage(cardData.imageUrl);
                            }
                            return embed;
                        }).filter(Boolean);

                        if (cards.length > 0) {
                            return interaction.editReply({ embeds: cards });
                        } else {
                            return interaction.editReply({ content: 'Không tìm thấy thẻ bài để hiển thị.', ephemeral: true });
                        }
                    } else {
                        const cardsByRarity = {
                            'Thường': [], 'Hiếm': [], 'Sử Thi': [], 'Huyền Thoại': [], 'Thần Thoại': []
                        };
                        
                        user.cards.forEach(card => {
                            if (cardsByRarity[card.rarity]) {
                                cardsByRarity[card.rarity].push(card);
                            }
                        });

                        const embeds = [];
                        
                        // Embeds for cards with images
                        const imageRarities = ['Sử Thi', 'Huyền Thoại', 'Thần Thoại'];
                        for (const rarity of imageRarities) {
                            const cards = cardsByRarity[rarity];
                            if (cards.length > 0) {
                                const embed = new EmbedBuilder()
                                    .setTitle(`Bộ sưu tập thẻ [${rarity}]`)
                                    .setColor(allCards.find(c => c.rarity === rarity)?.color || '#3498db');
                                
                                cards.forEach(card => {
                                    const cardData = allCards.find(c => c.name.replace(/\s/g, '_') === card.type);
                                    if (cardData) {
                                        embed.addFields({
                                            name: `${cardData.emoji} **${cardData.name}**`,
                                            value: `Số lượng: **${card.count}**`,
                                            inline: false
                                        });
                                    }
                                });
                                embeds.push(embed);
                            }
                        }

                        // Single embed for cards without images
                        const textRarities = ['Thường', 'Hiếm'];
                        const textCards = user.cards.filter(c => textRarities.includes(c.rarity));
                        if (textCards.length > 0) {
                            const textEmbed = new EmbedBuilder()
                                .setTitle('Các thẻ Thường và Hiếm')
                                .setColor('#7f8c8d');
                            const textContent = textCards.map(card => {
                                const cardData = allCards.find(c => c.name.replace(/\s/g, '_') === card.type);
                                return `- **${cardData.name}** [${card.rarity}]: **${card.count}** thẻ`;
                            }).join('\n');
                            textEmbed.setDescription(textContent);
                            embeds.push(textEmbed);
                        }

                        if (embeds.length === 0) {
                            return interaction.editReply({ content: 'Bạn chưa có thẻ bài nào. Hãy dùng `/thebai mo` để mở gói thẻ đầu tiên!', ephemeral: true });
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
                        user.cards = user.cards.filter(c => c.type !== card.type);
                    }
                    
                    await addBalance(userId, sellPrice);
                    await user.save();
    
                    const embed = new EmbedBuilder()
                        .setTitle(`<a:Verified:1406631971509243974> **Bán Thẻ Thành Công**`)
                        .setDescription(`Bạn đã bán **${cardToFind.name}** và nhận được **${sellPrice}**<a:diamondgem:1402590496647413811>.`)
                        .setColor('#2ecc71');
                    
                    await interaction.editReply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Đã xảy ra lỗi khi thực thi lệnh này.' });
        }
    }
};
