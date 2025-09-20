const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const path = require("path");
const fs = require("fs");

// --- cấu hình đường dẫn tài nguyên ---
const FONT_FILE = "Roboto-Bold.ttf";     // đổi tên nếu bạn dùng font khác
const FONT_FAMILY = "RobotoBold";       // tên alias sẽ dùng trong ctx.font

// --- đăng ký font (an toàn, có fallback) ---
try {
  const fontPath = path.join(__dirname, "../assets/fonts", FONT_FILE);
  if (fs.existsSync(fontPath)) {
    Canvas.registerFont(fontPath, { family: FONT_FAMILY });
    console.log(`✅ Loaded font: ${fontPath}`);
  } else {
    console.log(`⚠️ Font not found: ${fontPath} -> fallback to Sans`);
  }
} catch (e) {
  console.log("⚠️ Cannot register font -> fallback to Sans:", e.message);
}

// --- helper getBalance ---
let getBalanceFromDb;
try {
  const db = require("../db");
  getBalanceFromDb = (id) => {
    if (typeof db.getBalance === "function") return db.getBalance(id);
    if (db.users) return db.users[id]?.balance ?? 0;
    return 0;
  };
} catch {
  getBalanceFromDb = () => 0;
}

// Hàm roundRect
const { CanvasRenderingContext2D } = require("canvas");
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("taisan")
    .setDescription("Xem số dư của bạn")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Người dùng muốn xem (bỏ trống để xem của bạn)")
        .setRequired(false)
    ),
  async execute(interaction, db) {
    const targetUser = interaction.options.getMember("user") || interaction.member;
    /*const targetUser = interaction.options.getUser("user") || interaction.user;*/
    const userId = interaction.user.id;
    const userBalance = getBalanceFromDb(targetUser.id);
    await interaction.deferReply(); // báo với Discord là bot đang xử lý

    // Tạo canvas
    const canvas = Canvas.createCanvas(700, 250);
    const ctx = canvas.getContext("2d");

    // Đường dẫn tới db.json
    const dbPath = path.join(__dirname, "../db.json");
    if (fs.existsSync(dbPath)) {
      db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    }
    
    // Lấy thông tin người dùng từ dữ liệu mới nhất
    const userData = db.users?.[targetUser.id] || {};
    const bannerFile = userData.banner || "banner.png"; // default nếu chưa chọn
    const bannerPath = path.join(__dirname, "../assets/banners", bannerFile);

    // Vẽ banner nền
    if (fs.existsSync(bannerPath)) {
      const banner = await Canvas.loadImage(bannerPath);
      ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
    } else {
      // fallback nền tối nếu không tìm thấy banner
      ctx.fillStyle = "#1e1e2f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Vẽ khung hồ sơ bo góc
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.roundRect(20, 20, 660, 210, 25);
    ctx.fill();
    
    let frameFile = "bronze.png";
if (userBalance >= 600000) frameFile = "challenger.png";
else if (userBalance >= 500000) frameFile = "grandmaster.png";
else if (userBalance >= 400000) frameFile = "master.png";
else if (userBalance >= 300000) frameFile = "diamond.png";
else if (userBalance >= 200000) frameFile = "platinum.png";
else if (userBalance >= 100000) frameFile = "gold.png";
else if (userBalance >= 50000) frameFile = "silver.png";
// dưới 50000 thì mặc định bronze

// ===== Khai báo tọa độ và bán kính avatar =====
const ax = 140;  // X của tâm avatar
const ay = 125;  // Y của tâm avatar
const avatarR = 60;    // bán kính avatar

    // Avatar
const avatar = await Canvas.loadImage(
  targetUser.displayAvatarURL({ extension: "png", size: 256 })
);
ctx.save();
ctx.beginPath();
ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
ctx.closePath();
ctx.clip();
ctx.drawImage(avatar, ax - avatarR, ay - avatarR, avatarR*2, avatarR*2);
ctx.restore();

// Khung PNG
const framePadding = 110; // tăng padding khung to hơn
const framePath = path.join(__dirname, "../assets/frames", frameFile);
if (fs.existsSync(framePath)) {
  const frame = await Canvas.loadImage(framePath);
  const frameOffsetY = 80; // số pixel muốn đẩy khung lên
ctx.drawImage(frame,
  ax - avatarR - framePadding,
  ay - avatarR - framePadding - frameOffsetY, // trừ offsetY
  (avatarR*2) + framePadding*2,
  (avatarR*2) + framePadding*2 * (frame.height / frame.width)
);
} 

    // Tên người dùng
    ctx.font = `32px ${FONT_FAMILY}, Sans`;
    ctx.fillStyle = "#ffffff";
    const nameText = targetUser.displayName; // Khai báo biến ở đây để có thể sử dụng ở các phần sau
    const maxWidth = 260; // Chiều rộng tối đa cho phép của tên
    let fontSize = 32;

    // Giảm cỡ chữ nếu tên quá dài
    while (ctx.measureText(nameText).width > maxWidth && fontSize > 20) {
      fontSize--;
      ctx.font = `${fontSize}px ${FONT_FAMILY}, Sans`;
    }

    ctx.fillText(nameText, 280, 70)

    // Vẽ huy hiệu
    const badgeFile = userData.badge; // Lấy tên file huy hiệu từ database
    if (badgeFile) { // Kiểm tra xem người dùng có huy hiệu không
      const badgePath = path.join(__dirname, "../assets/badges", badgeFile);
      if (fs.existsSync(badgePath)) {
        const badge = await Canvas.loadImage(badgePath);
        // Tên của người dùng
        const nameText = targetUser.displayName;
        const nameMetrics = ctx.measureText(nameText);
        // Tính toán vị trí X và Y của huy hiệu, đặt nó bên cạnh tên
        const badgeX = 280 + nameMetrics.width + 2; // 10 là khoảng cách giữa tên và huy hiệu
        const badgeY = 75 - badge.height + 5; // Căn chỉnh theo chiều cao của chữ và ảnh
        ctx.drawImage(badge, badgeX, badgeY, badge.width, badge.height);
      }
    }

    // Text phụ: nhãn
    ctx.font = `20px ${FONT_FAMILY}, Sans`;
    ctx.fillStyle = "#cccccc";
    ctx.fillText("Số dư của bạn:", 280, 110);

    // Gradient text cho balance
    const gradient = ctx.createLinearGradient(200, 0, 600, 0);
    gradient.addColorStop(0, "#FFD700"); // vàng
    gradient.addColorStop(1, "#FFA500"); // cam
    ctx.fillStyle = gradient;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    ctx.font = `30px ${FONT_FAMILY}, Sans`;
    ctx.fillText(`${userBalance.toLocaleString()}`, 280, 145);
    ctx.shadowBlur = 0; // reset

    // Load và vẽ icon
    const coinIcon = await Canvas.loadImage(path.join(__dirname, "../assets/icons/diamond.png"));
    ctx.drawImage(coinIcon, 230 + ctx.measureText(userBalance.toLocaleString()).width + 55, 120, 25, 25);

    // === Progress bar (ví dụ level dựa trên balance) ===
    const level = Math.floor(userBalance / 100000); 
    const progress = (userBalance % 100000) / 100000;

    ctx.fillStyle = "#333";
    ctx.roundRect(280, 165, 300, 25, 12);
    ctx.fill();

    const gradBar = ctx.createLinearGradient(250, 0, 590, 0);
    gradBar.addColorStop(0, "#BCE6FF");
    gradBar.addColorStop(1, "#53A6D8");
    ctx.fillStyle = gradBar;
    ctx.roundRect(280, 165, 300 * progress, 25, 12);
    ctx.fill();

    ctx.font = `16px ${FONT_FAMILY}, Sans`;
    ctx.fillStyle = "#fff";
    ctx.fillText(`Cấp ${level}`, 590, 185);

    // Thêm credit của bot
    ctx.font = `14px ${FONT_FAMILY}, Sans`;
    ctx.fillStyle = "#888888"; // Màu chữ xám
    ctx.fillText("©Copyright ©2025「✦ Áp Lực Chơi Game ✦」", 280, 215);

    // Xuất ảnh
    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "taisan.png",
    });
    
    await interaction.editReply({ files: [attachment] });
  },
};
