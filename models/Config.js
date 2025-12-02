const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    _id: { type: String, default: 'config' },
    
    // Config Confession
    reviewChannel: { type: String }, 
    publicChannel: { type: String },
    
    // 📌 ĐÃ SỬA: CHỈ CẦN KÊNH TEXT (ttsVoiceChannel ĐÃ BỎ)
    ttsTextChannel: { type: String } 
});

module.exports = mongoose.model('Config', configSchema);
