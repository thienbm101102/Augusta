const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, EmbedBuilder, MessageFlags, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { addBalance, getBalance, getUser } = require("../db");

const shopPath = path.join(__dirname, "../shop.json");
const bannersFolder = path.join(__dirname, "../banners");
const badgesFolder = path.join(__dirname, "../badges");

const getItemName = (filename) => {
    const customNames = {
        "banner1.png": "Hoa Đào",
        "banner2.png": "Bước Vào Giấc Mơ",
        "banner3.png": "Công Viên Mộng Mơ",
        "banner4.png": "Mãi Bên Nhau Bạn Nhé",
        "vannguoime.png": "Danh hiệu: Vạn Người Mê",
        "daigia.png": "Danh hiệu: Đại Gia",
        "uyviencakhia.png": "Danh hiệu: Ủy Viên Cà Khịa",
        "tinhyeubenvung.png": "Danh hiệu: Tình Yêu Bền Vững",
        "lehoinguyentieu.png": "Danh hiệu: Lễ Hội Nguyên Tiêu",
        "daivuongsamac.png": "Danh hiệu: Đại Vương Sa Mạc",
        "thulinh.png": "Danh hiệu: Thủ Lĩnh Tộc Bom",
        "tinhanh.png": "Danh hiệu: Tinh Anh Tộc Bom",
        "quocvuongbom.png": "Danh hiệu: Quốc Vương Tộc Bom",
        "king.png": "Danh hiệu: Vua",
        "hacker.png": "Danh hiệu: Hacker",
        "bupbe.png": "Danh hiệu: Búp Bê",
    };
    return customNames[filename] || filename.split('.')[0];
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Mua các vật phẩm đặc biệt như banner và huy hiệu')
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                .setDescription('Xem và mua các vật phẩm trong cửa hàng')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('trangbi')
                .setDescription('Trang bị một banner hoặc huy hiệu bạn đã mua')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const user = await getUser(userId);

        if (!user.ownedBanners) user.ownedBanners = [];
        if (!user.ownedBadges) user.ownedBadges = [];

        switch (subcommand) {
            case 'xem': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                try {
                    const shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));

                    // Tạo embed cho Banners
                    const bannersEmbed = new EmbedBuilder()
                        .setTitle('🖼️ Banners trong Cửa Hàng')
                        .setDescription(`Sử dụng các nút bên dưới để mua banner.`)
                        .setColor('#F7DC6F');

                    const bannersRow = new ActionRowBuilder();
                    shopData.banners.forEach(b => {
                        const button = new ButtonBuilder()
                            .setCustomId(`buy_banner_${b.file}`)
                            .setLabel(`${getItemName(b.file)} (${b.cost.toLocaleString()})`)
                            .setStyle(ButtonStyle.Success);
                        bannersRow.addComponents(button);
                    });

                    // Tạo embed cho Badges
                    const badgesEmbed = new EmbedBuilder()
                        .setTitle('🏅 Huy Hiệu trong Cửa Hàng')
                        .setDescription(`Sử dụng các nút bên dưới để mua huy hiệu.`)
                        .setColor('#9b59b6');

                    const badgesRow = new ActionRowBuilder();
                    shopData.badges.forEach(b => {
                        const button = new ButtonBuilder()
                            .setCustomId(`buy_badge_${b.file}`)
                            .setLabel(`${getItemName(b.file)} (${b.cost.toLocaleString()})`)
                            .setStyle(ButtonStyle.Success);
                        badgesRow.addComponents(button);
                    });
                    
                    const ownedBannersList = user.ownedBanners.length > 0
                        ? user.ownedBanners.map(b => `\`${b}\``).join(', ')
                        : 'Không có';
                    
                    const ownedBadgesList = user.ownedBadges.length > 0
                        ? user.ownedBadges.map(b => `\`${b}\``).join(', ')
                        : 'Không có';

                    const ownedEmbed = new EmbedBuilder()
                        .setTitle('🎒 Vật Phẩm Của Bạn')
                        .setDescription(`Bạn có **${user.balance.toLocaleString()}**<a:diamondgem:1402590496647413811>.\nBạn có thể trang bị các vật phẩm này bằng lệnh \`/shop trangbi\``)
                        .addFields(
                            { name: '🖼️ Banners', value: ownedBannersList, inline: false },
                            { name: '🏅 Huy Hiệu', value: ownedBadgesList, inline: false }
                        )
                        .setColor('#9b59b6');

                    await interaction.editReply({ 
                        embeds: [bannersEmbed, badgesEmbed, ownedEmbed], 
                        components: [bannersRow, badgesRow]
                    });

                } catch (error) {
                    console.error(error);
                    await interaction.editReply({ content: 'Đã xảy ra lỗi khi đọc dữ liệu cửa hàng. Vui lòng thử lại sau.' });
                }
                break;
            }

            case 'trangbi': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                const bannersOwned = user.ownedBanners.map(b => ({
                    label: getItemName(b),
                    value: `equip_banner_${b}`,
                }));

                const badgesOwned = user.ownedBadges.map(b => ({
                    label: getItemName(b),
                    value: `equip_badge_${b}`,
                }));

                if (bannersOwned.length === 0 && badgesOwned.length === 0) {
                    return interaction.editReply({ content: 'Bạn không có bất kỳ banner hoặc huy hiệu nào để trang bị. Vui lòng mua chúng từ cửa hàng.' });
                }

                const rows = [];
                if (bannersOwned.length > 0) {
                    const bannerSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('equip_banner_select')
                        .setPlaceholder('Chọn một Banner để trang bị...')
                        .addOptions(bannersOwned);
                    rows.push(new ActionRowBuilder().addComponents(bannerSelectMenu));
                }

                if (badgesOwned.length > 0) {
                    const badgeSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('equip_badge_select')
                        .setPlaceholder('Chọn một Huy hiệu để trang bị...')
                        .addOptions(badgesOwned);
                    rows.push(new ActionRowBuilder().addComponents(badgeSelectMenu));
                }

                const embed = new EmbedBuilder()
                    .setTitle('Trang Bị Vật Phẩm')
                    .setDescription('Vui lòng chọn banner hoặc huy hiệu bạn muốn trang bị từ menu bên dưới.')
                    .setColor('#3498db');

                await interaction.editReply({
                    embeds: [embed],
                    components: rows,
                });

                break;
            }
        }
    },
    // Hàm xử lý nút bấm
    async handleButton(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const [action, itemType, itemName] = interaction.customId.split('_');
        const userId = interaction.user.id;
        const user = await getUser(userId);

        if (action !== 'buy') {
            return;
        }

        try {
            const shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));
            const allItems = [...shopData.banners, ...shopData.badges];
            const itemToBuy = allItems.find(item => item.file === itemName);

            if (!itemToBuy) {
                return interaction.editReply({ content: 'Vật phẩm bạn chọn không tồn tại trong cửa hàng.' });
            }

            const userBalance = await getBalance(userId);
            const itemPrice = itemToBuy.cost;

            if (userBalance < itemPrice) {
                return interaction.editReply({ 
                    content: `Bạn không đủ tiền để mua vật phẩm này. Vật phẩm cần **${itemPrice.toLocaleString()}**<a:diamondgem:1402590496647413811> nhưng bạn chỉ có **${userBalance.toLocaleString()}**<a:diamondgem:1402590496647413811>.`
                });
            }

            if (user.ownedBanners.includes(itemName) || user.ownedBadges.includes(itemName)) {
                return interaction.editReply({ content: `Bạn đã sở hữu vật phẩm này rồi.` });
            }

            await addBalance(userId, -itemPrice);

            if (itemType === 'banner') {
                user.ownedBanners.push(itemName);
                user.banner = itemName;
            } else if (itemType === 'badge') {
                user.ownedBadges.push(itemName);
                user.badge = itemName;
            }

            await user.save();

            const updatedEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('**<a:Verified:1406631971509243974> Mua Thành Công!**')
                .setDescription(`Bạn đã mua thành công **${getItemName(itemName)}** với giá **${itemPrice.toLocaleString()}**<a:diamondgem:1402590496647413811>.`)
                .addFields(
                    { name: 'Số dư hiện tại', value: `${(await getBalance(userId)).toLocaleString()}<a:diamondgem:1402590496647413811>`, inline: true }
                );

            const folderPath = itemType === 'banner' ? bannersFolder : badgesFolder;
            const attachment = new AttachmentBuilder(path.join(folderPath, itemName), { name: itemName });
            updatedEmbed.setImage(`attachment://${itemName}`);
            
            await interaction.editReply({ embeds: [updatedEmbed], files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Đã xảy ra lỗi khi mua vật phẩm. Vui lòng thử lại sau.' });
        }
    },
    // ✅ THÊM HÀM XỬ LÝ MENU LỰA CHỌN
    async handleSelectMenu(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const [action, itemType, itemName] = interaction.values[0].split('_');
        const userId = interaction.user.id;
        const user = await getUser(userId);

        if (action !== 'equip') {
            return;
        }

        if (itemType === 'banner') {
            user.banner = itemName;
        } else if (itemType === 'badge') {
            user.badge = itemName;
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setTitle('✨ Trang Bị Thành Công!')
            .setDescription(`Bạn đã trang bị **${getItemName(itemName)}** thành công!`)
            .setColor('#2ecc71');
        
        await interaction.editReply({ embeds: [embed] });
    }
};
