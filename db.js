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

// Định nghĩa schema cho một đối tượng thẻ bài
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

// Định nghĩa schema cho một đối tượng trang bị
const equipmentSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
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
    cards: [cardSchema], 
    // Các trường lưu danh sách tất cả các item đã mua
    ownedBanners: { type: [String], default: [] },
    ownedBadges: { type: [String], default: [] },
    // ✅ Các trường mới lưu item hiện tại đang được gắn
    banner: { type: String, default: null },
    badge: { type: String, default: null },
    monsters: [monsterSchema],
    ownedEquipment: [equipmentSchema],
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
    if (user.balance < amount) return false; // Thêm logic này
    user.balance -= amount;
    await user.save();
    return true; // Trả về true khi thành công
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
};
