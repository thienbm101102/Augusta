const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const db = require("../db");

const shopPath = path.join(__dirname, "../shop.json");

const getItemName = (filename) => {
    const customNames = {
        "banner.png": "Tập Sự",
        "banner1.png": "Hoa Đào",
        "banner2.png": "Bước Vào Giấc Mơ",
        "banner3.png": "Công Viên Mộng Mơ",
        "banner4.png": "Mãi Bên Nhau Bạn Nhé",
        "banner5.png": "Kimetsu no Yaiba",
        "banner8.gif": "Cyberpunk: Edgerunners",
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
        .setDescription("Cửa hàng và quản lý banner/danh hiệu hồ sơ của bạn"),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Hàm tạo menu chính
        const getMainMenuComponent = () => {
            const mainSelect = new StringSelectMenuBuilder()
                .setCustomId(`shop-main-${interaction.user.id}`)
                .setPlaceholder("📌 Chọn chức năng bạn muốn thực hiện")
                .addOptions([
                    { label: "🛒 Mua Banner", value: "buy_banners", description: "Xem và mua các banner trang trí hồ sơ" },
                    { label: "🏷️ Mua Danh Hiệu", value: "buy_badges", description: "Xem và mua các danh hiệu độc đáo" },
                    { label: "🖼️ Đổi Banner", value: "set_banner", description: "Chọn banner đã sở hữu để sử dụng" },
                    { label: "✨ Đổi Danh Hiệu", value: "set_badge", description: "Chọn danh hiệu đã sở hữu để sử dụng" },
                ]);
            return new ActionRowBuilder().addComponents(mainSelect);
        };

        // Nút quay lại menu chính
        const getBackRow = () => {
            const backBtn = new ButtonBuilder()
                .setCustomId(`shop-back-main`)
                .setLabel("Quay lại")
                .setStyle(ButtonStyle.Secondary);
            return new ActionRowBuilder().addComponents(backBtn);
        };

        const responseMessage = await interaction.editReply({
            content: "👋 Chào mừng bạn đến với **Cửa Hàng & Tủ Đồ**. Vui lòng chọn danh mục bên dưới:",
            components: [getMainMenuComponent()]
        });

        const collector = responseMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60_000,
        });

        collector.on("collect", async (i) => {
            const userDocLatest = await db.getUser(interaction.user.id);
            const ownedBanners = userDocLatest.ownedBanners || [];
            const ownedBadges = userDocLatest.ownedBadges || [];

            // Nút quay lại menu chính
            if (i.customId === "shop-back-main" || (i.values && i.values[0] === "main_menu")) {
                await i.update({
                    content: "👋 Chào mừng bạn đến với **Cửa Hàng & Tủ Đồ**. Vui lòng chọn danh mục bên dưới:",
                    components: [getMainMenuComponent()],
                    files: []
                });
                return;
            }

            const choice = i.values ? i.values[0] : null;

            // 1. XỬ LÝ MUA BANNER HOẶC BADGE
            if (choice === "buy_banners" || choice === "buy_badges") {
                if (!fs.existsSync(shopPath)) {
                    return i.update({ content: "Cửa hàng đang đóng, không có vật phẩm nào để bán.", components: [getBackRow()] });
                }

                const shopItems = JSON.parse(fs.readFileSync(shopPath, "utf8"));
                const isBanner = choice === "buy_banners";
                const items = isBanner ? shopItems.banners : shopItems.badges;
                const ownedItems = isBanner ? ownedBanners : ownedBadges;
                const availableItems = Object.keys(items).filter(item => !ownedItems.includes(item));

                if (availableItems.length === 0) {
                    return i.update({ 
                        content: `Bạn đã mua hết các ${isBanner ? "banner" : "danh hiệu"} trong cửa hàng rồi! 🎉`, 
                        components: [getBackRow()] 
                    });
                }

                const options = availableItems.map(item => ({
                    label: `${getItemName(item)} (${items[item].toLocaleString()} xu)`,
                    value: `buy_item_${isBanner ? "banner" : "badge"}_${item}`
                }));

                const itemSelect = new StringSelectMenuBuilder()
                    .setCustomId(`shop-buy-item-${interaction.user.id}`)
                    .setPlaceholder(`Chọn ${isBanner ? "banner" : "danh hiệu"} muốn mua`)
                    .addOptions(options.slice(0, 25));

                return i.update({
                    content: `🛒 **Danh sách ${isBanner ? "Banner" : "Danh Hiệu"} có thể mua:**`,
                    components: [new ActionRowBuilder().addComponents(itemSelect), getBackRow()],
                    files: []
                });
            }

            // 2. XỬ LÝ ĐỔI BANNER
            if (choice === "set_banner") {
                const availableBanners = [...new Set(["banner.png", ...ownedBanners])];
                const options = availableBanners.map(f => ({
                    label: getItemName(f),
                    value: `set_b_${f}`,
                    default: f === userDocLatest.banner
                }));

                const bannerSelect = new StringSelectMenuBuilder()
                    .setCustomId(`shop-set-b-${interaction.user.id}`)
                    .setPlaceholder("Chọn banner muốn sử dụng")
                    .addOptions(options.slice(0, 25));

                return i.update({
                    content: "🖼️ Chọn banner bạn muốn sử dụng cho hồ sơ:",
                    components: [new ActionRowBuilder().addComponents(bannerSelect), getBackRow()],
                    files: []
                });
            }

            // 3. XỬ LÝ ĐỔI DANH HIỆU
            if (choice === "set_badge") {
                if (ownedBadges.length === 0) {
                    return i.update({ 
                        content: "Bạn chưa sở hữu danh hiệu nào! Hãy ghé mục mua danh hiệu trước nhé.", 
                        components: [getBackRow()] 
                    });
                }

                const options = ownedBadges.map(f => ({
                    label: getItemName(f),
                    value: `set_d_${f}`,
                    default: f === userDocLatest.badge
                }));

                const badgeSelect = new StringSelectMenuBuilder()
                    .setCustomId(`shop-set-d-${interaction.user.id}`)
                    .setPlaceholder("Chọn danh hiệu muốn sử dụng")
                    .addOptions(options.slice(0, 25));

                return i.update({
                    content: "✨ Chọn danh hiệu bạn muốn hiển thị trên hồ sơ:",
                    components: [new ActionRowBuilder().addComponents(badgeSelect), getBackRow()],
                    files: []
                });
            }

            // 4. XỬ LÝ KHI CHỌN XEM CHI TIẾT 1 MÓN ĐỂ MUA
            if (i.customId === `shop-buy-item-${interaction.user.id}`) {
                await i.deferUpdate();
                const parts = i.values[0].split("_");
                const type = parts[2]; 
                const selectedItem = parts.slice(3).join("_");

                const shopItems = JSON.parse(fs.readFileSync(shopPath, "utf8"));
                const itemPrice = shopItems[type === "banner" ? "banners" : "badges"][selectedItem];
                
                const itemDir = type === "banner" ? "../assets/banners" : "../assets/badges";
                const imagePath = path.join(__dirname, itemDir, selectedItem);
                const attachment = fs.existsSync(imagePath) ? new AttachmentBuilder(imagePath, { name: selectedItem }) : null;

                const buyButton = new ButtonBuilder()
                    .setCustomId(`confirm-buy-${type}-${selectedItem}`)
                    .setLabel(`Mua (${itemPrice.toLocaleString()} xu)`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(userDocLatest.balance < itemPrice);

                const backButton = new ButtonBuilder()
                    .setCustomId(`shop-back-main`)
                    .setLabel("🔙 Quay lại menu chính")
                    .setStyle(ButtonStyle.Secondary);

                const actionRow = new ActionRowBuilder().addComponents(buyButton, backButton);

                return i.editReply({
                    content: `Bạn có muốn mua **${getItemName(selectedItem)}** với giá **${itemPrice.toLocaleString()} xu** không?`,
                    files: attachment ? [attachment] : [],
                    components: [actionRow]
                });
            }

            // 5. XÁC NHẬN MUA
            if (i.customId.startsWith("confirm-buy-")) {
                await i.deferUpdate();
                const [, , type, selectedItem] = i.customId.split("-");
                const shopItems = JSON.parse(fs.readFileSync(shopPath, "utf8"));
                const itemPrice = shopItems[type === "banner" ? "banners" : "badges"][selectedItem];

                if (userDocLatest.balance < itemPrice) {
                    return i.editReply({ content: "❌ Bạn không đủ tiền để mua vật phẩm này!", components: [getBackRow()], files: [] });
                }

                await db.deductBalance(i.user.id, itemPrice);

                if (type === "banner") {
                    if (!userDocLatest.ownedBanners.includes(selectedItem)) userDocLatest.ownedBanners.push(selectedItem);
                    userDocLatest.banner = selectedItem;
                } else {
                    if (!userDocLatest.ownedBadges.includes(selectedItem)) userDocLatest.ownedBadges.push(selectedItem);
                    userDocLatest.badge = selectedItem;
                }

                await userDocLatest.save();

                return i.editReply({
                    content: `<a:AbbyOK:1342386280809627698> Bạn đã mua và trang bị thành công **${getItemName(selectedItem)}**!`,
                    components: [getBackRow()],
                    files: []
                });
            }

            // 6. LƯU THAY ĐỔI BANNER ĐANG MẶC
            if (i.values && i.values[0].startsWith("set_b_")) {
                await i.deferUpdate();
                const bannerName = i.values[0].replace("set_b_", "");
                userDocLatest.banner = bannerName;
                await userDocLatest.save();
                return i.editReply({
                    content: `<a:AbbyOK:1342386280809627698> Đã chuyển sang sử dụng banner: **${getItemName(bannerName)}**`,
                    components: [getBackRow()],
                    files: []
                });
            }

            // 7. LƯU THAY ĐỔI BADGE ĐANG MẶC
            if (i.values && i.values[0].startsWith("set_d_")) {
                await i.deferUpdate();
                const badgeName = i.values[0].replace("set_d_", "");
                userDocLatest.badge = badgeName;
                await userDocLatest.save();
                return i.editReply({
                    content: `<a:AbbyOK:1342386280809627698> Đã trang bị thành công danh hiệu: **${getItemName(badgeName)}**`,
                    components: [getBackRow()],
                    files: []
                });
            }
        });

        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                await interaction.editReply({ content: "⏳ Phiên giao dịch đã hết hạn.", components: [] }).catch(() => {});
            }
        });
    },
};
