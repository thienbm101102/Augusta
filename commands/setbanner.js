const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../db.json");

// Hàm này sẽ lấy tên hiển thị từ tên file
const getItemName = (filename) => {
    const customNames = {
    "banner.png": "Tập Sự",
    "banner1.png": "Hoa Đào Mùa Xuân",
    "banner2.png": "Đến Giấc Mơ Kế Tiếp",
    "banner3.png": "Công Viên Mộng Mơ",
    "banner4.png": "Mãi Bên Nhau Bạn Nhé",
    };
    return customNames[filename] || filename.replace(/\.(png|jpg|jpeg)$/i, "");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setbanner")
    .setDescription("Chọn background hiển thị trong hồ sơ"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let db = {};
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }
    
    // Lấy danh sách banner người dùng sở hữu, thêm banner mặc định
    const userOwnedBanners = db.users?.[interaction.user.id]?.ownedBanners || [];
    const availableBanners = [...new Set(["banner.png", ...userOwnedBanners])];

    if (availableBanners.length === 0) {
      return interaction.editReply({ content: "Bạn chưa sở hữu banner nào!" });
    }

    const options = availableBanners.map(f => ({
      label: getItemName(f), 
      value: f,
      default: f === db.users[interaction.user.id].banner
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select-banner-${interaction.user.id}`)
      .setPlaceholder("Chọn banner bạn muốn sử dụng")
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({
      content: "<a:AbbyCheers:1393909248076943380> Chọn background bạn muốn sử dụng:",
      components: [row]
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.customId === `select-banner-${interaction.user.id}` && i.user.id === interaction.user.id,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      const bannerName = i.values[0];
      
      db.users[interaction.user.id].banner = bannerName;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf8");

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
  },
};