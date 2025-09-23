const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const db = require("../db"); // Import module db.js để sử dụng Mongoose

const shopPath = path.join(__dirname, "../shop.json");

// Hàm này sẽ lấy tên hiển thị từ tên file
const getItemName = (filename) => {
    // Tùy chỉnh tên tại đây
    const customNames = {
        "banner.png": "Tập Sự",
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
        "quocvuong.png": "Danh hiệu: Quốc Vương Tộc Bom",
    };
    return customNames[filename] || filename.replace(/\.(png|jpg|jpeg)$/i, "");
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Mở cửa hàng, xem và mua vật phẩm hoặc chọn danh hiệu/background")
        .addSubcommand(subcommand =>
            subcommand
                .setName("banners")
                .setDescription("Xem và mua banner để trang trí hồ sơ")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("badges")
                .setDescription("Xem và mua danh hiệu để trang trí hồ sơ")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("setbanner")
                .setDescription("Chọn background bạn muốn sử dụng")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("setbadge")
                .setDescription("Chọn danh hiệu bạn muốn sử dụng")
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ ephemeral: true });

        const userDoc = await db.getUser(interaction.user.id);
        const ownedBanners = userDoc.ownedBanners || [];
        const ownedBadges = userDoc.ownedBadges || [];

        // Xử lý các subcommand mới
        if (subcommand === "setbanner") {
            const availableBanners = [...new Set(["banner.png", ...ownedBanners])];
            if (availableBanners.length === 0) {
                return interaction.editReply({ content: "Bạn chưa sở hữu banner nào!" });
            }

            const options = availableBanners.map(f => ({
                label: getItemName(f),
                value: f,
                default: f === userDoc.banner
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`set-banner-${interaction.user.id}`)
                .setPlaceholder("Chọn banner bạn muốn sử dụng")
                .addOptions(options.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: "<a:AbbyCheers:1393909248076943380> Chọn background bạn muốn sử dụng:",
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.customId === `set-banner-${interaction.user.id}` && i.user.id === interaction.user.id,
                time: 60_000,
            });

            collector.on("collect", async (i) => {
                await i.deferUpdate();
                const bannerName = i.values[0];
                userDoc.banner = bannerName;
                await userDoc.save();
                await i.editReply({
                    content: `<a:AbbyHappy:1393909327848538122> Hồ sơ của bạn đã được đổi thành **${getItemName(bannerName)}**`,
                    components: []
                });
                collector.stop();
            });

            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    await interaction.editReply({
                        content: "Hết thời gian chọn!",
                        components: []
                    });
                }
            });
            return;
        }

        if (subcommand === "setbadge") {
            const userOwnedBadges = ownedBadges || [];
            if (userOwnedBadges.length === 0) {
                return interaction.editReply({ content: "Bạn chưa sở hữu danh hiệu nào! Bạn có thể mua chúng trong `/shop badges`." });
            }

            const options = userOwnedBadges.map(f => ({
                label: getItemName(f),
                value: f,
                default: f === userDoc.badge
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`set-badge-${interaction.user.id}`)
                .setPlaceholder("Chọn danh hiệu bạn muốn sử dụng")
                .addOptions(options.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: "<a:AbbyCheers:1393909248076943380> Chọn danh hiệu bạn muốn sử dụng:",
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({
                filter: i => i.customId === `set-badge-${interaction.user.id}` && i.user.id === interaction.user.id,
                time: 60_000,
            });

            collector.on("collect", async (i) => {
                await i.deferUpdate();
                const badgeName = i.values[0];
                userDoc.badge = badgeName;
                await userDoc.save();
                await i.editReply({
                    content: `<a:AbbyHappy:1393909327848538122> Hồ sơ của bạn đã được đổi thành **${getItemName(badgeName)}**`,
                    components: []
                });
                collector.stop();
            });

            collector.on("end", async (_, reason) => {
                if (reason === "time") {
                    await interaction.editReply({
                        content: "Hết thời gian chọn!",
                        components: []
                    });
                }
            });
            return;
        }

        // Phần code còn lại của lệnh shop (banners, badges)
        if (!fs.existsSync(shopPath)) {
            return interaction.editReply({ content: "Cửa hàng đang đóng, không có vật phẩm nào để bán." });
        }

        const shopItems = JSON.parse(fs.readFileSync(shopPath, "utf8"));
        const items = subcommand === "banners" ? shopItems.banners : shopItems.badges;
        const itemType = subcommand === "banners" ? "banner" : "khung";
        const ownedItems = subcommand === "banners" ? ownedBanners : ownedBadges;

        const availableItems = Object.keys(items).filter(item => !ownedItems.includes(item));

        if (availableItems.length === 0) {
            return interaction.editReply({ content: `Bạn đã mua hết các ${itemType} trong cửa hàng rồi! 🎉` });
        }

        const options = availableItems.map(item => ({
            label: `${getItemName(item)} (${items[item].toLocaleString()} xu)`,
            value: item
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`shop-select-${interaction.user.id}`)
            .setPlaceholder(`Chọn vật phẩm bạn muốn mua`)
            .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: `<a:AbbyCheers:1393909248076943380> Chọn vật phẩm bạn muốn xem hoặc mua:`,
            components: [row]
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId.startsWith(`shop-select-${interaction.user.id}`),
            time: 60_000,
        });

        collector.on("collect", async (i) => {
            const selectedItem = i.values[0];
            const itemPrice = items[selectedItem];
            const userBalance = userDoc.balance;

            const itemDir = subcommand === "banners" ? "../assets/banners" : "../assets/badges";
            const imagePath = path.join(__dirname, itemDir, selectedItem);
            const attachment = new AttachmentBuilder(imagePath, { name: selectedItem });

            const buyButton = new ButtonBuilder()
                .setCustomId(`buy-${i.user.id}-${selectedItem}-${subcommand}`)
                .setLabel(`Mua với ${itemPrice.toLocaleString()}`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(userBalance < itemPrice);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel-${i.user.id}`)
                .setLabel("Hủy bỏ")
                .setStyle(ButtonStyle.Secondary);

            const buttonRow = new ActionRowBuilder().addComponents(buyButton, cancelButton);

            await i.update({
                content: `Bạn có muốn mua **${getItemName(selectedItem)}** không?`,
                files: [attachment],
                components: [buttonRow]
            });
        });

        const buttonCollector = interaction.channel.createMessageComponentCollector({
            filter: i => i.customId.startsWith(`buy-${interaction.user.id}`) || i.customId.startsWith(`cancel-${interaction.user.id}`),
            time: 60_000,
            max: 1
        });

        buttonCollector.on("collect", async (i) => {
            await i.deferUpdate({ ephemeral: true });

            const [type, userId, selectedItem, itemType] = i.customId.split('-');
            const currentUserDoc = await db.getUser(i.user.id);

            if (type === "buy") {
                const itemPrice = shopItems[itemType === 'banners' ? 'banners' : 'badges'][selectedItem];
                
                if (currentUserDoc.balance < itemPrice) {
                     return i.editReply({
                        content: "Bạn không đủ tiền để mua vật phẩm này!",
                        components: [],
                        files: []
                    });
                }

                await db.deductBalance(i.user.id, itemPrice);

                if (itemType === 'banners') {
                    if (!currentUserDoc.ownedBanners.includes(selectedItem)) {
                        currentUserDoc.ownedBanners.push(selectedItem);
                    }
                    currentUserDoc.banner = selectedItem;
                } else if (itemType === 'badges') {
                    if (!currentUserDoc.ownedBadges.includes(selectedItem)) {
                        currentUserDoc.ownedBadges.push(selectedItem);
                    }
                    currentUserDoc.badge = selectedItem;
                }

                await currentUserDoc.save();

                await i.editReply({
                    content: `<a:AbbyHappy:1393909327848538122> Bạn đã mua thành công **${getItemName(selectedItem)}** với giá ${itemPrice.toLocaleString()} xu!`,
                    components: [],
                    files: []
                });

            } else {
                await i.editReply({
                    content: "Đã hủy giao dịch.",
                    components: [],
                    files: []
                });
            }
        });

        buttonCollector.on("end", async (_, reason) => {
            if (reason === "time") {
                await interaction.editReply({
                    content: "Hết thời gian giao dịch!",
                    components: [],
                    files: []
                });
            }
        });
    },
};
