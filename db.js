const mongoose = require('mongoose');

// Định nghĩa Schema cho các loại dữ liệu lồng nhau
const buildingSchema = new mongoose.Schema({
    type: String,
    level: Number
});

const monsterSchema = new mongoose.Schema({
    id: String,
    type: String,
    name: String,
    level: Number,
    exp: Number,
    hp: Number,
    maxHp: Number,
    equippedEquipment: mongoose.Schema.Types.Mixed,
    attack: Number,
    defense: Number
});

const equipmentSchema = new mongoose.Schema({
    id: String,
    type: String
});

const cardSchema = new mongoose.Schema({
    type: String,
    rarity: String,
    data: {
        name: String,
        rarity: String,
        description: String,
        stats: {
            attack: Number,
            hp: Number
        },
        imageUrl: String
    },
    count: Number
});

// Định nghĩa Schema chính cho người dùng
const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true, required: true },
    balance: { type: Number, default: 100000 },
    lastDaily: { type: Number, default: 0 },
    lastLoanDate: { type: Number, default: null },
    debt: { type: Number, default: 0 },
    banner: { type: String, default: "banner.png" },
    badge: { type: String, default: "lehoinguyentieu.png" },
    ownedBanners: { type: [String], default: ["banner.png"] },
    ownedBadges: { type: [String], default: ["lehoinguyentieu.png"] },
    city: {
        buildings: { type: [buildingSchema], default: [] },
        lastIncomeClaim: { type: Number, default: Date.now() }
    },
    monsters: { type: [monsterSchema], default: [] },
    ownedEquipment: { type: [equipmentSchema], default: [] },
    cards: { type: [cardSchema], default: [] },
    adventure: {
        currentLocation: { type: String, default: null },
        inventory: { type: Array, default: [] }
    },
    birthday: {
        month: { type: Number, default: null },
        day: { type: Number, default: null }
    }
}, {
    // Tùy chọn để có thể thêm các trường khác mà không cần định nghĩa trước
    strict: false
});

const User = mongoose.model('User', userSchema);

// Các hàm tương tác với database
async function getUser(id) {
    let user = await User.findOne({ userId: id });
    if (!user) {
        // Tạo người dùng mới nếu không tìm thấy
        user = new User({ userId: id });
        await user.save();
    }
    return user;
}

async function getBalance(id) {
    const user = await getUser(id);
    return user.balance;
}

async function addBalance(id, amount) {
    const user = await getUser(id);
    user.balance += amount;
    await user.save();
    return user.balance;
}

async function deductBalance(id, amount) {
    const user = await getUser(id);
    if (user.balance < amount) return false;
    user.balance -= amount;
    await user.save();
    return true;
}

async function setBalance(id, amount) {
    const user = await getUser(id);
    user.balance = amount;
    await user.save();
    return user.balance;
}

async function getLastDaily(id) {
    const user = await getUser(id);
    return user.lastDaily;
}

async function setLastDaily(id, timestamp) {
    const user = await getUser(id);
    user.lastDaily = timestamp;
    await user.save();
}

async function getDebt(id) {
    const user = await getUser(id);
    return user.debt;
}

async function setDebt(id, amount) {
    const user = await getUser(id);
    user.debt = amount;
    await user.save();
}

async function getLastLoanDate(id) {
    const user = await getUser(id);
    return user.lastLoanDate;
}

async function setLastLoanDate(id, timestamp) {
    const user = await getUser(id);
    user.lastLoanDate = timestamp;
    await user.save();
}

async function getAllUsers() {
    return await User.find({});
}

async function getAllBalances() {
    const users = await getAllUsers();
    const balances = users.map(user => ({ id: user.userId, balance: user.balance }));
    return balances.sort((a, b) => b.balance - a.balance);
}

module.exports = {
    getUser,
    getBalance,
    addBalance,
    deductBalance,
    setBalance,
    getLastDaily,
    setLastDaily,
    getDebt,
    setDebt,
    getLastLoanDate,
    setLastLoanDate,
    getAllUsers,
    getAllBalances
};
