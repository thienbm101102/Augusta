const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
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
        "quocvuong.png": "Danh hiệu: Quốc Vương Tộc Bom",
    };
    return customNames[filename] || filename.replace(/\.(png|jpg|jpeg)$/i, "");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Mở cửa hàng để mua vật phẩm đặc biệt")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("banners")
        .setDescription("Xem và mua banner để trang trí hồ sơ")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("badges")
        .setDescription("Xem và mua danh hiệu để trang trí hồ sơ")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (!fs.existsSync(shopPath)) {
      return interaction.editReply({ content: "Cửa hàng đang đóng, không có vật phẩm nào để bán." });
    }

    const shopItems = JSON.parse(fs.readFileSync(shopPath, "utf8"));
    const items = subcommand === "banners" ? shopItems.banners : shopItems.badges;
    const itemType = subcommand === "banners" ? "banner" : "badge";
    const user = await getUser(interaction.user.id);

    const ownedBanners = user.ownedBanners || [];
    const ownedBadges = user.ownedBadges || [];
    const ownedItems = itemType === "banner" ? ownedBanners : ownedBadges;

    // Lọc ra các vật phẩm chưa được sở hữu
    const availableItems = Object.keys(items).filter((item) => !ownedItems.includes(item));

    // Nếu không còn vật phẩm nào để mua
    if (availableItems.length === 0) {
      return interaction.editReply({ content: `Bạn đã mua hết các ${itemType === "banner" ? "banner" : "danh hiệu"} trong cửa hàng rồi! 🎉` });
    }

    // Tạo menu chỉ với các vật phẩm chưa sở hữu
    const options = availableItems.map((item) => ({
      label: `${getItemName(item)} (${items[item].toLocaleString()} xu)`,
      value: item,
    }));
    
    // Giới hạn 25 item trong một select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`shop-select-${interaction.user.id}-${itemType}`)
      .setPlaceholder(`Chọn vật phẩm bạn muốn mua`)
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    // Gửi reply ban đầu
    await interaction.editReply({
      content: `<a:AbbyCheers:1393909248076943380> Chọn vật phẩm bạn muốn mua:`,
      components: [row],
    });
  },

  async handleSelectMenu(interaction) {
    await interaction.deferUpdate();
    const [_, __, userId, itemType] = interaction.customId.split('-');
    const selectedItem = interaction.values[0];

    // Kiểm tra xem người dùng có phải là người đã bắt đầu lệnh không
    if (interaction.user.id !== userId) {
        return interaction.followUp({ content: 'Bạn không thể tương tác với menu của người khác!', ephemeral: true });
    }

    const shopItems = JSON.parse(fs.readFileSync(shopPath, "utf8"));
    const items = itemType === 'banner' ? shopItems.banners : shopItems.badges;
    const itemPrice = items[selectedItem];

    const user = await getUser(userId);
    const userBalance = user.balance;

    const ownedItems = itemType === 'banner' ? user.ownedBanners : user.ownedBadges;
    if (ownedItems.includes(selectedItem)) {
        return interaction.followUp({
            content: `Bạn đã sở hữu vật phẩm này rồi.`,
            ephemeral: true
        });
    }

    if (userBalance < itemPrice) {
        return interaction.followUp({
            content: `Bạn không đủ tiền! Bạn cần **${itemPrice.toLocaleString()}**<a:diamondgem:1402590496647413811> nhưng bạn chỉ có **${userBalance.toLocaleString()}**<a:diamondgem:1402590496647413811>.`,
            ephemeral: true,
        });
    }

    // Trừ tiền và thêm vật phẩm
    await addBalance(userId, -itemPrice);

    if (itemType === 'banner') {
        if (!user.ownedBanners) user.ownedBanners = [];
        if (!user.ownedBanners.includes(selectedItem)) {
            user.ownedBanners.push(selectedItem);
        }
        user.banner = selectedItem; // Tự động gắn banner sau khi mua
    } else if (itemType === 'badge') {
        if (!user.ownedBadges) user.ownedBadges = [];
        if (!user.ownedBadges.includes(selectedItem)) {
            user.ownedBadges.push(selectedItem);
        }
        user.badge = selectedItem; // Tự động gắn badge sau khi mua
    }
    
    await user.save(); // Lưu thay đổi vào MongoDB

    // Cập nhật lại embed và menu sau khi mua
    const updatedEmbed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('**<a:Verified:1406631971509243974> Mua Thành Công!**')
        .setDescription(`Bạn đã mua thành công **${getItemName(selectedItem)}** với giá **${itemPrice.toLocaleString()}**<a:diamondgem:1402590496647413811>!`);

    const attachment = new AttachmentBuilder(path.join(__dirname, `../assets/${itemType === 'banner' ? 'banners' : 'badges'}`, selectedItem));

    await interaction.editReply({
        embeds: [updatedEmbed],
        components: [],
        files: [attachment]
    });
  }
};
