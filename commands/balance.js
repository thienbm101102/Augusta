const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const path = require("path");
const fs = require("fs");
const db = require("../db"); // MongoDB helper
// 📌 Bổ sung thư viện GIF Encoder và Stream
const GIFEncoder = require("gif-encoder-2");
const { PassThrough } = require('stream');

// --- cấu hình đường dẫn tài nguyên ---
const FONT_FILE = "Roboto-Bold.ttf";
const FONT_FAMILY = "Roboto"; 

// --- đăng ký font --- (Giữ nguyên phần này)
try {
  const fontPath = path.join(__dirname, "../assets/fonts", FONT_FILE);
  if (fs.existsSync(fontPath)) {
    Canvas.registerFont(fontPath, { family: FONT_FAMILY });
    console.log(`✅ Loaded font: ${fontPath} as "${FONT_FAMILY}"`);
  } else {
    console.log(`⚠️ Font not found: ${fontPath} -> fallback to Sans`);
  }
} catch (e) {
  console.log("⚠️ Cannot register font -> fallback to Sans:", e.message);
}

// Hàm roundRect (Giữ nguyên phần này)
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

// Định nghĩa các Banner ảnh động (Tên file PNG tĩnh)
const ANIMATED_BANNERS = {
    // Tên banner: [Tên các frame PNG trong thư mục assets/banners]
    galaxy: [
        "home_1.jpg",
        "home_2.jpg",
        "home_3.jpg",
        "home_4.jpg",
    ],
    // Nếu bạn có banner động khác, thêm vào đây
};

