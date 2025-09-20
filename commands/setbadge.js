const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../db.json");

// Hàm này sẽ lấy tên hiển thị từ tên file (giống shop.js)
const getItemName = (filename) => {
    const customNames = {
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
    .setName("setbadge")
    .setDescription("Chọn danh hiệu bạn muốn sử dụng"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Đọc dữ liệu người dùng từ db
    let db = {};
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }
    
    // Lấy danh sách danh hiệu người dùng sở hữu
    const userOwnedBadges = db.users?.[interaction.user.id]?.ownedBadges || [];
    
    // Nếu người dùng chưa có danh hiệu nào
    if (userOwnedBadges.length === 0) {
      return interaction.editReply({ content: "Bạn chưa sở hữu danh hiệu nào! Bạn có thể mua chúng trong `/shop badges`." });
    }

    // Tạo select menu
    const options = userOwnedBadges.map(f => ({
      label: getItemName(f), 
      value: f,
      // Tùy chọn: đặt danh hiệu hiện tại làm mặc định
      default: f === db.users[interaction.user.id].badge
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select-badge-${interaction.user.id}`)
      .setPlaceholder("Chọn danh hiệu bạn muốn sử dụng")
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      content: "<a:AbbyCheers:1393909248076943380> Chọn danh hiệu bạn muốn sử dụng:",
      components: [row]
    });

    // --- chờ user chọn ---
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.customId === `select-badge-${interaction.user.id}` && i.user.id === interaction.user.id,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      const badgeName = i.values[0];
      
      // cập nhật danh hiệu
      db.users[interaction.user.id].badge = badgeName;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

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
  },
};