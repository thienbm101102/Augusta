const { SlashCommandBuilder } = require("discord.js");

// thay bằng Discord ID của bạn
const OWNER_ID = "757207480785829928";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("servers")
    .setDescription("Xem danh sách server bot đang tham gia (chỉ owner dùng)."),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "❌ Lệnh này chỉ dành cho owner bot.", ephemeral: true });
    }

    // lấy danh sách server
    const guilds = interaction.client.guilds.cache.map(
      g => `🌐 ${g.name} — 🆔 ${g.id} — 👥 ${g.memberCount ?? "??"} members`
    );

    // chia nhỏ để tránh vượt 2000 ký tự
    const chunks = [];
    let current = "";
    for (const line of guilds) {
      if ((current + line + "\n").length > 1900) {
        chunks.push(current);
        current = "";
      }
      current += line + "\n";
    }
    if (current) chunks.push(current);

    // gửi lần lượt
    await interaction.reply({ content: "📋 Danh sách server bot đang ở:", ephemeral: true });
    for (const chunk of chunks) {
      await interaction.followUp({ content: "```yaml\n" + chunk + "```", ephemeral: true });
    }
  },
};