// Hàm vẽ các thành phần tĩnh (Text, Avatar, Frame Avatar)
async function drawStaticElements(ctx, canvas, targetUser, userData, userBalance) {
    // 1. Vẽ nền tối
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.roundRect(20, 20, 660, 210, 25);
    ctx.fill();

    // 2. Vẽ Avatar
    const ax = 140;
    const ay = 125;
    const avatarR = 60;
    const avatar = await Canvas.loadImage(
      targetUser.displayAvatarURL({ extension: "png", size: 128 })
    );
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, avatarR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, ax - avatarR, ay - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();

    // 3. Vẽ Frame Avatar (Lấy frame tĩnh như cũ)
    let frameName = "bronze";
    if (userBalance >= 600000) frameName = "challenger";
    else if (userBalance >= 500000) frameName = "grandmaster";
    else if (userBalance >= 400000) frameName = "master";
    else if (userBalance >= 300000) frameName = "diamond";
    else if (userBalance >= 200000) frameName = "platinum";
    else if (userBalance >= 100000) frameName = "gold";
    else if (userBalance >= 50000) frameName = "silver";
    
    const frameFile = `${frameName}.png`; // Frame Avatar luôn là file tĩnh
    const framePath = path.join(__dirname, "../assets/frames", frameFile);
    
    const framePadding = 70;
    if (fs.existsSync(framePath)) {
      const frame = await Canvas.loadImage(framePath);
      const frameOffsetY = 105;
      ctx.drawImage(
        frame,
        ax - avatarR - framePadding,
        ay - avatarR - framePadding - frameOffsetY,
        avatarR * 2 + framePadding * 2,
        (avatarR * 2 + framePadding * 2) * (frame.height / frame.width)
      );
    }
    
    // 4. Vẽ Text và Thanh tiến trình (Giữ nguyên toàn bộ logic vẽ chữ/số)
    // --- Tên người dùng ---
    ctx.font = `bold 32px ${FONT_FAMILY}`;
    ctx.fillStyle = "#ffffff";
    const nameText = targetUser.displayName;
    const maxWidth = 260;
    let fontSize = 32;
    // ... (logic co chữ giữ nguyên)
    while (ctx.measureText(nameText).width > maxWidth && fontSize > 20) {
      fontSize--;
      ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    }
    ctx.fillText(nameText, 280, 70);
    
    // Badge (giữ nguyên)
    const badgeFile = userData.badge;
    if (badgeFile) {
      const badgePath = path.join(__dirname, "../assets/badges", badgeFile);
      if (fs.existsSync(badgePath)) {
        const badge = await Canvas.loadImage(badgePath);
        const nameMetrics = ctx.measureText(nameText);
        const badgeX = 280 + nameMetrics.width + 2;
        const badgeY = 75 - badge.height + 5;
        ctx.drawImage(badge, badgeX, badgeY, badge.width, badge.height);
      }
    }
    
    // ... (Toàn bộ logic vẽ số dư, coin, thanh progress) ...
    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.fillStyle = "#cccccc";
    ctx.fillText("Số dư của bạn:", 280, 110);

    const gradient = ctx.createLinearGradient(200, 0, 600, 0);
    gradient.addColorStop(0, "#FFD700");
    gradient.addColorStop(1, "#FFA500");
    ctx.fillStyle = gradient;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    ctx.font = `bold 30px ${FONT_FAMILY}`;
    ctx.fillText(`${userBalance.toLocaleString()}`, 280, 145);
    ctx.shadowBlur = 0;

    const coinIcon = await Canvas.loadImage(
      path.join(__dirname, "../assets/icons/diamond.png")
    );
    ctx.drawImage(
      coinIcon,
      230 + ctx.measureText(userBalance.toLocaleString()).width + 55,
      120,
      25,
      25
    );

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

    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(`Cấp ${level}`, 590, 185);

    ctx.font = `14px ${FONT_FAMILY}`;
    ctx.fillStyle = "#888888";
    ctx.fillText("© Design by neiht9073 / ✦ Đơn Giản Là Nơi Để Chơi ✦", 280, 215);
    // -------------------------------------------------------------------
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName("taisan")
    .setDescription("Xem số dư của bạn")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Người dùng muốn xem (bỏ trống để xem của bạn)")
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const targetUser =
      interaction.options.getMember("user") || interaction.member;

    const userData = await db.getUser(targetUser.id);
    const userBalance = userData?.balance ?? 0;

    const canvas = Canvas.createCanvas(700, 250);
    const ctx = canvas.getContext("2d");

    const bannerFile = userData.banner || "banner.png"; // banner mặc định
    const bannerName = bannerFile.split('.')[0]; // Lấy tên banner (ví dụ: 'galaxy' từ 'galaxy.png')
    
    // Kiểm tra xem banner hiện tại có trong danh sách banner động không
    const isAnimated = ANIMATED_BANNERS[bannerName] && ANIMATED_BANNERS[bannerName].length > 1;

    let attachment;

    if (isAnimated) {
        // --- XỬ LÝ ẢNH ĐỘNG (GIF) ---
        const gifFrames = ANIMATED_BANNERS[bannerName];
        const encoder = new GIFEncoder(canvas.width, canvas.height, 'octree', true);
        const stream = new PassThrough();
        
        encoder.setDelay(100); // 100ms giữa mỗi frame (10 FPS)
        encoder.setRepeat(0);  // Lặp vô hạn (0)
        encoder.start();
        
        for (const frameFile of gifFrames) {
            // 1. Vẽ Banner (frame động)
            const bannerLoadPath = path.join(__dirname, "../assets/banners", frameFile);
            if (fs.existsSync(bannerLoadPath)) {
                const banner = await Canvas.loadImage(bannerLoadPath);
                ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = "#1e1e2f";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // 2. Vẽ các thành phần tĩnh lên trên (Avatar, Frame, Text)
            await drawStaticElements(ctx, canvas, targetUser, userData, userBalance);
            
            encoder.addFrame(ctx);
        }
        
        encoder.finish();
        
        // Chuyển GIF sang Buffer để tạo Attachment
        encoder.out.pipe(stream);
        const buffer = await new Promise((resolve) => {
            const buffers = [];
            stream.on('data', (chunk) => buffers.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(buffers)));
        });
        
        attachment = new AttachmentBuilder(buffer, { name: "taisan.gif" });

    } else {
        // --- XỬ LÝ ẢNH TĨNH (PNG) ---
        // 1. Vẽ Banner (tĩnh)
        const bannerLoadPath = path.join(__dirname, "../assets/banners", bannerFile);
        if (fs.existsSync(bannerLoadPath)) {
            const banner = await Canvas.loadImage(bannerLoadPath);
            ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#1e1e2f";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // 2. Vẽ các thành phần tĩnh lên trên
        await drawStaticElements(ctx, canvas, targetUser, userData, userBalance);
        
        const buffer = canvas.toBuffer("image/png");
        attachment = new AttachmentBuilder(buffer, { name: "taisan.png" });
    }
    
    await interaction.editReply({ files: [attachment] });
  },
};
