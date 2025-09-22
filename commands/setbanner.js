const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder 
} = require("discord.js");
const path = require("path");
const { getUser, updateUser } = require("../db");

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

    // Lấy dữ liệu người dùng từ MongoDB
    const user = await getUser(interaction.user.id);
    const userOwnedBanners = user.ownedBanners || [];
    
    // Lấy danh sách banner người dùng sở hữu
    const availableBanners = userOwnedBanners;

    if (availableBanners.length === 0) {
        return interaction.editReply({
            content: "Bạn chưa có banner nào để sử dụng. Hãy mua một cái trong cửa hàng!",
            ephemeral: true
        });
    }

    // Tạo các tùy chọn cho select menu
    const options = availableBanners.map(f => ({
      label: getItemName(f), 
      value: f,
      default: f === user.banner
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
  },

  async handleSelectMenu(interaction) {
      await interaction.deferUpdate();
      const [_, __, userId] = interaction.customId.split('-');
      const bannerName = interaction.values[0];

      if (interaction.user.id !== userId) {
          return interaction.followUp({ content: 'Bạn không thể tương tác với menu của người khác!', ephemeral: true });
      }

      // Cập nhật banner của người dùng
      const user = await getUser(userId);
      user.banner = bannerName;
      await user.save(); // Lưu thay đổi vào MongoDB

      await interaction.editReply({
        content: `<a:AbbyHappy:1393909327848538122> Bạn đã đổi banner thành **${getItemName(bannerName)}** thành công!`,
        components: []
      });
  }
};
