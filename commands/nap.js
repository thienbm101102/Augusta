const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// --- CẤU HÌNH THÔNG TIN NGÂN HÀNG CỦA SHOP ---
const BANK_CONFIG = {
    BANK_ID: "SACOMBANK",
    ACCOUNT_NO: "10112002",
    ACCOUNT_NAME: "BUI MINH THIEN",
    TEMPLATE: "compact2"
};

// --- BANNER SHOP ---
const BANNER_URL = "https://i.ibb.co/60Qm7L95/camellya-wuthering-waves-game-hd-wallpaper-uhdpaper-com-659-5-r.jpg";

// --- CÁC GÓI MUA KIM CƯƠNG ---
const PACKAGES = [
    { id: "pack_1", diamonds: 20000, price: 10000, label: "Gói Khởi Đầu", desc: "10,000 VNĐ = 20,000💎" },
    { id: "pack_2", diamonds: 100000, price: 50000, label: "Gói Phổ Biến", desc: "50,000 VNĐ = 100,000💎" },
    { id: "pack_3", diamonds: 200000, price: 100000, label: "Gói Tiết Kiệm", desc: "100,000 VNĐ = 200,000💎" },
    { id: "pack_4", diamonds: 500000, price: 250000, label: "Gói Đại Gia", desc: "250,000 VNĐ = 500,000💎" },
    { id: "pack_5", diamonds: 1000000, price: 500000, label: "Gói Siêu VIP", desc: "500,000 VNĐ = 1,000,000💎" },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nap')
        .setDescription('Mở cửa hàng mua 💎 qua chuyển khoản ngân hàng tự động')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.reply({ content: '✅ Đã khởi tạo bảng nạp tiền vĩnh viễn ở kênh này!', ephemeral: true });

        const getMainMenuEmbed = () => {
            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('<a:VerifiedTwitter:1418649004912148511> Mua Kim Cương Tự Động')
                .setDescription('Chào mừng bạn đến với hệ thống mua <a:diamondgem:1418649012289933434> chính thức!\n\nHãy chọn một gói nạp bên dưới để khởi tạo hóa đơn thanh toán quét mã QR tự động hoàn toàn an toàn và nhanh chóng.')
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
                .setCustomId(`nap_select_menu`)
                .setPlaceholder("✨ Bấm vào đây để chọn gói 💎")
                .addOptions(options);

            return new ActionRowBuilder().addComponents(selectMenu);
        };

        // Gửi bảng nạp ra kênh công khai
        const responseMessage = await interaction.channel.send({
            embeds: [getMainMenuEmbed()],
            components: [getMainMenuComponent()]
        });

        // Đăng ký bộ lắng nghe sự kiện toàn cục chống chết token
        if (!interaction.client.isNapListenerLoaded) {
            interaction.client.isNapListenerLoaded = true;

            interaction.client.on('interactionCreate', async (i) => {
                try {
                    // Xử lý menu chọn gói nạp
                    if (i.isStringSelectMenu() && i.customId === 'nap_select_menu') {
                        // KHÓA GỐC 3 GIÂY: Phản hồi ngay lập tức để Discord không bao giờ báo lỗi timeout
                        await i.deferReply({ ephemeral: true });

                        const userId = i.user.id;
                        const choice = i.values[0];
                        const selectedPackage = PACKAGES.find(p => p.id === choice);

                        if (!selectedPackage) return;

                        const memo = `NAP ${userId} ${selectedPackage.id}`;
                        const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${selectedPackage.price}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;

                        const backBtn = new ButtonBuilder()
                            .setCustomId(`nap_back_btn`)
                            .setLabel("Quay lại")
                            .setStyle(ButtonStyle.Secondary);
                        const row = new ActionRowBuilder().addComponents(backBtn);

                        const embed = new EmbedBuilder()
                            .setColor('#FEE75C')
                            .setTitle('<a:VerifiedTwitter:1418649004912148511> HÓA ĐƠN THANH TOÁN CHUYỂN KHOẢN')
                            .setDescription(`Hóa đơn riêng của <@${userId}>. Vui lòng sử dụng ứng dụng ngân hàng quét mã QR bên dưới.`)
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

                        return await i.editReply({ embeds: [embed], components: [row] });
                    }

                    // Xử lý nút quay lại
                    if (i.isButton() && i.customId === 'nap_back_btn') {
                        await i.update({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('#5865F2')
                                    .setTitle('<a:VerifiedTwitter:1418649004912148511> Hướng Dẫn Chọn Gói')
                                    .setDescription('Vui lòng quay lại khung tin nhắn chính ở kênh chat để chọn lại gói <a:diamondgem:1418649012289933434>.')
                            ],
                            components: []
                        });
                    }
                } catch (err) {
                    // Bỏ qua các ngoại lệ nhỏ từ token cũ để tránh crash bot
                }
            });
        }
    }
};
