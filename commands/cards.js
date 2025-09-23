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

