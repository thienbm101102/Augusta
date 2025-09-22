// File: blackjack.js

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, deductBalance, addBalance, BlackjackGame } = require('../db');

// Các hàm phụ trợ
function drawCard() {
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  return { rank: ranks[Math.floor(Math.random() * ranks.length)], suit: suits[Math.floor(Math.random() * suits.length)] };
}

function getValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return card.rank;
}

function calcHand(hand) {
  let total = hand.reduce((s, c) => s + getValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xizach')
    .setDescription('Bắt đầu chơi Xì Zách')
    .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true).setMinValue(1000).setMaxValue(500000)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const bet = interaction.options.getInteger('bet');
    const userId = interaction.user.id;

    const user = await getUser(userId);
    if (!user || user.balance < bet) {
      await interaction.editReply({ content: 'Số dư của bạn không đủ để đặt cược số tiền này.' });
      return;
    }

    const existingGame = await BlackjackGame.findOne({ channelId: interaction.channelId, userId });
    if (existingGame) {
      await interaction.editReply('Bạn đã có một ván Xì Zách đang diễn ra trên kênh này rồi!');
      return;
    }

    await deductBalance(userId, bet);

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];
    const playerValue = calcHand(playerHand);
    const dealerValue = calcHand(dealerHand);

    const newGame = new BlackjackGame({
      channelId: interaction.channelId,
      userId,
      bet,
      dealerHand,
      playerHand,
    });
    await newGame.save();

    const embed = new EmbedBuilder()
      .setTitle('Blackjack')
      .setDescription(`Bạn đã cược **${bet.toLocaleString()}**<a:diamondgem:1402590496647413811> và bắt đầu một ván Xì Zách!`)
      .addFields(
        { name: `Bài của bạn: (${playerValue})`, value: playerHand.map(c => `\`${c.rank}${c.suit}\``).join(' ') },
        { name: `Bài của BOT: (${getValue(dealerHand[0])})`, value: `\`${dealerHand[0].rank}${dealerHand[0].suit}\` \`❓\`` }
      )
      .setColor('#0099ff');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
        .setCustomId('xizach_hit')
        .setLabel('Rút bài')
        .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
        .setCustomId('xizach_stand')
        .setLabel('Dừng')
        .setStyle(ButtonStyle.Danger),
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    const userId = interaction.user.id;
    const game = await BlackjackGame.findOne({ channelId: interaction.channelId, userId });

    if (!game) {
      await interaction.reply({ content: 'Bạn không có game nào đang diễn ra trên kênh này!', flags: 64 });
      return;
    }

    await interaction.deferUpdate();

    let result;
    let ended = false;
    let newBalance;

    if (interaction.customId === 'xizach_hit') {
      game.playerHand.push(drawCard());
      const playerVal = calcHand(game.playerHand);
      if (playerVal > 21) {
        result = `<a:AbbyCry:1393909295665643540> Bạn đã quá điểm (${playerVal}) và thua! Mất **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
        ended = true;
      }
    } else if (interaction.customId === 'xizach_stand') {
      let dealerVal = calcHand(game.dealerHand);
      while (dealerVal < 17) {
        game.dealerHand.push(drawCard());
        dealerVal = calcHand(game.dealerHand);
      }
      const playerVal = calcHand(game.playerHand);

      if (dealerVal > 21 || playerVal > dealerVal) {
        await addBalance(userId, game.bet * 2);
        const user = await getUser(userId);
        newBalance = user.balance;
        result = `<a:AbbyWOW:1393909383884439602> Bạn đã thắng! Nhận được **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
      } else if (playerVal === dealerVal) {
        await addBalance(userId, game.bet);
        const user = await getUser(userId);
        newBalance = user.balance;
        result = `<a:AbbyFlower:1393909312761364541> Hòa, bạn được hoàn lại **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
      } else {
        result = `<a:AbbyCry:1393909295665643540> BOT đã thắng! Bạn bị mất **${game.bet.toLocaleString()}**<a:diamondgem:1402590496647413811>`;
      }
      ended = true;
    }

    if (ended) {
      await BlackjackGame.deleteOne({ channelId: interaction.channelId, userId });

      const playerVal = calcHand(game.playerHand);
      const dealerVal = calcHand(game.dealerHand);

      const embed = new EmbedBuilder()
        .setTitle('Blackjack - Kết thúc')
        .setDescription(result)
        .addFields(
          { name: `Bài của bạn: (${playerVal})`, value: game.playerHand.map(c => `\`${c.rank}${c.suit}\``).join(' ') },
          { name: `Bài của BOT: (${dealerVal})`, value: game.dealerHand.map(c => `\`${c.rank}${c.suit}\``).join(' ') }
        )
        .setColor(result.includes('thắng') ? '#00ff00' : result.includes('Hòa') ? '#ffff00' : '#ff0000');

      if (newBalance) {
        embed.setFooter({ text: `Số dư mới: ${newBalance.toLocaleString()}` });
      }

      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await game.save();

      const playerVal = calcHand(game.playerHand);
      const embed = new EmbedBuilder()
        .setTitle('Blackjack')
        .setDescription(`Bạn đã rút bài!`)
        .addFields(
          { name: `Bài của bạn: (${playerVal})`, value: game.playerHand.map(c => `\`${c.rank}${c.suit}\``).join(' ') },
          { name: `Bài của BOT: (${getValue(game.dealerHand[0])})`, value: `\`${game.dealerHand[0].rank}${game.dealerHand[0].suit}\` \`❓\`` }
        )
        .setColor('#0099ff');

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
          .setCustomId('xizach_hit')
          .setLabel('Rút bài')
          .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
          .setCustomId('xizach_stand')
          .setLabel('Dừng')
          .setStyle(ButtonStyle.Danger),
        );

      await interaction.editReply({ embeds: [embed], components: [row] });
    }
  },
};
