// models/Config.js (Tạo file này)

const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    // Sử dụng _id cố định để chỉ có 1 tài liệu cấu hình (luôn là 'config')
    _id: { type: String, default: 'config' },
    // ID kênh duyệt
    reviewChannel: { type: String, required: true }, 
    // ID kênh công khai
    publicChannel: { type: String, required: true }
});

module.exports = mongoose.model('Config', configSchema);