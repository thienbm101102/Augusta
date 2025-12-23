const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBalance, getBalance, getUser } = require('../db');

// --- Cấu hình trò chơi ---
const BUILDINGS = {
    'nhaho': {
        emoji: '🏠', name: 'Nhà Ở',
        levels: [
            { cost: 5000, income: 500, happiness: 5 },
            { cost: 15000, income: 1500, happiness: 10 },
            { cost: 50000, income: 5000, happiness: 20 }
        ]
    },
    'congvien': {
        emoji: '🎡', name: 'Công Viên',
        levels: [
            { cost: 10000, income: 1000, happiness: 15 },
            { cost: 30000, income: 3500, happiness: 30 }
        ]
    },
    'nhamay': {
        emoji: '🏭', name: 'Nhà Máy',
        levels: [
            { cost: 20000, income: 2500, happiness: -10 },
            { cost: 60000, income: 8000, happiness: -20 }
        ]
    },
    'vanphong': {
        emoji: '🏢', name: 'Văn Phòng',
        levels: [
            { cost: 50000, income: 5000, happiness: -5 },
            { cost: 150000, income: 15000, happiness: -15 }
        ]
    },
    'toathap': {
        emoji: '🗼', name: 'Tòa Tháp',
        levels: [
            { cost: 500000, income: 30000, happiness: 50 },
            { cost: 1000000, income: 60000, happiness: 100 }
        ]
    },
    'truonghoc': {
        emoji: '🏫', name: 'Trường Học',
        levels: [
            { cost: 30000, income: 0, happiness: 25 },
            { cost: 75000, income: 0, happiness: 50 }
        ]
    },
    'benhvien': {
        emoji: '🏥', name: 'Bệnh Viện',
        levels: [
            { cost: 40000, income: 0, happiness: 30 },
            { cost: 90000, income: 0, happiness: 60 }
        ]
    },
    'sokhaiat': {
        emoji: '🚓', name: 'Sở Cảnh Sát',
        levels: [
            { cost: 35000, income: 0, happiness: 20 },
            { cost: 80000, income: 0, happiness: 45 }
        ]
    },
    'sanvanthethao': {
        emoji: '🏟️', name: 'Sân Vận Động',
        levels: [
            { cost: 100000, income: 20000, happiness: 75 }
        ]
    },
};

const MAP_SIZE = 5;
const INCOME_INTERVAL = 7200000;

function calculateStats(city) {
    let totalHappiness = 0;
    let totalIncome = 0;

    if (!city || !city.buildings) {
        return { happiness: 0, totalIncome: 0, finalIncome: 0 };
    }

    city.buildings.forEach(b => {
        const buildingData = BUILDINGS[b.type];
        if (buildingData && buildingData.levels[b.level]) {
            totalHappiness += buildingData.levels[b.level].happiness;
            totalIncome += buildingData.levels[b.level].income;
        }
    });

    const happiness = Math.max(0, Math.min(100, 50 + totalHappiness));
    const happinessFactor = happiness / 100;
    const finalIncome = Math.floor(totalIncome * happinessFactor);

    return { happiness, totalIncome, finalIncome };
}

