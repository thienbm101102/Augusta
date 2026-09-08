const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// --- CẤU HÌNH THÔNG TIN NGÂN HÀNG CỦA SHOP ---
const BANK_CONFIG = {
    BANK_ID: "SACOMBANK",               // Mã ngân hàng (VD: VCB, MB, Techcombank, SACOMBANK,...)
    ACCOUNT_NO: "10112002",    // Số tài khoản nhận tiền của bạn
    ACCOUNT_NAME: "BUI MINH THIEN", // Tên chủ tài khoản
    TEMPLATE: "compact2"         // Kiểu hiển thị QR (compact2, print, qr_only)
};

// --- BANNER SHOP ---
const BANNER_URL = "https://i.ibb.co/60Qm7L95/camellya-wuthering-waves-game-hd-wallpaper-uhdpaper-com-659-5-r.jpg"; // Bạn có thể thay link ảnh banner tùy ý tại đây

// --- CÁC GÓI MUA KIM CƯƠNG ---
const PACKAGES = [
    { id: "pack_1", diamonds: 20000, price: 10000, label: "Gói Khởi Đầu", desc: "10,000 VNĐ = 20,000 💎" },
    { id: "pack_2", diamonds: 100000, price: 50000, label: "Gói Phổ Biến", desc: "50,000 VNĐ = 100,000 💎" },
    { id: "pack_3", diamonds: 200000, price: 100000, label: "Gói Tiết Kiệm", desc: "100,000 VNĐ = 200,000 💎" },
    { id: "pack_4", diamonds: 500000, price: 250000, label: "Gói Đại Gia", desc: "250,000 VNĐ = 500,000 💎" },
    { id: "pack_5", diamonds: 1000000, price: 500000, label: "Gói Siêu VIP", desc: "500,000 VNĐ = 1,000,000 💎" },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nap')
        .setDescription('Mở cửa hàng mua 💎 qua chuyển khoản ngân hàng tự động'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const getMainMenuEmbed = () => {
            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('<a:VerifiedTwitter:1418649004912148511> MUA 💎 TỰ ĐỘNG')
                .setDescription('Chào mừng bạn đến với hệ thống mua 💎 chính thức!\n\nHãy chọn một gói nạp bên dưới để khởi tạo hóa đơn thanh toán quét mã QR tự động hoàn toàn an toàn và nhanh chóng.')
                .addFields(
                    { 
                        name: '✨ Hướng dẫn giao dịch', 
                        value: '1️⃣ Chọn gói kim cương phù hợp trong menu.\n2️⃣ Quét mã QR chuyển khoản qua App ngân hàng.\n3️⃣ Hệ thống sẽ tự động xác thực và cộng tiền.', 
                        inline: false 
                    }
                )
                .setImage(BANNER_URL)
                .setFooter({ text: 'Hệ thống bảo mật 24/7 • Giao dịch tự động', iconURL: interaction.client.user.displayAvatarURL() });
        };

        const getMainMenuComponent = () => {
            const options = PACKAGES.map(pkg => ({
                label: `${pkg.label} (${pkg.diamonds.toLocaleString()} 💎)`,
                description: pkg.desc,
                value: pkg.id
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`nap-select-${interaction.user.id}`)
                .setPlaceholder("✨ Bấm vào đây để chọn gói 💎")
                .addOptions(options);

            return new ActionRowBuilder().addComponents(selectMenu);
        };

        const getBackRow = () => {
            const backBtn = new ButtonBuilder()
                .setCustomId(`nap-back-main`)
                .setLabel("Quay lại")
                .setStyle(ButtonStyle.Secondary);
            return new ActionRowBuilder().addComponents(backBtn);
        };

        const responseMessage = await interaction.editReply({
            embeds: [getMainMenuEmbed()],
            components: [getMainMenuComponent()]
        });

        const collector = responseMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 120_000, // Hết hạn sau 2 phút không thao tác
        });

        collector.on("collect", async (i) => {
            const userId = interaction.user.id;

            // Xử lý nút quay lại menu chính
            if (i.customId === "nap-back-main" || (i.values && i.values[0] === "main_menu")) {
                await i.update({
                    embeds: [getMainMenuEmbed()],
                    components: [getMainMenuComponent()],
                    files: []
                });
                return;
            }

            // Xử lý khi chọn gói nạp
            const choice = i.values ? i.values[0] : null;
            const selectedPackage = PACKAGES.find(p => p.id === choice);

            if (selectedPackage) {
                await i.deferUpdate();

                // Cú pháp nội dung chuyển khoản chuẩn định danh
                const memo = `NAP ${userId} ${selectedPackage.id}`;
                
                // Link tạo mã QR VietQR tự động
                const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${selectedPackage.price}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;

                const embed = new EmbedBuilder()
                    .setColor('#FEE75C')
                    .setTitle('<a:VerifiedTwitter:1418649004912148511> HÓA ĐƠN THANH TOÁN CHUYỂN KHOẢN')
                    .setDescription('Vui lòng sử dụng ứng dụng ngân hàng quét mã QR bên dưới hoặc chuyển khoản thủ công theo thông tin chi tiết.')
                    .addFields(
                        { name: '📦 Gói dịch vụ', value: `**${selectedPackage.label}**`, inline: true },
                        { name: '<a:diamondgem:1418649012289933434> Nhận được', value: `\`${selectedPackage.diamonds.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                        { name: '💰 Số tiền thanh toán', value: `\`${selectedPackage.price.toLocaleString()}\` VNĐ`, inline: true },
                        { name: '────────────────────────', value: '\u200b', inline: false },
                        { name: '🏦 Ngân hàng thụ hưởng', value: `**${BANK_CONFIG.BANK_ID}**`, inline: true },
                        { name: '💳 Số tài khoản', value: `\`${BANK_CONFIG.ACCOUNT_NO}\``, inline: true },
                        { name: '👤 Chủ tài khoản', value: `**${BANK_CONFIG.ACCOUNT_NAME}**`, inline: false },
                        { name: '📝 Nội dung chuyển khoản (BẮT BUỘC)', value: `\`\`\`${memo}\`\`\``, inline: false }
                    )
                    .setImage(qrUrl)
                    .setFooter({ text: '⚠️ Lưu ý tuyệt đối không sửa đổi nội dung chuyển khoản để tránh thất lạc giao dịch!' });

                return i.editReply({
                    embeds: [embed],
                    components: [getBackRow()]
                });
            }
        });

        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                const expiredEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏳ Phiên giao dịch đã hết hạn')
                    .setDescription('Đã quá thời gian chờ thanh toán. Vui lòng sử dụng lại lệnh `/nap` nếu bạn vẫn muốn tiếp tục.');
                await interaction.editReply({ embeds: [expiredEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
