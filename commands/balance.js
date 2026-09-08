const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const path = require("path");
const fs = require("fs");
const db = require("../db"); // MongoDB helper

// Import thêm thư viện xử lý GIF
const GIFEncoder = require('gifencoder');
const gifFrames = require('gif-frames');

// --- cấu hình đường dẫn tài nguyên ---
const FONT_FILE = "Roboto-Bold.ttf";
const FONT_FAMILY = "Roboto"; 

// --- đăng ký font ---
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
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Người dùng muốn xem (bỏ trống để xem của bạn)")
        .setRequired(false)
    ),
  async execute(interaction) {
    // 1. Chặn lỗi timeout 10062
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getMember("user") || interaction.member;
      const userData = (await db.getUser(targetUser.id)) || {};
      const userBalance = userData.balance || 0;

      const canvas = Canvas.createCanvas(700, 250);
      const ctx = canvas.getContext("2d");

      // Banner path
      const bannerFile = userData.banner || "banner.png"; // Nếu user có banner.gif thì đổi thành gif
      const bannerPath = path.join(__dirname, "../assets/banners", bannerFile);
      const isGif = bannerFile.toLowerCase().endsWith('.gif');

      // --- PRELOAD TÀI NGUYÊN TĨNH (Avatar, Khung, Badge, Icon) ---
      // Tải avatar
      const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 256 });
      const avatarImg = await Canvas.loadImage(avatarUrl);

      // Xác định Khung (Frame)
      let frameFile = "bronze.png";
      if (userBalance >= 600000) frameFile = "challenger.png";
      else if (userBalance >= 500000) frameFile = "grandmaster.png";
      else if (userBalance >= 400000) frameFile = "master.png";
      else if (userBalance >= 300000) frameFile = "diamond.png";
      else if (userBalance >= 200000) frameFile = "platinum.png";
      else if (userBalance >= 100000) frameFile = "gold.png";
      else if (userBalance >= 50000) frameFile = "silver.png";

      const framePath = path.join(__dirname, "../assets/frames", frameFile);
      const frameImg = fs.existsSync(framePath) ? await Canvas.loadImage(framePath) : null;

      // Xác định Badge
      const badgeFile = userData.badge;
      const badgePath = badgeFile ? path.join(__dirname, "../assets/badges", badgeFile) : null;
      const badgeImg = (badgePath && fs.existsSync(badgePath)) ? await Canvas.loadImage(badgePath) : null;

      // Xác định Icon Tiền
      const coinPath = path.join(__dirname, "../assets/icons/diamond.png");
      const coinImg = fs.existsSync(coinPath) ? await Canvas.loadImage(coinPath) : null;

      // --- HÀM VẼ OVERLAY (Dùng chung cho cả ảnh tĩnh và ảnh động) ---
      const drawOverlay = (context) => {
        // Vẽ box nền đen mờ
        context.fillStyle = "rgba(0,0,0,0.6)";
        context.roundRect(20, 20, 660, 210, 25);
        context.fill();

        const ax = 140;
        const ay = 125;
        const avatarR = 60;

        // Vẽ Avatar
        context.save();
        context.beginPath();
        context.arc(ax, ay, avatarR, 0, Math.PI * 2);
        context.closePath();
        context.clip();
        context.drawImage(avatarImg, ax - avatarR, ay - avatarR, avatarR * 2, avatarR * 2);
        context.restore();

        // Vẽ Khung (Frame)
        if (frameImg) {
          const framePadding = 100;
          const frameOffsetY = 95;
          context.drawImage(
            frameImg,
            ax - avatarR - framePadding,
            ay - avatarR - framePadding - frameOffsetY,
            avatarR * 2 + framePadding * 2,
            (avatarR * 2 + framePadding * 2) * (frameImg.height / frameImg.width)
          );
        }

        // Vẽ Tên người dùng
        context.font = `bold 32px ${FONT_FAMILY}`;
        context.fillStyle = "#ffffff";
        const nameText = targetUser.displayName;
        const maxWidth = 260;
        let fontSize = 32;
        while (context.measureText(nameText).width > maxWidth && fontSize > 20) {
          fontSize--;
          context.font = `bold ${fontSize}px ${FONT_FAMILY}`;
        }
        context.fillText(nameText, 280, 70);

        // Vẽ Badge
        if (badgeImg) {
          const nameMetrics = context.measureText(nameText);
          const badgeX = 280 + nameMetrics.width + 2;
          const badgeY = 75 - badgeImg.height + 5;
          context.drawImage(badgeImg, badgeX, badgeY, badgeImg.width, badgeImg.height);
        }

        // Chữ "Số dư của bạn"
        context.font = `20px ${FONT_FAMILY}`;
        context.fillStyle = "#cccccc";
        context.fillText("Số dư của bạn:", 280, 110);

        // Vẽ số dư (Text Gradient)
        const gradient = context.createLinearGradient(200, 0, 600, 0);
        gradient.addColorStop(0, "#FFD700");
        gradient.addColorStop(1, "#FFA500");
        context.fillStyle = gradient;
        context.lineWidth = 4;
        context.strokeStyle = "rgba(0,0,0,0.6)";
        context.shadowColor = "rgba(0,0,0,0.7)";
        context.shadowBlur = 8;
        context.font = `bold 30px ${FONT_FAMILY}`;
        context.fillText(`${userBalance.toLocaleString()}`, 280, 145);
        context.shadowBlur = 0;

        // Vẽ Icon Tiền
        if (coinImg) {
          context.drawImage(
            coinImg,
            230 + context.measureText(userBalance.toLocaleString()).width + 55,
            120,
            25,
            25
          );
        }

        // Chữ bản quyền
        context.font = `14px ${FONT_FAMILY}`;
        context.fillStyle = "#888888";
        context.fillText("© Copyright © 2025 / ✦ Đơn Giản Là Chơi ✦", 280, 215);
      };

      // --- XỬ LÝ ẢNH NỀN ---
      let attachment;

      if (isGif && fs.existsSync(bannerPath)) {
        // --- XỬ LÝ ẢNH ĐỘNG (GIF) ---
        const encoder = new GIFEncoder(canvas.width, canvas.height);
        encoder.start();
        encoder.setRepeat(0); // Lặp lại vô hạn
        encoder.setQuality(10); // Chất lượng ảnh (1-10, 1 là cao nhất nhưng xuất chậm)

        // Phân tách GIF nền thành từng frame
        const frames = await gifFrames({ url: bannerPath, frames: 'all', outputType: 'canvas' });

        for (const frame of frames) {
          // Lấy độ trễ của frame (gif-frames trả về đơn vị 1/100s -> nhân 10 để ra ms)
          const delay = frame.frameInfo.delay * 10 || 100; 
          encoder.setDelay(delay);

          // Xóa canvas cũ và vẽ frame nền mới
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(frame.getImage(), 0, 0, canvas.width, canvas.height);

          // Vẽ các thông tin (Avatar, Text, v.v.) đè lên frame nền
          drawOverlay(ctx);

          // Thêm frame đã hoàn thiện vào encoder
          encoder.addFrame(ctx);
        }

        encoder.finish();
        attachment = new AttachmentBuilder(encoder.out.getData(), { name: "taisan.gif" });

      } else {
        // --- XỬ LÝ ẢNH TĨNH (PNG/JPG) NHƯ CŨ ---
        if (fs.existsSync(bannerPath)) {
          const banner = await Canvas.loadImage(bannerPath);
          ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = "#1e1e2f";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        drawOverlay(ctx);
        attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "taisan.png" });
      }

      // Trả kết quả về cho người dùng
      await interaction.editReply({ files: [attachment] });

    } catch (error) {
      console.error("❌ Lỗi khi tạo ảnh tài sản:", error);
      await interaction.editReply({ 
        content: "❌ Đã có lỗi xảy ra khi tải ảnh tài sản của bạn. Vui lòng kiểm tra lại tài nguyên hoặc thử lại sau!" 
      });
    }
  },
};
