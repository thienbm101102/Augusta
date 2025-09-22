const mongoose = require('mongoose');

// Định nghĩa Schema cho người dùng
const userSchema = new mongoose.Schema({
    _id: String, // Discord user ID
    balance: { type: Number, default: 100000 },
    lastDaily: { type: Number, default: 0 },
    lastLoanDate: { type: Number, default: null },
    debt: { type: Number, default: 0 },
    banner: { type: String, default: 'banner.png' },
    badge: { type: String, default: 'thulinh.png' },
    ownedBanners: { type: [String], default: ['banner.png'] },
    ownedBadges: { type: [String], default: ['thulinh.png'] },
    city: {
        buildings: { type: Array, default: [] },
        lastIncomeClaim: { type: Number, default: 0 },
    },
    monsters: { type: Array, default: [] },
    ownedEquipment: { type: Array, default: [] },
    cards: { type: Array, default: [] },
});

// Tạo Model từ Schema
const User = mongoose.model('User', userSchema);

// Hàm kết nối đến MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB!');
        // Đồng bộ hóa dữ liệu từ db.json cũ sang MongoDB (Chỉ chạy một lần)
        // await migrateData();
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err);
    }
}

// Hàm lấy thông tin người dùng. Nếu chưa có, tạo mới
async function getUser(id) {
    let user = await User.findById(id);
    if (!user) {
        user = new User({ _id: id });
        await user.save();
    }
    return user;
}

// Các hàm thao tác với số dư
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

async function getBalance(id) {
    const user = await getUser(id);
    return user.balance;
}

// Các hàm khác
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
    const users = await User.find({});
    // Chuyển đổi định dạng để khớp với cấu trúc cũ
    const result = {};
    users.forEach(user => {
        result[user._id] = user.toObject();
    });
    return result;
}

async function getAllBalances() {
    const users = await User.find({}, 'balance');
    const balances = users.map(user => ({ id: user._id, balance: user.balance }));
    return balances.sort((a, b) => b.balance - a.balance);
}

// Export các hàm
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
};
