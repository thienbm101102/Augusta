const { SlashCommandBuilder, EmbedBuilder, InteractionFlags } = require('discord.js');
const { addBalance, getBalance, getDebt, setDebt, getLastLoanDate, setLastLoanDate } = require('../db');

// --- Cấu hình ngân hàng ---
const LOAN_COOLDOWN = 24 * 60 * 60 * 1000; // 24 giờ
const MAX_LOAN_AMOUNT = 50000;
const INTEREST_RATE = 0.10; // 15% lãi suất

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Hệ thống vay và trả tiền trong ngân hàng')
        .addSubcommand(subcommand =>
            subcommand
                .setName('vay')
                .setDescription('Vay tiền từ ngân hàng')
                .addIntegerOption(option =>
                    option.setName('sotien')
                        .setDescription('Số tiền bạn muốn vay')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tra')
                .setDescription('Trả nợ cho ngân hàng')
                .addIntegerOption(option =>
                    option.setName('sotien')
                        .setDescription('Số tiền bạn muốn trả')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                .setDescription('Xem thông tin nợ của bạn')
        ),
    async execute(interaction) {
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        const now = Date.now();

        switch (subcommand) {
            case 'vay': {
                const amount = interaction.options.getInteger('sotien');
                const lastLoanDate = await getLastLoanDate(userId);
                const debt = await getDebt(userId);

                if (debt > 0) {
                    return interaction.reply({ content: `<a:AbbyAnnoyed:1393909340914845706> Bạn đang có nợ là **${debt.toLocaleString()}**<a:diamondgem:1418649012289933434>. Vui lòng trả hết nợ để vay tiếp!`, ephemeral: true });
                }

                if (lastLoanDate && now - lastLoanDate < LOAN_COOLDOWN) {
                    const remainingTime = LOAN_COOLDOWN - (now - lastLoanDate);
                    const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));
                    return interaction.reply({ content: `<a:AbbyAnnoyed:1393909340914845706> Bạn chỉ có thể vay tiền mỗi **24 giờ**. Vui lòng chờ **${remainingHours} giờ** nữa!`, ephemeral: true });
                }

                if (amount <= 0 || amount > MAX_LOAN_AMOUNT) {
                    return interaction.reply({ content: `<a:AbbyAnnoyed:1393909340914845706> Số tiền vay phải lớn hơn 0 và không quá **${MAX_LOAN_AMOUNT.toLocaleString()}**<a:diamondgem:1418649012289933434>.`, ephemeral: true });
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
                return interaction.reply({ embeds: [embed] });
            }

            case 'tra': {
                const amount = interaction.options.getInteger('sotien');
                const debt = await getDebt(userId);
                const userBalance = await getBalance(userId);

                if (debt <= 0) {
                    return interaction.reply({ content: '<a:AbbyHappy:1393909327848538122> Bạn không có nợ!', ephemeral: true });
                }

                if (amount <= 0 || amount > debt || amount > userBalance) {
                    return interaction.reply({ content: `<a:AbbyNom:1393909345514815589> Số tiền trả không hợp lệ. Bạn cần trả từ **1** đến **${Math.min(debt, userBalance).toLocaleString()}**<a:diamondgem:1418649012289933434>.`, ephemeral: true });
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
                return interaction.reply({ embeds: [embed] });
            }

            case 'xem': {
                const debt = await getDebt(userId);
                const lastLoanDate = await getLastLoanDate(userId);
                const nextLoanTime = lastLoanDate ? lastLoanDate + LOAN_COOLDOWN : null;
                const remainingTime = nextLoanTime ? nextLoanTime - now : 0;
                
                const remainingHours = remainingTime > 0 ? Math.ceil(remainingTime / (1000 * 60 * 60)) : 0;

                const embed = new EmbedBuilder()
                    .setTitle('**<a:VerifiedTwitter:1418649004912148511> Thông Tin Ngân Hàng**')
                    .setDescription('Thông tin về nợ và khả năng vay của bạn')
                    .addFields(
                        { name: 'Nợ hiện tại', value: `\`${debt.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: false },
                        { name: 'Số tiền vay tối đa', value: `\`${MAX_LOAN_AMOUNT.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: false },
                        { name: 'Thời gian có thể vay tiếp', value: remainingHours > 0 ? `\`${remainingHours}\` giờ nữa` : 'Bạn có thể vay ngay bây giờ', inline: false }
                    )
                    .setColor('#3498db');
                return interaction.reply({ embeds: [embed] });
            }
        }
    }
};





