const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addBalance, getBalance, getUser } = require('../db');
const MONSTERS = require('../monsters');
const { v4: uuidv4 } = require('uuid');

// --- Cấu hình trò chơi ---

const EQUIPMENT = {
    // --- Vũ Khí (Weapons) ---
    'kiem_sat': {
        name: 'Kiếm Sắt',
        emoji: '🗡️',
        cost: 2500,
        stats: { attack: 5, defense: 0, hp: 0 }
    },
    'kiem_lua': {
        name: 'Kiếm Lửa',
        emoji: '🔥',
        cost: 5000,
        stats: { attack: 10, defense: 0, hp: 0 }
    },
    'riu_bang': {
        name: 'Rìu Băng',
        emoji: '❄️',
        cost: 8000,
        stats: { attack: 15, defense: 0, hp: 0 }
    },
    'cung_than_cong': {
        name: 'Cung Thần Công',
        emoji: '🏹',
        cost: 12000,
        stats: { attack: 20, defense: 0, hp: 0 }
    },

    // --- Áo Giáp & Khiên (Armor & Shields) ---
    'ao_giap_da': {
        name: 'Áo Giáp Da',
        emoji: '👕',
        cost: 2000,
        stats: { attack: 0, defense: 5, hp: 0 }
    },
    'ao_giap_sat': {
        name: 'Áo Giáp Sắt',
        emoji: '🛡️',
        cost: 7500,
        stats: { attack: 0, defense: 15, hp: 0 }
    },
    'khien_rong': {
        name: 'Khiên Rồng',
        emoji: '🐉',
        cost: 10000,
        stats: { attack: 0, defense: 20, hp: 0 }
    },
    
    // --- Phụ Kiện (Accessories) ---
    'nhan_suc_song': {
        name: 'Nhẫn Sức Sống',
        emoji: '💍',
        cost: 4000,
        stats: { attack: 0, defense: 0, hp: 20 }
    },
    'non_hiep_si': {
        name: 'Nón Hiệp Sĩ',
        emoji: '🪖',
        cost: 3000,
        stats: { attack: 0, defense: 5, hp: 5 }
    },
    'vong_co_mana': {
        name: 'Vòng Cổ Mana',
        emoji: '🔮',
        cost: 6000,
        stats: { attack: 5, defense: 5, hp: 5 }
    },
};

// 📌 Hàm tính toán chỉ số cuối cùng của quái vật (dựa trên cấp độ và trang bị)
function calculateStats(monster, user) {
    const monsterData = MONSTERS[monster.type];
    if (!monsterData) {
        return { attack: 0, defense: 0, hp: 0 };
    }
    const levelFactor = 1 + (monster.level - 1) * 0.1;
    let attack = Math.floor(monsterData.baseStats.attack * levelFactor);
    let defense = Math.floor(monsterData.baseStats.defense * levelFactor);
    let hp = Math.floor(monsterData.baseStats.hp * levelFactor);
    let equippedHp = monster.hp;
    let maxHp = hp;

    // 📌 Duyệt qua tất cả các trang bị đã đeo
    if (user && user.ownedEquipment && monster.equippedEquipment && Array.isArray(monster.equippedEquipment)) {
        monster.equippedEquipment.forEach(equipmentId => {
            const equippedItem = user.ownedEquipment.find(item => item.id === equipmentId);
            if (equippedItem) {
                const equipmentData = EQUIPMENT[equippedItem.type];
                if (equipmentData) {
                    attack += equipmentData.stats.attack;
                    defense += equipmentData.stats.defense;
                    hp += equipmentData.stats.hp;
                }
            }
        });
    }

    // Cập nhật lại maxHP và HP hiện tại sau khi tính toán trang bị
    maxHp = hp;
    equippedHp = monster.hp + (hp - monsterData.baseStats.hp);
    if (equippedHp > maxHp) equippedHp = maxHp;

    return { attack, defense, hp, equippedHp, maxHp };
}

