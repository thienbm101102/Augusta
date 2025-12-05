const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas");
const path = require("path");
const fs = require("fs");
const db = require("../db"); // MongoDB helper

// --- cấu hình đường dẫn tài nguyên ---
const FONT_FILE = "Roboto-Bold.ttf";
const FONT_FAMILY = "Roboto"; // <-- Đúng family name (Roboto)

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

    const targetUser =
      interaction.options.getMember("user") || interaction.member;

    const userData = await db.getUser(targetUser.id);
    const userBalance = userData?.balance ?? 0;

    const canvas = Canvas.createCanvas(700, 250);
    const ctx = canvas.getContext("2d");

    const bannerFile = userData.banner || "banner.png";
    const bannerPath = path.join(__dirname, "../assets/banners", bannerFile);

    if (fs.existsSync(bannerPath)) {
      const banner = await Canvas.loadImage(bannerPath);
      ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#1e1e2f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

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

    const framePadding = 100;
    const framePath = path.join(__dirname, "../assets/frames", frameFile);
    if (fs.existsSync(framePath)) {
      const frame = await Canvas.loadImage(framePath);
      const frameOffsetY = 95;
      ctx.drawImage(
        frame,
        ax - avatarR - framePadding,
        ay - avatarR - framePadding - frameOffsetY,
        avatarR * 2 + framePadding * 2,
        (avatarR * 2 + framePadding * 2) * (frame.height / frame.width)
      );
    }

    // --- Tên người dùng ---
    ctx.font = `bold 32px ${FONT_FAMILY}`;
    ctx.fillStyle = "#ffffff";
    const nameText = targetUser.displayName;
    const maxWidth = 260;
    let fontSize = 32;
    while (ctx.measureText(nameText).width > maxWidth && fontSize > 20) {
      fontSize--;
      ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    }
    ctx.fillText(nameText, 280, 70);

    // Badge
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

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "taisan.png",
    });

    await interaction.editReply({ files: [attachment] });
  },
};
