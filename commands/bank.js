const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addBalance, getBalance, getDebt, setDebt, getLastLoanDate, setLastLoanDate } = require('../db');

// --- Cấu hình ngân hàng ---
const LOAN_COOLDOWN = 24 * 60 * 60 * 1000; // 24 giờ
const MAX_LOAN_AMOUNT = 50000;
const INTEREST_RATE = 0.10; // 10% lãi suất

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Hệ thống ngân hàng tương tác trực quan'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const getMainMenuComponent = () => {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`bank-main-${interaction.user.id}`)
                .setPlaceholder("🏦 Chọn dịch vụ ngân hàng bạn muốn sử dụng")
                .addOptions([
                    { label: "💳 Vay tiền", value: "bank_vay", description: "Vay tiền từ ngân hàng với hạn mức tối đa" },
                    { label: "💸 Trả nợ", value: "bank_tra", description: "Thanh toán khoản nợ hiện tại cho ngân hàng" },
                    { label: "📊 Xem thông tin nợ", value: "bank_xem", description: "Kiểm tra khoản nợ và thời gian cooldown vay" }
                ]);
            return new ActionRowBuilder().addComponents(selectMenu);
        };

        const responseMessage = await interaction.editReply({
            content: "👋 Chào mừng bạn đến với **Ngân Hàng Trung Ương**. Vui lòng chọn dịch vụ bên dưới:",
            components: [getMainMenuComponent()]
        });

        const collector = responseMessage.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60_000,
        });

        collector.on("collect", async (i) => {
            const userId = interaction.user.id;
            const now = Date.now();
            const choice = i.values ? i.values[0] : null;

            const getBackRow = () => {
                const backBtn = new ButtonBuilder()
                    .setCustomId(`bank-back-main`)
                    .setLabel("Quay lại")
                    .setStyle(ButtonStyle.Secondary);
                return new ActionRowBuilder().addComponents(backBtn);
            };

            // Nút hoặc tùy chọn quay lại menu chính
            if (i.customId === "bank-back-main" || choice === "main_menu") {
                await i.update({
                    content: "👋 Chào mừng bạn đến với **Ngân Hàng Trung Ương**. Vui lòng chọn dịch vụ bên dưới:",
                    components: [getMainMenuComponent()]
                });
                return;
            }

            // 1. GIAO DIỆN VAY TIỀN (Chọn mức tiền vay nhanh)
            if (choice === "bank_vay") {
                const debt = await getDebt(userId);
                const lastLoanDate = await getLastLoanDate(userId);

                if (debt > 0) {
                    return i.update({ 
                        content: `❌ Bạn đang có nợ là **${debt.toLocaleString()}**<a:diamondgem:1418649012289933434>. Vui lòng trả hết nợ để vay tiếp!`, 
                        components: [getBackRow()] 
                    });
                }

                if (lastLoanDate && now - lastLoanDate < LOAN_COOLDOWN) {
                    const remainingTime = LOAN_COOLDOWN - (now - lastLoanDate);
                    const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));
                    return i.update({ 
                        content: `⏳ Bạn chỉ có thể vay tiền mỗi **24 giờ**. Vui lòng chờ **${remainingHours} giờ** nữa!`, 
                        components: [getBackRow()] 
                    });
                }

                const loanOptions = [10000, 20000, 30000, 40000, 50000].map(amount => ({
                    label: `Vay ${amount.toLocaleString()} xu`,
                    description: `Lãi 10% -> Tổng trả ${(amount + amount * INTEREST_RATE).toLocaleString()} xu`,
                    value: `do_loan_${amount}`
                }));

                const loanSelect = new StringSelectMenuBuilder()
                    .setCustomId(`bank-action-loan-${userId}`)
                    .setPlaceholder("Chọn số tiền muốn vay")
                    .addOptions(loanOptions);

                return i.update({
                    content: "💳 **Chọn hạn mức số tiền bạn muốn vay từ ngân hàng:**",
                    components: [new ActionRowBuilder().addComponents(loanSelect), getBackRow()]
                });
            }

            // 2. GIAO DIỆN TRẢ NỢ
            if (choice === "bank_tra") {
                const debt = await getDebt(userId);
                const userBalance = await getBalance(userId);

                if (debt <= 0) {
                    return i.update({ 
                        content: "<a:AbbyHappy:1393909327848538122> Bạn hiện không có khoản nợ nào cả!", 
                        components: [getBackRow()] 
                    });
                }

                const maxPayable = Math.min(debt, userBalance);
                if (maxPayable <= 0) {
                    return i.update({
                        content: `❌ Bạn đang nợ **${debt.toLocaleString()}**<a:diamondgem:1418649012289933434> nhưng số dư ví của bạn đang trống không đủ để trả!`,
                        components: [getBackRow()]
                    });
                }

                // Cung cấp các mức trả nợ mẫu hoặc trả toàn bộ
                const payAmounts = [...new Set([
                    Math.floor(debt * 0.25),
                    Math.floor(debt * 0.5),
                    debt
                ])].filter(amt => amt > 0 && amt <= userBalance);

                const payOptions = payAmounts.map(amt => ({
                    label: amt === debt ? `Trả hết toàn bộ (${amt.toLocaleString()} xu)` : `Trả ${amt.toLocaleString()} xu`,
                    value: `do_pay_${amt}`
                }));

                const paySelect = new StringSelectMenuBuilder()
                    .setCustomId(`bank-action-pay-${userId}`)
                    .setPlaceholder("Chọn số tiền muốn thanh toán nợ")
                    .addOptions(payOptions);

                return i.update({
                    content: `💸 Khoản nợ hiện tại: **${debt.toLocaleString()}** xu | Số dư của bạn: **${userBalance.toLocaleString()}** xu\nChọn số tiền bạn muốn trả:`,
                    components: [new ActionRowBuilder().addComponents(paySelect), getBackRow()]
                });
            }

            // 3. XEM THÔNG TIN NGÂN HÀNG
            if (choice === "bank_xem") {
                const debt = await getDebt(userId);
                const lastLoanDate = await getLastLoanDate(userId);
                const nextLoanTime = lastLoanDate ? lastLoanDate + LOAN_COOLDOWN : null;
                const remainingTime = nextLoanTime ? nextLoanTime - now : 0;
                const remainingHours = remainingTime > 0 ? Math.ceil(remainingTime / (1000 * 60 * 60)) : 0;

                const embed = new EmbedBuilder()
                    .setTitle('**<a:VerifiedTwitter:1418649004912148511> Thông Tin Ngân Hàng**')
                    .setDescription('Thông tin chi tiết về khoản nợ và hạn mức của bạn')
                    .addFields(
                        { name: 'Nợ hiện tại', value: `\`${debt.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: false },
                        { name: 'Số tiền vay tối đa', value: `\`${MAX_LOAN_AMOUNT.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: false },
                        { name: 'Thời gian có thể vay tiếp', value: remainingHours > 0 ? `\`${remainingHours}\` giờ nữa` : 'Bạn có thể vay ngay bây giờ', inline: false }
                    )
                    .setColor('#3498db');

                return i.update({
                    content: "",
                    embeds: [embed],
                    components: [getBackRow()]
                });
            }

            // 4. XỬ LÝ THỰC HIỆN VAY
            if (i.customId === `bank-action-loan-${userId}`) {
                await i.deferUpdate();
                const amount = parseInt(i.values[0].replace("do_loan_", ""));
                const debtCheck = await getDebt(userId);
                const lastCheck = await getLastLoanDate(userId);

                if (debtCheck > 0 || (lastCheck && now - lastCheck < LOAN_COOLDOWN)) {
                    return i.editReply({ content: "❌ Giao dịch thất bại do không đủ điều kiện vay lúc này.", components: [getBackRow()] });
                }

                const debtWithInterest = Math.floor(amount + amount * INTEREST_RATE);
                await addBalance(userId, amount);
                await setDebt(userId, debtWithInterest);
                await setLastLoanDate(userId, now);
                const newBalance = await getBalance(userId);

                const embed = new EmbedBuilder()
                    .setTitle('**<a:VerifiedTwitter:1418649004912148511> Vay Tiền Thành Công**')
                    .setDescription(`Bạn đã vay thành công **${amount.toLocaleString()}**<a:diamondgem:1418649012289933434>.`)
                    .addFields(
                        { name: 'Số dư mới', value: `\`${newBalance.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                        { name: 'Tổng nợ (gồm lãi)', value: `\`${debtWithInterest.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                        { name: 'Lãi suất', value: `${INTEREST_RATE * 100}%`, inline: true }
                    )
                    .setColor('#f1c40f');

                return i.editReply({ embeds: [embed], components: [getBackRow()] });
            }

            // 5. XỬ LÝ THỰC HIỆN TRẢ NỢ
            if (i.customId === `bank-action-pay-${userId}`) {
                await i.deferUpdate();
                const amount = parseInt(i.values[0].replace("do_pay_", ""));
                const debt = await getDebt(userId);
                const userBalance = await getBalance(userId);

                if (debt <= 0 || amount > debt || amount > userBalance) {
                    return i.editReply({ content: "❌ Số tiền trả nợ không hợp lệ hoặc số dư không đủ.", components: [getBackRow()] });
                }

                await addBalance(userId, -amount);
                await setDebt(userId, debt - amount);
                const newBalance = await getBalance(userId);
                const remainingDebt = await getDebt(userId);

                const embed = new EmbedBuilder()
                    .setTitle('**<a:VerifiedTwitter:1418649004912148511> Trả Nợ Thành Công**')
                    .setDescription(`Bạn đã trả thành công **${amount.toLocaleString()}**<a:diamondgem:1418649012289933434>.`)
                    .addFields(
                        { name: 'Số dư mới', value: `\`${newBalance.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                        { name: 'Nợ còn lại', value: `\`${remainingDebt.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true }
                    )
                    .setColor('#2ecc71');

                return i.editReply({ embeds: [embed], components: [getBackRow()] });
            }
        });

        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                await interaction.editReply({ content: "⏳ Phiên giao dịch ngân hàng đã hết hạn.", components: [] }).catch(() => {});
            }
        });
    }
};