// Hàm tạo thanh máu bằng emoji
function generateHealthBar(currentHp, maxHp) {
    const totalBlocks = 10;
    const filledBlocks = Math.round((currentHp / maxHp) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    
    const filledEmoji = '🟩';
    const emptyEmoji = '⬜';
    
    const healthBar = filledEmoji.repeat(filledBlocks) + emptyEmoji.repeat(emptyBlocks);
    
    return `[ ${healthBar} ] ${currentHp}/${maxHp} HP`;
}

// Hàm mô phỏng trận đấu với các hiệu ứng mới và log chi tiết
function battle(monster1, monster2) {
    let log = [];
    let turn = 1;

    let m1 = { ...monster1 };
    let m2 = { ...monster2 };
    
    const m1MaxHp = calculateStats(m1).hp;
    const m2MaxHp = calculateStats(m2).hp;
    
    m1.stats.hp = m1MaxHp;
    m2.stats.hp = m2MaxHp;

    const critChance = 0.1;
    const critMultiplier = 1.5;
    const dodgeChance = 0.15;

    log.push(`**Bắt đầu trận đấu!**`);
    log.push(`\n__Thông tin Quái vật:__`);
    log.push(`${m1.name}: ${generateHealthBar(m1.stats.hp, m1MaxHp)}`);
    log.push(`${m2.name}: ${generateHealthBar(m2.stats.hp, m2MaxHp)}`);

    while (m1.stats.hp > 0 && m2.stats.hp > 0 && turn < 50) {
        log.push(`\n__Lượt ${turn}__`);

        // Lượt của quái vật 1
        const m1Dodged = Math.random() < dodgeChance;
        if (m1Dodged) {
            log.push(`💨 ${m2.name} đã né tránh thành công đòn tấn công của ${m1.name}!`);
        } else {
            let m2Damage = Math.max(1, m1.stats.attack - m2.stats.defense);
            const m1Crit = Math.random() < critChance;
            if (m1Crit) {
                m2Damage = Math.floor(m2Damage * critMultiplier);
                log.push(`💥 ${m1.name} đã **chí mạng**, gây **${m2Damage}** sát thương lên ${m2.name}!`);
            } else {
                log.push(`${m1.name} gây **${m2Damage}** sát thương lên ${m2.name}.`);
            }
            m2.stats.hp -= m2Damage;
        }

        if (m2.stats.hp <= 0) break;

        // Lượt của quái vật 2
        const m2Dodged = Math.random() < dodgeChance;
        if (m2Dodged) {
            log.push(`💨 ${m1.name} đã né tránh thành công đòn tấn công của ${m2.name}!`);
        } else {
            let m1Damage = Math.max(1, m2.stats.attack - m1.stats.defense);
            const m2Crit = Math.random() < critChance;
            if (m2Crit) {
                m1Damage = Math.floor(m1Damage * critMultiplier);
                log.push(`💥 ${m2.name} đã **chí mạng**, gây **${m1Damage}** sát thương lên ${m1.name}.`);
            } else {
                log.push(`${m2.name} gây **${m1Damage}** sát thương lên ${m1.name}.`);
            }
            m1.stats.hp -= m1Damage;
        }
        
        log.push(`${m1.name}: ${generateHealthBar(m1.stats.hp, m1MaxHp)}`);
        log.push(`${m2.name}: ${generateHealthBar(m2.stats.hp, m2MaxHp)}`);
        turn++;
    }

    if (m1.stats.hp > 0 && m2.stats.hp <= 0) {
        log.push(`\n**${m1.name}** đã chiến thắng!`);
        return { winner: m1, loser: m2, log: log.join('\n') };
    } else if (m2.stats.hp > 0 && m1.stats.hp <= 0) {
        log.push(`\n**${m2.name}** đã chiến thắng!`);
        return { winner: m2, loser: m1, log: log.join('\n') };
    } else {
        log.push(`\n**Trận đấu hòa.**`);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arena')
        .setDescription('Quản lý quái vật và chiến đấu trong đấu trường')
        .addSubcommand(subcommand =>
            subcommand
                .setName('xem')
                .setDescription('Xem bộ sưu tập quái vật của bạn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mua')
                .setDescription('Mua một quái vật mới từ cửa hàng')
                .addStringOption(option =>
                    option.setName('loai')
                        .setDescription('Chọn loại quái vật bạn muốn mua')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Slime', value: 'slime' },
                            { name: 'Goblin', value: 'goblin' },
                            { name: 'Chim Lửa', value: 'chim_lua' },
                            { name: 'Rồng Con', value: 'rong_con' },
                            { name: 'Tinh Linh Nước', value: 'tinh_linh_nuoc' },
                            { name: 'Siêu Nhân Gạo', value: 'sieu_nhan_gao' },
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('dau')
                .setDescription('Thách đấu với một người chơi khác')
                .addUserOption(option =>
                    option.setName('nguoichoi')
                        .setDescription('Người chơi bạn muốn thách đấu')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('sothutuquaivatcuaban')
                        .setDescription('Số thứ tự của quái vật của bạn để chiến đấu')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('nangcap')
                .setDescription('Tiến hóa quái vật của bạn khi đủ điều kiện')
                .addIntegerOption(option =>
                    option.setName('sothutuquaivat')
                        .setDescription('Số thứ tự của quái vật bạn muốn tiến hóa')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('muatrangbi')
                .setDescription('Mua một trang bị mới từ cửa hàng')
                .addStringOption(option =>
                    option.setName('trangbi')
                        .setDescription('Chọn trang bị bạn muốn mua')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Kiếm Sắt', value: 'kiem_sat' },
                            { name: 'Kiếm Lửa', value: 'kiem_lua' },
                            { name: 'Rìu Băng', value: 'riu_bang' },
                            { name: 'Cung Thần Công', value: 'cung_than_cong' },
                            { name: 'Áo Giáp da', value: 'ao_giap_da' },
                            { name: 'Áo Giáp Sắt', value: 'ao_giap_sat' },
                            { name: 'Khiên Rồng', value: 'khien_rong' },
                            { name: 'Nhẫn Sức Sống', value: 'nhan_suc_song' },
                            { name: 'Nón Hiệp Sĩ', value: 'non_hiep_si' },
                            { name: 'Vòng Cổ Mana', value: 'vong_co_mana' },
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('trangbi')
                .setDescription('Trang bị một trang bị cho quái vật của bạn')
                .addIntegerOption(option =>
                    option.setName('sothutuquaivat')
                        .setDescription('Số thứ tự của quái vật bạn muốn trang bị')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('sothututrangbi')
                        .setDescription('Số thứ tự của trang bị bạn muốn trang bị')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('khetrangbi')
                        .setDescription('Khe trang bị bạn muốn dùng (1, 2, hoặc 3)')
                        .setRequired(true)
                        .addChoices(
                            { name: '1', value: 1 },
                            { name: '2', value: 2 },
                            { name: '3', value: 3 }
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply(); // Hoãn phản hồi để tránh lỗi timeout

        try {
            const userId = interaction.user.id;
            const user = await getUser(userId);
            if (!user) {
                return interaction.editReply({ content: 'Không tìm thấy dữ liệu người dùng. Vui lòng thử lại sau.', ephemeral: true });
            }

            // Đảm bảo các mảng luôn được khởi tạo
            if (!user.monsters) {
                user.monsters = [];
            }
            if (!user.ownedEquipment) {
                user.ownedEquipment = [];
            }

            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'xem': {
                    if (user.monsters.length === 0) {
                        return interaction.editReply({ content: 'Bạn chưa có quái vật nào. Hãy dùng `/arena mua` để bắt đầu!', ephemeral: true });
                    }

                    const embeds = [];

                    user.monsters.forEach((m, index) => {
                        const monsterInfo = MONSTERS[m.type];
                        if (!monsterInfo) return;

                        const fullStats = calculateStats(m, user);
                        
                        let equipmentString = '';
                        if (m.equippedEquipment && Array.isArray(m.equippedEquipment)) {
                            for (let i = 0; i < 3; i++) {
                                const equipmentId = m.equippedEquipment[i];
                                const equippedItem = equipmentId ? user.ownedEquipment.find(item => item.id === equipmentId) : null;
                                if (equippedItem) {
                                    const equipmentData = EQUIPMENT[equippedItem.type];
                                    equipmentString += `> Trang bị ${i + 1}: ${equipmentData.emoji} **${equipmentData.name}**\n`;
                                } else {
                                    equipmentString += `> Trang bị ${i + 1}: \`Không có\`\n`;
                                }
                            }
                        } else {
                            // Khởi tạo mảng nếu chưa có
                            m.equippedEquipment = [null, null, null];
                            equipmentString = '> Trang bị: `Không có`\n';
                        }

                        const embed = new EmbedBuilder()
                            .setTitle(`${monsterInfo.name} (Cấp ${m.level})`)
                            .setDescription(
                                `**Thứ tự:** \`${index + 1}\`\n` +
                                `**ID:** \`${m.id}\`\n` +
                                `**EXP:** \`${m.exp}\`\n` +
                                `**Chỉ số:**\n` +
                                `> Tấn công: \`${fullStats.attack}\`\n` +
                                `> Phòng thủ: \`${fullStats.defense}\`\n` +
                                `> Máu: \`${fullStats.hp}\`\n` +
                                equipmentString
                            )
                            .setImage(monsterInfo.imageUrl)
                            .setColor('#3498db');
                        
                        embeds.push(embed);
                    });
                    
                    await user.save();
                    
                    const ownedEquipmentList = user.ownedEquipment.map((item, index) => {
                        const equipmentInfo = EQUIPMENT[item.type];
                        return `\`${index + 1}.\` ${equipmentInfo.emoji} **${equipmentInfo.name}** (ID: \`${item.id}\`)`;
                    }).join('\n');

                    const equipmentEmbed = new EmbedBuilder()
                        .setTitle('Trang Bị Của Bạn')
                        .setDescription(ownedEquipmentList || 'Bạn chưa có trang bị nào. Dùng `/arena muatrangbi` để mua.')
                        .setColor('#f1c40f');
                    
                    embeds.push(equipmentEmbed);

                    return interaction.editReply({ embeds: embeds });
                }

                case 'mua': {
                    const monsterType = interaction.options.getString('loai');
                    const monsterData = MONSTERS[monsterType];

                    if (!monsterData || !monsterData.cost) {
                        return interaction.editReply({ content: 'Loại quái vật không hợp lệ hoặc không có giá.', ephemeral: true });
                    }

                    const userBalance = await getBalance(userId);
                    if (userBalance < monsterData.cost) {
                        return interaction.editReply({ content: `<a:AbbyShocked:1393909368138895411> Bạn không đủ tiền để mua **${monsterData.name}**!`, ephemeral: true });
                    }

                    await addBalance(userId, -monsterData.cost);
                    const newMonster = {
                        id: uuidv4(),
                        type: monsterType,
                        name: monsterData.name,
                        level: 1,
                        exp: 0,
                        hp: monsterData.baseStats.hp,
                        maxHp: monsterData.baseStats.hp,
                        equippedEquipment: [null, null, null] // Khởi tạo mảng 3 khe trang bị
                    };
                    if (!user.monsters) {
                        user.monsters = [];
                    }
                    user.monsters.push(newMonster);
                    await user.save();

                    const embed = new EmbedBuilder()
                        .setTitle(`<a:Verified:1406631971509243974> Mua Quái Vật Thành Công`)
                        .setDescription(`Bạn đã mua một **${monsterData.name}** ${monsterData.emoji}`)
                        .addFields(
                            { name: 'Giá', value: `\`${monsterData.cost.toLocaleString()}\`<a:diamondgem:1402590496647413811>`, inline: true },
                            { name: 'Chỉ số cơ bản', value: `Tấn công: ${monsterData.baseStats.attack}\nPhòng thủ: ${monsterData.baseStats.defense}\nMáu: ${monsterData.baseStats.hp}`, inline: false }
                        )
                        .setColor('#2ecc71');
                    return interaction.editReply({ embeds: [embed] });
                }

                case 'muatrangbi': {
                    const equipmentType = interaction.options.getString('trangbi');
                    const equipmentData = EQUIPMENT[equipmentType];

                    if (!equipmentData) {
                        return interaction.editReply({ content: 'Loại trang bị không hợp lệ.', ephemeral: true });
                    }

                    const userBalance = await getBalance(userId);
                    if (userBalance < equipmentData.cost) {
                        return interaction.editReply({ content: `<a:AbbyShocked:1393909368138895411> Bạn không đủ tiền để mua **${equipmentData.name}**! Chi phí: **${equipmentData.cost.toLocaleString()}**<a:diamondgem:1402590496647413811>`, ephemeral: true });
                    }

                    await addBalance(userId, -equipmentData.cost);
                    const newEquipment = {
                        id: uuidv4(),
                        type: equipmentType,
                    };
                    user.ownedEquipment.push(newEquipment);
                    await user.save();

                    const embed = new EmbedBuilder()
                        .setTitle(`<a:Verified:1406631971509243974> Mua Trang Bị Thành Công`)
                        .setDescription(`Bạn đã mua một **${equipmentData.name}** ${equipmentData.emoji}`)
                        .addFields(
                            { name: 'Chi phí', value: `\`${equipmentData.cost.toLocaleString()}\`<a:diamondgem:1402590496647413811>`, inline: true },
                            { name: 'Số dư mới', value: `\`${(await getBalance(userId)).toLocaleString()}\`<a:diamondgem:1402590496647413811>`, inline: true },
                        )
                        .setColor('#2ecc71');
                    return interaction.editReply({ embeds: [embed] });
                }

                case 'trangbi': {
                    const monsterIndex = interaction.options.getInteger('sothutuquaivat') - 1;
                    const equipmentIndex = interaction.options.getInteger('sothututrangbi') - 1;
                    const slotIndex = interaction.options.getInteger('khetrangbi') - 1;

                    const monster = user.monsters[monsterIndex];
                    const equipment = user.ownedEquipment[equipmentIndex];

                    if (!monster) {
                        return interaction.editReply({ content: 'Số thứ tự quái vật không hợp lệ. Vui lòng kiểm tra lại bằng `/arena xem`', ephemeral: true });
                    }

                    if (slotIndex < 0 || slotIndex > 2) {
                        return interaction.editReply({ content: 'Khe trang bị không hợp lệ. Vui lòng chọn 1, 2, hoặc 3.', ephemeral: true });
                    }

                    // Nếu người dùng nhập số 0, họ muốn gỡ trang bị ở khe đó
                    if (interaction.options.getInteger('sothututrangbi') === 0) {
                        if (monster.equippedEquipment[slotIndex] === null) {
                            return interaction.editReply({ content: `Khe trang bị ${slotIndex + 1} của quái vật **${MONSTERS[monster.type].name}** đã trống.`, ephemeral: true });
                        }
                        monster.equippedEquipment[slotIndex] = null;
                        await user.save();
                        return interaction.editReply({ content: `Đã gỡ trang bị khỏi khe ${slotIndex + 1} của **${MONSTERS[monster.type].name}** thành công.`, ephemeral: true });
                    }
                    
                    if (!equipment) {
                        return interaction.editReply({ content: 'Số thứ tự trang bị không hợp lệ. Vui lòng kiểm tra lại bằng `/arena xem`', ephemeral: true });
                    }

                    // Nếu khe đã có trang bị, gỡ trang bị cũ trước
                    if (monster.equippedEquipment[slotIndex] !== null) {
                        const oldEquipmentId = monster.equippedEquipment[slotIndex];
                        const oldEquipment = user.ownedEquipment.find(item => item.id === oldEquipmentId);
                        if (oldEquipment) {
                            // Logic để trả trang bị cũ về kho đồ của người chơi
                            // (Mặc dù trong code hiện tại, nó chỉ là gỡ ID ra khỏi mảng)
                            // TODO: Cân nhắc thêm logic để đảm bảo trang bị cũ vẫn tồn tại trong ownedEquipment
                        }
                    }

                    // Gán ID của trang bị mới vào quái vật
                    monster.equippedEquipment[slotIndex] = equipment.id;
                    await user.save();
                    
                    const equipmentData = EQUIPMENT[equipment.type];
                    const monsterData = MONSTERS[monster.type];

                    const embed = new EmbedBuilder()
                        .setTitle(`<a:Verified:1406631971509243974> Trang Bị Thành Công!`)
                        .setDescription(`Bạn đã trang bị **${equipmentData.name}** ${equipmentData.emoji} cho quái vật **${monsterData.name}** của mình tại khe ${slotIndex + 1}.`)
                        .setColor('#3498db');
                    return interaction.editReply({ embeds: [embed] });
                }

                case 'dau': {
                    const opponentUser = interaction.options.getUser('nguoichoi');
                    const yourMonsterIndex = interaction.options.getInteger('sothutuquaivatcuaban') - 1;

                    if (opponentUser.id === userId) {
                        return interaction.editReply({ content: 'Bạn không thể đấu với chính mình!', ephemeral: true });
                    }

                    const opponent = await getUser(opponentUser.id);
                    if (!opponent || !opponent.monsters || opponent.monsters.length === 0) {
                        return interaction.editReply({ content: `${opponentUser.username} không có quái vật nào để đấu.`, ephemeral: true });
                    }

                    const yourMonster = user.monsters[yourMonsterIndex];
                    if (!yourMonster) {
                        return interaction.editReply({ content: 'Số thứ tự quái vật của bạn không hợp lệ. Vui lòng kiểm tra lại bằng `/arena xem`', ephemeral: true });
                    }
                    const yourMonsterData = MONSTERS[yourMonster.type];
                    if (!yourMonsterData) {
                        return interaction.editReply({ content: 'Quái vật của bạn không hợp lệ. Vui lòng xóa nó khỏi file `db.json` hoặc liên hệ hỗ trợ.', ephemeral: true });
                    }

                    const opponentMonster = opponent.monsters[Math.floor(Math.random() * opponent.monsters.length)];
                    const opponentMonsterData = MONSTERS[opponentMonster.type];
                    if (!opponentMonsterData) {
                        return interaction.editReply({ content: `Đối thủ của bạn có quái vật không hợp lệ. Vui lòng chọn người chơi khác.`, ephemeral: true });
                    }
                    
                    const yourMonsterStats = calculateStats(yourMonster, user);
                    const opponentMonsterStats = calculateStats(opponentMonster, opponent);

                    const yourMonsterCopy = {
                        ...yourMonster,
                        name: yourMonsterData.name,
                        stats: { ...yourMonsterStats }
                    };
                    const opponentMonsterCopy = {
                        ...opponentMonster,
                        name: opponentMonsterData.name,
                        stats: { ...opponentMonsterStats }
                    };
                    
                    const battleResult = battle(yourMonsterCopy, opponentMonsterCopy);
                    let resultMessage;
                    let expGained = 0;

                    if (battleResult && battleResult.winner.id === yourMonsterCopy.id) {
                        await addBalance(userId, 500);
                        expGained = 15;
                        resultMessage = `<a:AbbyHappy:1393909327848538122> **<@${userId}>** đã chiến thắng! Bạn nhận được **500**<a:diamondgem:1402590496647413811>!`;
                    } else if (battleResult && battleResult.winner.id === opponentMonsterCopy.id) {
                        await addBalance(userId, -250);
                        expGained = 5;
                        resultMessage = `<a:AbbyCry:1393909295665643540> **<@${opponentUser.id}>** đã chiến thắng! Bạn bị mất **250**<a:diamondgem:1402590496647413811>!`;
                    } else {
                        expGained = 10;
                        resultMessage = `Trận đấu kết thúc với kết quả hòa. Không ai thắng hay thua.`;
                    }
                    
                    yourMonster.exp = (yourMonster.exp || 0) + expGained;
                    const requiredExp = MONSTERS[yourMonster.type]?.expToLevelUp || 100;
                    while (yourMonster.exp >= requiredExp) {
                        yourMonster.level++;
                        yourMonster.exp -= requiredExp;
                        resultMessage += `\n**${yourMonsterData.name}** đã đạt **Cấp ${yourMonster.level}**!`;
                    }
                    await user.save();

                    let battleLog = battleResult ? battleResult.log : 'Hòa.';
                    // Giới hạn log để không bị quá dài
                    const logLines = battleLog.split('\n');
                    if (logLines.length > 15) {
                        battleLog = "*(Log trận đấu đã bị cắt bớt để hiển thị)*\n" + logLines.slice(-15).join('\n');
                    }

                    const battleEmbed = new EmbedBuilder()
                        .setTitle(`⚔️ Trận Đấu Giữa ${yourMonsterData.name} và ${opponentMonsterData.name}`)
                        .setDescription(resultMessage)
                        .addFields(
                            { name: 'Kết quả trận đấu', value: battleLog, inline: false },
                        )
                        .setColor('#e74c3c');
                    return interaction.editReply({ embeds: [battleEmbed] });
                }

                case 'nangcap': {
                    const monsterIndex = interaction.options.getInteger('sothutuquaivat') - 1;
                    const monster = user.monsters[monsterIndex];

                    if (!monster) {
                        return interaction.editReply({ content: 'Số thứ tự quái vật không hợp lệ. Vui lòng kiểm tra lại bằng `/arena xem`', ephemeral: true });
                    }

                    const monsterData = MONSTERS[monster.type];
                    if (!monsterData || !monsterData.evolvesTo) {
                        return interaction.editReply({ content: `**${monster.name}** không có khả năng tiến hóa.`, ephemeral: true });
                    }

                    if (monster.level < monsterData.evolvesAtLevel) {
                        return interaction.editReply({ content: `**${monster.name}** cần đạt Cấp **${monsterData.evolvesAtLevel}** để tiến hóa.`, ephemeral: true });
                    }

                    const evolvedMonsterData = MONSTERS[monsterData.evolvesTo];
                    if (!evolvedMonsterData) {
                        return interaction.editReply({ content: 'Tiến hóa thất bại. Quái vật không có hình thái tiến hóa hợp lệ.', ephemeral: true });
                    }

                    monster.type = monsterData.evolvesTo;
                    monster.name = evolvedMonsterData.name;
                    monster.level = 1;
                    monster.exp = 0;
                    await user.save();

                    const embed = new EmbedBuilder()
                        .setTitle(`<a:Verified:1406631971509243974> Tiến Hóa Thành Công!`)
                        .setDescription(`**${monsterData.name}** đã tiến hóa thành **${evolvedMonsterData.name}** ${evolvedMonsterData.emoji} với sức mạnh mới!`)
                        .setColor('#9b59b6');
                    
                    return interaction.editReply({ embeds: [embed] });
                }
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Có lỗi xảy ra khi thực thi lệnh này!' });
        }
    }
};
