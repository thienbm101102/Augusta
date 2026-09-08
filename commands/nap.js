const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// --- CẤU HÌNH THÔNG TIN NGÂN HÀNG CỦA SHOP ---
const BANK_CONFIG = {
    BANK_ID: "SACOMBANK",               // Mã ngân hàng
    ACCOUNT_NO: "10112002",    // Số tài khoản nhận tiền
    ACCOUNT_NAME: "BUI MINH THIEN", // Tên chủ tài khoản
    TEMPLATE: "compact2"         // Kiểu hiển thị QR
};

// --- BANNER SHOP ---
const BANNER_URL = "https://i.ibb.co/60Qm7L95/camellya-wuthering-waves-game-hd-wallpaper-uhdpaper-com-659-5-r.jpg";

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
        .setDescription('Mở cửa hàng mua 💎 qua chuyển khoản ngân hàng tự động')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Chỉ Admin mới được dùng lệnh này

    async execute(interaction) {
        // Phản hồi lệnh của Admin ngay lập tức để Discord không báo lỗi timeout
        await interaction.reply({ content: '✅ Đã tạo bảng nạp tiền thành công ở kênh này!', ephemeral: true });

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
                .setCustomId(`nap-select-persistent`)
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

        // Gửi tin nhắn cố định ra thẳng kênh hiện tại để mọi người đều dùng được
        const responseMessage = await interaction.channel.send({
            embeds: [getMainMenuEmbed()],
            components: [getMainMenuComponent()]
        });

        // Tạo collector hoạt động vĩnh viễn (không giới hạn thời gian) cho mọi user
        const collector = responseMessage.createMessageComponentCollector({
            // Không giới hạn filter theo user.id nữa để bất kỳ ai cũng có thể bấm mua
        });

        collector.on("collect", async (i) => {
            const userId = i.user.id;

            // Xử lý nút quay lại menu chính
            if (i.customId === "nap-back-main" || (i.values && i.values[0] === "main_menu")) {
                await i.update({
                    embeds: [getMainMenuEmbed()],
                    components: [getMainMenuComponent()],
                    files: []
                });
                return;
            }

            // Xử lý khi chọn gói nạp (phải đúng customId của menu nạp)
            if (i.customId === "nap-select-persistent") {
                await i.deferUpdate();

                const choice = i.values[0];
                const selectedPackage = PACKAGES.find(p => p.id === choice);

                if (selectedPackage) {
                    // Cú pháp nội dung chuyển khoản chuẩn định danh gắn liền với người đang bấm
                    const memo = `NAP ${userId} ${selectedPackage.id}`;
                    
                    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${selectedPackage.price}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;

                    const embed = new EmbedBuilder()
                        .setColor('#FEE75C')
                        .setTitle('<a:VerifiedTwitter:1418649004912148511> HÓA ĐƠN THANH TOÁN CHUYỂN KHOẢN')
                        .setDescription(`Hóa đơn riêng của <@${userId}>. Vui lòng sử dụng ứng dụng ngân hàng quét mã QR bên dưới hoặc chuyển khoản thủ công.`)
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

                    // Dùng followUp hoặc editReply tùy thuộc vào ngữ cảnh, ở đây i.editReply sẽ cập nhật bảng riêng cho người vừa bấm
                    return i.editReply({
                        embeds: [embed],
                        components: [getBackRow()]
                    });
                }
            }
        });
    }
};