// Hàm tạo bản đồ thành phố với nền động
function generateCityGrid(cityData) {
    const backgroundEmojis = ['🌲'];
    const cityMap = new Array(MAP_SIZE * MAP_SIZE).fill('⬜');
    
    // Lấp đầy bản đồ với các emoji nền ngẫu nhiên
    for (let i = 0; i < cityMap.length; i++) {
        cityMap[i] = backgroundEmojis[Math.floor(Math.random() * backgroundEmojis.length)];
    }

    // Đặt các công trình lên bản đồ
    if (cityData && cityData.buildings) {
        cityData.buildings.forEach((building, index) => {
            const buildingData = BUILDINGS[building.type];
            if (buildingData && index < cityMap.length) {
                cityMap[index] = buildingData.emoji;
            }
        });
    }

    let gridString = '';
    for (let i = 0; i < MAP_SIZE; i++) {
        const row = cityMap.slice(i * MAP_SIZE, (i + 1) * MAP_SIZE);
        gridString += row.join(' ') + '\n';
    }

    return gridString;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('thanhpho')
        .setDescription('Quản lý thành phố của bạn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('xay')
                .setDescription('Xây dựng một công trình trong thành phố của bạn')
                .addStringOption(option =>
                    option.setName('congtrinh')
                        .setDescription('Chọn công trình bạn muốn xây')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Nhà Ở', value: 'nhaho' },
                            { name: 'Công Viên', value: 'congvien' },
                            { name: 'Nhà Máy', value: 'nhamay' },
                            { name: 'Văn Phòng', value: 'vanphong' },
                            { name: 'Tòa Tháp', value: 'toathap' },
                            { name: 'Trường Học', value: 'truonghoc' },
                            { name: 'Bệnh Viện', value: 'benhvien' },
                            { name: 'Sở Cảnh Sát', value: 'sokhaiat' },
                            { name: 'Sân Vận Động', value: 'sanvanthethao' },
                        )
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nangcap')
                .setDescription('Nâng cấp một công trình trong thành phố của bạn')
                .addIntegerOption(option =>
                    option.setName('sothutu')
                        .setDescription('Vị trí của công trình bạn muốn nâng cấp (VD: 1, 2, 3...)')
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                .setDescription('Xem thành phố của bạn'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('thuhoach')
                .setDescription('Thu hoạch tiền từ thành phố của bạn')),

    async execute(interaction) {
        const userId = interaction.user.id;
        const user = await getUser(userId);
        const subcommand = interaction.options.getSubcommand();
        const userBalance = await getBalance(userId);

        if (!user.city) {
            user.city = { buildings: [], lastIncomeClaim: Date.now() };
            await user.save();
        }

        // Đảm bảo cấu trúc dữ liệu luôn chính xác
        const typeMap = Object.values(BUILDINGS).reduce((map, b) => {
            map[b.emoji] = b.name.replace(/\s/g, '').toLowerCase();
            return map;
        }, {});
        user.city.buildings = user.city.buildings
            .filter(b => b)
            .map(b => {
                if (typeof b === 'string' && typeMap[b]) {
                    return { type: typeMap[b], level: 0 };
                }
                return b;
            })
            .filter(b => b && BUILDINGS[b.type]);
        await user.save();

        switch (subcommand) {
            case 'xay': {
                const buildingKey = interaction.options.getString('congtrinh');
                const buildingData = BUILDINGS[buildingKey];

                if (!buildingData) {
                    return interaction.reply({ content: 'Không tìm thấy công trình này.', ephemeral: true });
                }
                if (user.city.buildings.length >= MAP_SIZE * MAP_SIZE) {
                    return interaction.reply({ content: 'Thành phố của bạn đã đầy!', ephemeral: true });
                }

                const level1 = buildingData.levels[0];
                if (userBalance < level1.cost) {
                    return interaction.reply({ content: `<a:AbbyShocked:1393909368138895411> Bạn không đủ tiền để xây **${buildingData.name}**! Chi phí: **${level1.cost.toLocaleString()}**<a:diamondgem:1418649012289933434>`, ephemeral: true });
                }

                await addBalance(userId, -level1.cost);
                user.city.buildings.push({ type: buildingKey, level: 0 });
                await user.save();

                const embed = new EmbedBuilder()
                    .setTitle(`**<a:Verified:1406631971509243974> Một Công Trình Đang Xây Ở ${interaction.member.displayName}**`)
                    .setDescription(`**${interaction.member.displayName}** đã xây **${buildingData.name}**!`)
                    .addFields(
                        { name: 'Chi phí', value: `\`${level1.cost.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                    )
                    .setColor('#2ecc71');

                return interaction.reply({ embeds: [embed] });
            }

            case 'nangcap': {
                const buildingIndex = interaction.options.getInteger('sothutu') - 1;
                const buildingToUpgrade = user.city.buildings[buildingIndex];

                if (!buildingToUpgrade) {
                    return interaction.reply({ content: 'Không tìm thấy công trình ở vị trí này.', ephemeral: true });
                }

                const buildingData = BUILDINGS[buildingToUpgrade.type];
                const currentLevel = buildingToUpgrade.level;
                const nextLevel = currentLevel + 1;

                if (nextLevel >= buildingData.levels.length) {
                    return interaction.reply({ content: `Công trình **${buildingData.name}** này đã đạt cấp độ tối đa!`, ephemeral: true });
                }

                const upgradeCost = buildingData.levels[nextLevel].cost;
                if (userBalance < upgradeCost) {
                    return interaction.reply({ content: `<a:AbbyShocked:1393909368138895411> Bạn không đủ tiền để nâng cấp! Chi phí: **${upgradeCost.toLocaleString()}**<a:diamondgem:1418649012289933434>`, ephemeral: true });
                }

                await addBalance(userId, -upgradeCost);
                buildingToUpgrade.level = nextLevel;
                await user.save();

                const updatedGrid = generateCityGrid(user.city);
                const embed = new EmbedBuilder()
                    .setTitle(`<a:Verified:1406631971509243974> Nâng Cấp Thành Công!`)
                    .setDescription(`Công trình **${buildingData.name}** đã được nâng cấp lên cấp độ **${nextLevel + 1}**!`)
                    .addFields(
                        { name: 'Chi phí', value: `\`${upgradeCost.toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                    )
                    .setColor('#9b59b6');

                return interaction.reply({ embeds: [embed] });
            }

            case 'xem': {
                const { happiness, totalIncome, finalIncome } = calculateStats(user.city);
                const cityGrid = generateCityGrid(user.city);

                const buildingDetails = user.city.buildings.map((b, index) => {
                    const buildingData = BUILDINGS[b.type];
                    return `\`${index + 1}.\` ${buildingData.emoji} **${buildingData.name}** (Cấp ${b.level + 1}) - Hạnh phúc: \`${buildingData.levels[b.level]?.happiness}\`, Thu nhập: \`${buildingData.levels[b.level]?.income}\`<a:diamondgem:1418649012289933434>`;
                }).join('\n');

                const timeUntilNextClaim = INCOME_INTERVAL - (Date.now() - (user.city.lastIncomeClaim || Date.now()));
                const minutesLeft = Math.ceil(timeUntilNextClaim / 1000 / 60);
                const estimatedWealth = (finalIncome * (24 * 7)) + (await getBalance(userId));

                const embed = new EmbedBuilder()
                    .setTitle(`**<a:Verified:1406631971509243974> Thành Phố Của ${interaction.member.displayName}**`)
                    .setDescription(
                        `Chào mừng đến với thành phố của bạn, nơi mọi công trình đều mang lại thu nhập và hạnh phúc!\n\n` +
                        `**💵 Thu nhập**\n` +
                        `> **Cơ bản:** \`${totalIncome.toLocaleString()}\`<a:diamondgem:1418649012289933434> mỗi giờ\n` +
                        `> **Thực tế:** \`${finalIncome.toLocaleString()}\`<a:diamondgem:1418649012289933434> mỗi giờ\n\n` +
                        `**💖 Hạnh phúc:** > **${happiness}%**\n` +
                        `**🏙️ Số công trình:** > **${user.city.buildings.length}**/${MAP_SIZE * MAP_SIZE}\n` +
                        `**⏱️ Thu hoạch tiếp theo:** > **${minutesLeft > 0 ? minutesLeft : 0}** phút\n` +
                        `**📊 Tổng tài sản:** > **${estimatedWealth.toLocaleString()}**<a:diamondgem:1418649012289933434>\n` +
                        `_ (Ước tính thu nhập cả tuần)_\n\n` +
                        `**📜 Chi tiết Công trình:**\n` +
                        (buildingDetails || 'Chưa có công trình nào.')
                    )
                    .addFields(
                        { name: '🗺️ Bản đồ Thành phố', value: `\`\`\`\n${cityGrid}\`\`\``, inline: false }
                    )
                    .setColor('#3498db')
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({ text: '© Copyright © 2025「✦ Áp Lực Chơi Game ✦」', iconURL: 'https://cdn.discordapp.com/avatars/1404793124991139850/3872c60a1f62ff82c9b31fc4265e2aee.webp' });
                return interaction.reply({ embeds: [embed] });
            }

            case 'thuhoach': {
                const now = Date.now();
                const lastClaim = user.city.lastIncomeClaim || now;
                const timePassed = now - lastClaim;
                const intervalsPassed = Math.floor(timePassed / INCOME_INTERVAL);

                if (intervalsPassed === 0) {
                    const timeLeft = Math.ceil((INCOME_INTERVAL - timePassed) / 1000 / 60);
                    return interaction.reply({ content: `Thành phố của bạn chưa sẵn sàng để thu hoạch. Vui lòng đợi thêm **${timeLeft}** phút nữa.`, ephemeral: true });
                }

                const { finalIncome } = calculateStats(user.city);
                const totalClaim = Math.floor(finalIncome * intervalsPassed);
                
                if (totalClaim === 0) {
                    user.city.lastIncomeClaim = now;
                    await user.save();
                    return interaction.reply({ content: 'Thành phố của bạn chưa có công trình nào để thu hoạch.', ephemeral: true });
                }

                await addBalance(userId, totalClaim);
                user.city.lastIncomeClaim = now;
                await user.save();

                const { happiness } = calculateStats(user.city);

                const embed = new EmbedBuilder()
                    .setTitle(`**<a:Verified:1406631971509243974> Thu Hoạch Thành Công!**`)
                    .setDescription(`Bạn đã thu hoạch thành công **${totalClaim.toLocaleString()}**<a:diamondgem:1418649012289933434> từ thành phố của mình!`)
                    .addFields(
                        { name: 'Số dư mới', value: `\`${(await getBalance(userId)).toLocaleString()}\`<a:diamondgem:1418649012289933434>`, inline: true },
                        { name: 'Số lượt thu hoạch', value: `${intervalsPassed} lượt`, inline: true },
                        { name: 'Hiệu quả thu nhập', value: `+${happiness}% Hạnh phúc`, inline: true }
                    )
                    .setColor('#f1c40f');

                return interaction.reply({ embeds: [embed] });
            }
        }
    }
};


