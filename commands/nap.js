const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');

// --- CẤU HÌNH THÔNG TIN NGÂN HÀNG CỦA SHOP ---
const BANK_CONFIG = {
    BANK_ID: "SACOMBANK",               // Mã ngân hàng (VD: VCB, MB, Techcombank, ACB,...)
    ACCOUNT_NO: "10112002",    // Số tài khoản nhận tiền của bạn
    ACCOUNT_NAME: "BUI MINH THIEN", // Tên chủ tài khoản (Không dấu hoặc có dấu viết hoa)
    TEMPLATE: "compact2"         // Kiểu hiển thị QR (compact2, print, qr_only)
};

// --- CÁC GÓI MUA KIM CƯƠNG ---
const PACKAGES = [
    { id: "pack_1", diamonds: 20000, price: 10000, label: "20,000 Kim Cương", desc: "10,000 VNĐ - Gói khởi đầu" },
    { id: "pack_2", diamonds: 100000, price: 50000, label: "100,000 Kim Cương", desc: "50,000 VNĐ - Phổ biến" },
    { id: "pack_3", diamonds: 200000, price: 100000, label: "200,000 Kim Cương", desc: "100,000 VNĐ - Tiết kiệm nhất" },
    { id: "pack_4", diamonds: 500000, price: 250000, label: "500,000 Kim Cương", desc: "250,000 VNĐ - Đại gia" },
    { id: "pack_5", diamonds: 1000000, price: 500000, label: "1,000,000 Kim Cương", desc: "500,000 VNĐ - Siêu VIP" },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nap')
        .setDescription('Mở cửa hàng nạp kim cương qua chuyển khoản ngân hàng tự động'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const getMainMenuComponent = () => {
            const options = PACKAGES.map(pkg => ({
                label: pkg.label,
                description: pkg.desc,
                value: pkg.id
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`nap-select-${interaction.user.id}`)
                .setPlaceholder("💎 Chọn gói kim cương bạn muốn nạp")
                .addOptions(options);

            return new ActionRowBuilder().addComponents(selectMenu);
        };

        const getBackRow = () => {
            const backBtn = new ButtonBuilder()
                .setCustomId(`nap-back-main`)
                .setLabel("🔙 Quay lại danh sách gói")
                .setStyle(ButtonStyle.Secondary);
            return new ActionRowBuilder().addComponents(backBtn);
        };

        const responseMessage = await interaction.editReply({
            content: "💎 **HỆ THỐNG NẠP KIM CƯƠNG TỰ ĐỘNG**\nVui lòng chọn gói nạp phù hợp bên dưới để nhận mã QR thanh toán:",
            components: [getMainMenuComponent()]
        });

        const collector = responseMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120_000, // Cho phép thao tác trong 2 phút
        });

        collector.on("collect", async (i) => {
            const userId = interaction.user.id;

            // Xử lý nút quay lại
            if (i.customId === "nap-back-main" || (i.values && i.values[0] === "main_menu")) {
                await i.update({
                    content: "💎 **HỆ THỐNG NẠP KIM CƯƠNG TỰ ĐỘNG**\nVui lòng chọn gói nạp phù hợp bên dưới để nhận mã QR thanh toán:",
                    components: [getMainMenuComponent()],
                    embeds: [],
                    files: []
                });
                return;
            }

            // Xử lý khi chọn gói nạp
            const choice = i.values ? i.values[0] : null;
            const selectedPackage = PACKAGES.find(p => p.id === choice);

            if (selectedPackage) {
                await i.deferUpdate();

                // Cú pháp chuyển khoản chuẩn (VD: NAP <DiscordID> <Gói>)
                const memo = `NAP ${userId} ${selectedPackage.id}`;
                
                // Sử dụng API công khai VietQR để tạo mã QR chính xác tuyệt đối
                const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${selectedPackage.price}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;

                const embed = new EmbedBuilder()
                    .setTitle('**<a:VerifiedTwitter:1418649004912148511> HÓA ĐƠN THANH TOÁN QUÉT MÃ QR**')
                    .setDescription('Quét mã QR bên dưới bằng ứng dụng ngân hàng của bạn để thanh toán nhanh chóng.')
                    .addFields(
                        { name: '📦 Gói sản phẩm', value: `**${selectedPackage.label}**`, inline: true },
                        { name: '💰 Số tiền cần chuyển', value: `\`${selectedPackage.price.toLocaleString()}\` VNĐ`, inline: true },
                        { name: '\u200b', value: '\u200b', inline: false },
                        { name: '🏦 Ngân hàng', value: `**${BANK_CONFIG.BANK_ID}**`, inline: true },
                        { name: '💳 Số tài khoản', value: `\`${BANK_CONFIG.ACCOUNT_NO}\``, inline: true },
                        { name: '👤 Chủ tài khoản', value: `**${BANK_CONFIG.ACCOUNT_NAME}**`, inline: false },
                        { name: '📝 Nội dung chuyển khoản (BẮT BUỘC)', value: `\`\`\`${memo}\`\`\``, inline: false }
                    )
                    .setColor('#e74c3c')
                    .setImage(qrUrl)
                    .setFooter({ text: 'Lưu ý: Nhập đúng nội dung chuyển khoản để hệ thống tự động cộng kim cương!' });

                return i.editReply({
                    content: "",
                    embeds: [embed],
                    components: [getBackRow()]
                });
            }
        });

        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                await interaction.editReply({ content: "⏳ Phiên giao dịch nạp tiền đã hết hạn.", components: [], embeds: [] }).catch(() => {});
            }
        });
    }
};