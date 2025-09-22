const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const path = require("path");
const { getUser, updateUser } = require("../db");

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

    // Lấy dữ liệu người dùng từ MongoDB
    const user = await getUser(interaction.user.id);
    const userOwnedBadges = user.ownedBadges || [];

    // Lấy danh sách danh hiệu người dùng sở hữu
    const availableBadges = userOwnedBadges;

    if (availableBadges.length === 0) {
        return interaction.editReply({
            content: "Bạn chưa có danh hiệu nào để sử dụng. Hãy mua một cái trong cửa hàng!",
            ephemeral: true
        });
    }

    // Tạo các tùy chọn cho select menu
    const options = availableBadges.map(f => ({
      label: getItemName(f),
      value: f,
      default: f === user.badge
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
  },

  async handleSelectMenu(interaction) {
      await interaction.deferUpdate();
      const [_, __, userId] = interaction.customId.split('-');
      const badgeName = interaction.values[0];

      if (interaction.user.id !== userId) {
          return interaction.followUp({ content: 'Bạn không thể tương tác với menu của người khác!', ephemeral: true });
      }

      // Cập nhật danh hiệu của người dùng
      const user = await getUser(userId);
      user.badge = badgeName;
      await user.save(); // Lưu thay đổi vào MongoDB

      await interaction.editReply({
        content: `<a:AbbyHappy:1393909327848538122> Bạn đã đổi danh hiệu thành **${getItemName(badgeName)}** thành công!`,
        components: []
      });
  }
};
