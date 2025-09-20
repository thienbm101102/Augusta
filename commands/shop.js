const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../db.json");
const shopPath = path.join(__dirname, "../shop.json");

// Helper function để lấy số dư
let getBalanceFromDb;
try {
  const db = require("../db");
  getBalanceFromDb = (id) => {
    if (typeof db.getBalance === "function") return db.getBalance(id);
    if (db.users) return db.users[id]?.balance ?? 0;
    return 0;
  };
} catch {
  getBalanceFromDb = () => 0;
}

// Hàm này sẽ lấy tên hiển thị từ tên file
const getItemName = (filename) => {
    // Tùy chỉnh tên tại đây
    const customNames = {
        "banner1.png": "Hoa Đào",
        "banner2.png": "Bước Vào Giấc Mơ",
        "banner3.png": "Công Viên Mộng Mơ",
        "banner4.png":"Mãi Bên Nhau Bạn Nhé",
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
    .addSubcommand(subcommand =>
      subcommand
        .setName("banners")
        .setDescription("Xem và mua banner để trang trí hồ sơ")
    )
    .addSubcommand(subcommand =>
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
    const itemType = subcommand === "banners" ? "banner" : "khung";

   let db = {};
    if (fs.existsSync(dbPath)) {
        db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }
    const user = db.users?.[interaction.user.id] || {};
    const ownedBanners = user.ownedBanners || [];
    const ownedBadges = user.ownedBadges || [];
    const ownedItems = subcommand === "banners" ? ownedBanners : ownedBadges;

    // Lọc ra các vật phẩm chưa được sở hữu
    const availableItems = Object.keys(items).filter(item => !ownedItems.includes(item));
    
    // Nếu không còn vật phẩm nào để mua
    if (availableItems.length === 0) {
      return interaction.editReply({ content: `Bạn đã mua hết các ${itemType} trong cửa hàng rồi! 🎉` });
    }

    // Tạo menu chỉ với các vật phẩm chưa sở hữu
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

    // Tạo một collector để lắng nghe tương tác với menu
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId.startsWith(`shop-select-${interaction.user.id}`),
        time: 60_000,
    });

    collector.on("collect", async (i) => {
        const selectedItem = i.values[0];
        const itemPrice = items[selectedItem];
        const userBalance = getBalanceFromDb(i.user.id);
        
        const itemDir = subcommand === "banners" ? "../assets/banners" : "../assets/badges";
        const imagePath = path.join(__dirname, itemDir, selectedItem);
        const attachment = new AttachmentBuilder(imagePath, { name: selectedItem });

        // Tạo nút "Mua" và "Hủy bỏ"
        const buyButton = new ButtonBuilder()
            .setCustomId(`buy-${i.user.id}-${selectedItem}-${subcommand}`)
            .setLabel(`Mua với ${itemPrice.toLocaleString()}`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(userBalance < itemPrice); // Vô hiệu hóa nút nếu không đủ tiền

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

    // Tạo một collector riêng để lắng nghe các nút "Mua" và "Hủy"
    const buttonCollector = interaction.channel.createMessageComponentCollector({
      filter: i => i.customId.startsWith(`buy-${interaction.user.id}`) || i.customId.startsWith(`cancel-${interaction.user.id}`),
      time: 60_000,
      max: 1 // Chỉ xử lý một lần nhấn nút
    });

buttonCollector.on("collect", async (i) => {
    await i.deferUpdate({ ephemeral: true });

    const [type, userId, selectedItem, itemType] = i.customId.split('-');
    
    if (type === "buy") {
        let db = {};
        if (fs.existsSync(dbPath)) {
            db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
        }
        if (!db.users) db.users = {};
        if (!db.users[i.user.id]) {
            db.users[i.user.id] = { balance: 0, ownedBanners: [], ownedBadges: [] };
        }
        
        const itemPrice = shopItems[itemType === 'banners' ? 'banners' : 'badges'][selectedItem];

        db.users[i.user.id].balance -= itemPrice;

        if (itemType === 'banners') {
            if (!db.users[i.user.id].ownedBanners) {
                db.users[i.user.id].ownedBanners = [];
            }
            if (!db.users[i.user.id].ownedBanners.includes(selectedItem)) {
                db.users[i.user.id].ownedBanners.push(selectedItem);
            }
            // Tự động gắn banner sau khi mua
            db.users[i.user.id].banner = selectedItem;
        } else if (itemType === 'badges') {
            if (!db.users[i.user.id].ownedBadges) {
                db.users[i.user.id].ownedBadges = [];
            }
            if (!db.users[i.user.id].ownedBadges.includes(selectedItem)) {
                db.users[i.user.id].ownedBadges.push(selectedItem);
            }
            // Tự động gắn khung sau khi mua
            db.users[i.user.id].badge = selectedItem;
        }
        
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

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