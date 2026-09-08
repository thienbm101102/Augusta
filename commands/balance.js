const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const path = require("path");
const fs = require("fs");
const db = require("../db"); // MongoDB helper

const GIFEncoder = require('gifencoder');
// Sử dụng omggif để giải mã GIF an toàn 100% trên Node.js (không dính lỗi document)
const { GifReader } = require('omggif');

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
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getMember("user") || interaction.member;
      const userData = (await db.getUser(targetUser.id)) || {};
      const userBalance = userData.balance || 0;

      const canvas = Canvas.createCanvas(700, 250);
      const ctx = canvas.getContext("2d");

      const bannerFile = userData.banner || "banner.png"; 
      const bannerPath = path.join(__dirname, "../assets/banners", bannerFile);
      const isGif = bannerFile.toLowerCase().endsWith('.gif');

      // --- PRELOAD TÀI NGUYÊN TĨNH ---
      const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 256 });
      const avatarImg = await Canvas.loadImage(avatarUrl);

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

      const badgeFile = userData.badge;
      const badgePath = badgeFile ? path.join(__dirname, "../assets/badges", badgeFile) : null;
      const badgeImg = (badgePath && fs.existsSync(badgePath)) ? await Canvas.loadImage(badgePath) : null;

      const coinPath = path.join(__dirname, "../assets/icons/diamond.png");
      const coinImg = fs.existsSync(coinPath) ? await Canvas.loadImage(coinPath) : null;

      const drawOverlay = (context) => {
        context.fillStyle = "rgba(0,0,0,0.6)";
        context.roundRect(20, 20, 660, 210, 25);
        context.fill();

        const ax = 140;
        const ay = 125;
        const avatarR = 60;

        context.save();
        context.beginPath();
        context.arc(ax, ay, avatarR, 0, Math.PI * 2);
        context.closePath();
        context.clip();
        context.drawImage(avatarImg, ax - avatarR, ay - avatarR, avatarR * 2, avatarR * 2);
        context.restore();

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

        if (badgeImg) {
          const nameMetrics = context.measureText(nameText);
          const badgeX = 280 + nameMetrics.width + 2;
          const badgeY = 75 - badgeImg.height + 5;
          context.drawImage(badgeImg, badgeX, badgeY, badgeImg.width, badgeImg.height);
        }

        context.font = `20px ${FONT_FAMILY}`;
        context.fillStyle = "#cccccc";
        context.fillText("Số dư của bạn:", 280, 110);

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

        if (coinImg) {
          context.drawImage(
            coinImg,
            230 + context.measureText(userBalance.toLocaleString()).width + 55,
            120,
            25,
            25
          );
        }

        context.font = `14px ${FONT_FAMILY}`;
        context.fillStyle = "#888888";
        context.fillText("© Copyright © 2025 / ✦ Đơn Giản Là Chơi ✦", 280, 215);
      };

      let attachment;

      if (isGif && fs.existsSync(bannerPath)) {
        // Đọc file GIF bằng omggif để giải mã từng frame thuần túy NodeJS
        const gifBuffer = fs.readFileSync(bannerPath);
        const reader = new GifReader(gifBuffer);

        const encoder = new GIFEncoder(canvas.width, canvas.height);
        encoder.start();
        encoder.setRepeat(0);
        encoder.setQuality(15);

        // Tạo một canvas tạm để vẽ các frame GIF gốc
        const tempCanvas = Canvas.createCanvas(reader.width, reader.height);
        const tempCtx = tempCanvas.getContext('2d');
        const frameData = tempCtx.createImageData(reader.width, reader.height);

        for (let i = 0; i < reader.numFrames(); i++) {
          const info = reader.frameInfo(i);
          const delay = info.delay * 10 || 100;
          encoder.setDelay(delay);

          // Giải mã pixel của frame GIF vào mảng
          reader.decodeAndBlitFrameRGBA(i, frameData.data);
          tempCtx.putImageData(frameData, 0, 0);

          // Xóa canvas chính và vẽ nền GIF lên, sau đó đè thông tin lên trên
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

          drawOverlay(ctx);
          encoder.addFrame(ctx);
        }

        encoder.finish();
        attachment = new AttachmentBuilder(encoder.out.getData(), { name: "taisan.gif" });

      } else {
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

      await interaction.editReply({ files: [attachment] });

    } catch (error) {
      console.error("❌ Lỗi khi tạo ảnh tài sản:", error);
      await interaction.editReply({ 
        content: "❌ Đã có lỗi xảy ra khi tải ảnh tài sản của bạn. Vui lòng kiểm tra lại tài nguyên hoặc thử lại sau!" 
      });
    }
  },
};
