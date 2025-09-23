const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { addBalance, getBalance, getUser, updateUser } = require("../db");

const shopPath = path.join(__dirname, "../shop.json");

// Hàm này sẽ lấy tên hiển thị từ tên file
const getItemName = (filename) => {
    // Tùy chỉnh tên tại đây
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
                .setDescription('Xem các vật phẩm trong cửa hàng')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mua')
                .setDescription('Mua một vật phẩm từ cửa hàng')
                .addStringOption(option =>
                    option.setName('vật-phẩm')
                        .setDescription('Vật phẩm bạn muốn mua (ví dụ: "banner1.png" hoặc "daigia.png")')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('trangbi')
                .setDescription('Trang bị một banner hoặc huy hiệu bạn đã mua')
                .addStringOption(option =>
                    option.setName('loại')
                        .setDescription('Chọn loại vật phẩm bạn muốn trang bị')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Banner', value: 'banner' },
                            { name: 'Huy hiệu', value: 'badge' },
                        )
                )
                .addStringOption(option =>
                    option.setName('tên')
                        .setDescription('Tên file của vật phẩm (ví dụ: banner1.png)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const user = await getUser(userId);

        // Khởi tạo các trường nếu chưa tồn tại
        if (!user.ownedBanners) {
            user.ownedBanners = [];
        }
        if (!user.ownedBadges) {
            user.ownedBadges = [];
        }

        switch (subcommand) {
            case 'xem': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));

                    const banners = shopData.banners.map(b => 
                        `**${getItemName(b.file)}**\n> Giá: \`${b.cost.toLocaleString()}\`<a:diamondgem:1402590496647413811>\n> Tên file: \`${b.file}\``
                    ).join('\n\n');

                    const badges = shopData.badges.map(b => 
                        `**${getItemName(b.file)}**\n> Giá: \`${b.cost.toLocaleString()}\`<a:diamondgem:1402590496647413811>\n> Tên file: \`${b.file}\``
                    ).join('\n\n');

                    const embed = new EmbedBuilder()
                        .setTitle('🛒 Cửa Hàng')
                        .setDescription(`Chào mừng đến với cửa hàng! Bạn có thể mua các vật phẩm độc đáo để tùy chỉnh hồ sơ của mình.\n\nSố dư của bạn: \`${user.balance.toLocaleString()}\`<a:diamondgem:1402590496647413811>`)
                        .addFields(
                            { name: '🖼️ Banners', value: banners || 'Hiện không có banner nào.', inline: false },
                            { name: '🏅 Huy Hiệu', value: badges || 'Hiện không có huy hiệu nào.', inline: false }
                        )
                        .setColor('#F7DC6F');

                    const ownedBannersList = user.ownedBanners.length > 0
                        ? user.ownedBanners.map(b => `\`${b}\``).join(', ')
                        : 'Không có';

                    const ownedBadgesList = user.ownedBadges.length > 0
                        ? user.ownedBadges.map(b => `\`${b}\``).join(', ')
                        : 'Không có';

                    const ownedEmbed = new EmbedBuilder()
                        .setTitle('🎒 Vật Phẩm Của Bạn')
                        .setDescription(`Bạn có thể trang bị các vật phẩm này bằng lệnh \`/shop trangbi\``)
                        .addFields(
                            { name: '🖼️ Banners', value: ownedBannersList, inline: false },
                            { name: '🏅 Huy Hiệu', value: ownedBadgesList, inline: false }
                        )
                        .setColor('#9b59b6');

                    await interaction.editReply({ embeds: [embed, ownedEmbed] });

                } catch (error) {
                    console.error(error);
                    await interaction.editReply({ content: 'Đã xảy ra lỗi khi đọc dữ liệu cửa hàng. Vui lòng thử lại sau.' });
                }
                break;
            }

            case 'mua': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const selectedItem = interaction.options.getString('vật-phẩm');

                let shopData;
                try {
                    shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));
                } catch (error) {
                    return interaction.editReply({ content: 'Đã xảy ra lỗi khi đọc dữ liệu cửa hàng. Vui lòng thử lại sau.' });
                }

                const allItems = [...shopData.banners, ...shopData.badges];
                const itemToBuy = allItems.find(item => item.file === selectedItem);

                if (!itemToBuy) {
                    return interaction.editReply({ content: 'Vật phẩm bạn chọn không tồn tại trong cửa hàng.' });
                }

                const userBalance = await getBalance(userId);
                const itemPrice = itemToBuy.cost;

                if (userBalance < itemPrice) {
                    return interaction.editReply({ 
                        content: `Bạn không đủ tiền để mua vật phẩm này. Vật phẩm cần **${itemPrice.toLocaleString()}**<a:diamondgem:1402590496647413811> nhưng bạn chỉ có **${userBalance.toLocaleString()}**<a:diamondgem:1402590496647413811>.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                // Kiểm tra xem người dùng đã sở hữu vật phẩm chưa
                if (user.ownedBanners.includes(selectedItem) || user.ownedBadges.includes(selectedItem)) {
                    return interaction.editReply({
                        content: `Bạn đã sở hữu vật phẩm này rồi.`,
                        flags: MessageFlags.Ephemeral,
                    });
                }

                // Trừ tiền và thêm vật phẩm
                await addBalance(userId, -itemPrice);

                if (shopData.banners.find(b => b.file === selectedItem)) {
                    user.ownedBanners.push(selectedItem);
                    user.banner = selectedItem; // Tự động gắn banner sau khi mua
                } else if (shopData.badges.find(b => b.file === selectedItem)) {
                    user.ownedBadges.push(selectedItem);
                    user.badge = selectedItem; // Tự động gắn badge sau khi mua
                }

                await user.save(); // Lưu thay đổi vào MongoDB

                // Cập nhật lại embed và menu sau khi mua
                const updatedEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('**<a:Verified:1406631971509243974> Mua Thành Công!**')
                    .setDescription(`Bạn đã mua thành công **${getItemName(selectedItem)}** với giá **${itemPrice.toLocaleString()}**<a:diamondgem:1402590496647413811>. Vật phẩm này đã được trang bị cho bạn.`)
                    .addFields(
                        { name: 'Số dư hiện tại', value: `${(await getBalance(userId)).toLocaleString()}<a:diamondgem:1402590496647413811>`, inline: true }
                    );

                await interaction.editReply({ embeds: [updatedEmbed] });
                break;
            }

            case 'trangbi': {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const itemType = interaction.options.getString('loại');
                const itemName = interaction.options.getString('tên');

                let isOwned = false;
                if (itemType === 'banner' && user.ownedBanners.includes(itemName)) {
                    user.banner = itemName;
                    isOwned = true;
                } else if (itemType === 'badge' && user.ownedBadges.includes(itemName)) {
                    user.badge = itemName;
                    isOwned = true;
                }

                if (!isOwned) {
                    return interaction.editReply({ content: `Bạn không sở hữu vật phẩm \`${itemName}\`. Vui lòng kiểm tra lại.` });
                }

                await user.save();
                await interaction.editReply({ content: `Đã trang bị **${getItemName(itemName)}** thành công.` });
                break;
            }
        }
    }
};
