const fs = require('fs-extra');
const path = require('path');
const dbPath = path.join(__dirname, 'db.json');

let db = { 
    users: {},  
    games: {},
    marketplace: [], 
    marketData: {},
    lastMarketUpdate: 0,
};

function loadDB() {
    try {
        if (fs.existsSync(dbPath)) {
            const loadedDb = fs.readJsonSync(dbPath);
            // Gán trực tiếp dữ liệu từ file để đảm bảo luôn cập nhật
            db = loadedDb;
            // Đảm bảo các thuộc tính chính luôn tồn tại
            if (!db.users) db.users = {};
            if (!db.games) db.games = {};
            if (!db.marketplace) db.marketplace = [];
            if (!db.marketData) db.marketData = {};
            if (!db.lastMarketUpdate) db.lastMarketUpdate = 0;
        } else {
            console.log("Database file not found, creating a new one.");
            saveDB();
        }
    } catch (err) {
        console.error('Lỗi khi tải database:', err);
        // Reset về trạng thái an toàn nếu file bị lỗi
        db = { users: {}, games: {}, marketplace: [], marketData: {}, lastMarketUpdate: 0 };
        saveDB();
    }
}

function saveDB() {
    try {
        fs.writeJsonSync(dbPath, db, { spaces: 2 });
    } catch (err) {
        console.error('Lỗi khi lưu database:', err);
    }
}

function getDB() {
    // Luôn tải lại database từ file mỗi khi cần
    loadDB();
    return db;
}

function getUser(id) {
    // Đảm bảo đối tượng database đã được tải
    if (!db || !db.users) {
        loadDB();
    }
    
    const defaultUser = {
        balance: 100000,
        lastDaily: 0,
        lastLoanDate: null,
        debt: 0,
        banner: "banner.png",
        badge: "thulinh.png",
        ownedBanners: ["banner.png"],
        ownedBadges: ["lehoinguyentieu.png"],
        city: { buildings: [], lastIncomeClaim: Date.now()},
        monsters: [],
        ownedEquipment: [],
        cards: [],
    };

    if (!db.users[id]) {
        db.users[id] = defaultUser;
    } else {
        db.users[id] = { ...defaultUser, ...db.users[id] };
    }
    saveDB();
    return db.users[id];
}

function getBalance(id) {
    return getUser(id).balance;
}

function addBalance(id, amount) {
    const user = getUser(id);
    user.balance += amount;
    saveDB();
    return user.balance;
}

function deductBalance(id, amount) {
    const user = getUser(id);
    if (user.balance < amount) return false;
    user.balance -= amount;
    saveDB();
    return true;
}

function setBalance(id, amount) {
    const user = getUser(id);
    user.balance = amount;
    saveDB();
    return user.balance;
}

function getLastDaily(id) {
    return getUser(id).lastDaily;
}

function setLastDaily(id, timestamp) {
    const user = getUser(id);
    user.lastDaily = timestamp;
    saveDB();
}

function getDebt(id) {
    return getUser(id).debt;
}

function setDebt(id, amount) {
    const user = getUser(id);
    user.debt = amount;
    saveDB();
}

function getLastLoanDate(id) {
    return getUser(id).lastLoanDate;
}

function setLastLoanDate(id, timestamp) {
    const user = getUser(id);
    user.lastLoanDate = timestamp;
    saveDB();
}

function getAllUsers() {
    return db.users;
}

function getAllBalances() {
    const users = getAllUsers();
    const balances = Object.entries(users).map(([id, data]) => ({ id, balance: data.balance }));
    return balances.sort((a, b) => b.balance - a.balance);
}

module.exports = {
    db,
    getDB,
    loadDB,
    saveDB,
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