// db.js
const mongoose = require("mongoose");

// Kết nối MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Đã kết nối tới MongoDB Atlas!");
    } catch (err) {
        console.error("❌ Lỗi kết nối MongoDB:", err);
    }
}

// 1. Định nghĩa schema cho một đối tượng thẻ bài
const cardSchema = new mongoose.Schema({
    type: { type: String, required: true },
    count: { type: Number, required: true, default: 1 },
    rarity: { type: String, required: true }
});

// Định nghĩa schema cho một đối tượng quái vật
const monsterSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    level: { type: Number, required: true, default: 1 },
    exp: { type: Number, required: true, default: 0 },
    hp: { type: Number, required: true, default: 100 },
    maxHp: { type: Number, required: true, default: 100 },
    equippedEquipment: { type: [String], default: [null, null, null] },
});

// Schema User đã được cập nhật
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 100000 },
    debt: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastLoanDate: { type: Date, default: null },
    birthday: {
        day: { type: Number, default: null },
        month: { type: Number, default: null },
    },
    // Thay đổi kiểu dữ liệu của cards thành một mảng các đối tượng cardSchema
    cards: [cardSchema], 
    banners: { type: [String], default: [] },
    badges: { type: [String], default: [] },
    // Thay đổi kiểu dữ liệu của monsters thành một mảng các đối tượng monsterSchema
    monsters: [monsterSchema], 
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// Các hàm xử lý dữ liệu
async function getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    return user;
}

async function addBalance(userId, amount) {
    const user = await getUser(userId);
    user.balance += amount;
    await user.save();
    return user.balance;
}

async function deductBalance(userId, amount) {
    const user = await getUser(userId);
    user.balance -= amount;
    await user.save();
    return user.balance;
}

async function setBalance(userId, amount) {
    const user = await getUser(userId);
    user.balance = amount;
    await user.save();
    return user.balance;
}

async function getBalance(userId) {
    const user = await getUser(userId);
    return user.balance;
}

async function getLastDaily(userId) {
    const user = await getUser(userId);
    return user.lastDaily;
}

async function setLastDaily(userId, date) {
    const user = await getUser(userId);
    user.lastDaily = date;
    await user.save();
}

async function getDebt(userId) {
    const user = await getUser(userId);
    return user.debt;
}

async function setDebt(userId, amount) {
    const user = await getUser(userId);
    user.debt = amount;
    await user.save();
}

async function getLastLoanDate(userId) {
    const user = await getUser(userId);
    return user.lastLoanDate;
}

async function setLastLoanDate(userId, date) {
    const user = await getUser(userId);
    user.lastLoanDate = date;
    await user.save();
}

async function getAllUsers() {
    return await User.find({});
}

async function getAllBalances() {
    return await User.find({}, "userId balance").sort({ balance: -1 }).limit(10);
}

// 3. Thêm các hàm quản lý thẻ bài
async function addUserCard(userId, card) {
    const user = await getUser(userId);
    const existingCard = user.cards.find(c => c.type === card.type);

    if (existingCard) {
        existingCard.count++;
    } else {
        user.cards.push({ type: card.type, count: 1, rarity: card.rarity });
    }
    await user.save();
    return user;
}

async function removeUserCard(userId, cardType) {
    const user = await getUser(userId);
    const cardIndex = user.cards.findIndex(c => c.type === cardType);

    if (cardIndex !== -1) {
        if (user.cards[cardIndex].count > 1) {
            user.cards[cardIndex].count--;
        } else {
            user.cards.splice(cardIndex, 1);
        }
        await user.save();
        return true;
    }
    return false;
}

// Export
module.exports = {
    connectDB,
    getUser,
    addBalance,
    deductBalance,
    setBalance,
    getBalance,
    getLastDaily,
    setLastDaily,
    getDebt,
    setDebt,
    getLastLoanDate,
    setLastLoanDate,
    getAllUsers,
    getAllBalances,
    User,
    addUserCard,
    removeUserCard,
    User, // ✅ để dùng trong index.js
};
