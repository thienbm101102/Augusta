const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, addBalance, deductBalance, getBalance } = require('../db');

// This is a temporary in-memory store for active games.
// For a production-ready application, you would need to store this data
// in a persistent database or a dedicated game state management service.
const activeGames = {};

function drawCard() {
  const ranks = [2,3,4,5,6,7,8,9,10,'J','Q','K','A'];
  const suits = ['♠️','♥️','♦️','♣️'];
  return { rank: ranks[Math.floor(Math.random()*ranks.length)], suit: suits[Math.floor(Math.random()*suits.length)] };
}

function getValue(card) {
  if (['J','Q','K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return card.rank;
}

function calcHand(hand) {
  let total = hand.reduce((s,c)=>s+getValue(c),0);
  let aces = hand.filter(c=>c.rank==='A').length;
  while (total>21 && aces>0) { total-=10; aces--; }
  
  // Kiểm tra Ngũ Linh
  if (hand.length === 5 && total <= 21) {
      return 22; // Trả về 22 để biểu thị Ngũ Linh
  }

  return total;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xizach')
    .setDescription('Bắt đầu chơi Xì Zách')
    .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true).setMinValue(1000).setMaxValue(50000)),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const userBalance = await getBalance(interaction.user.id);
    
    if (bet <= 0 || bet > userBalance) {
      return interaction.reply('<a:AbbyCheers:1393909248076943380> Số <a:diamondgem:1402590496647413811> cược không hợp lệ hoặc không đủ, vui lòng kiếm thêm tiền!');
    }

    // Deduct balance and setup game
    const deductionSuccess = await deductBalance(interaction.user.id, bet);
    if (!deductionSuccess) {
        return interaction.reply('❌ Không thể trừ tiền của bạn. Vui lòng thử lại sau.');
    }

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard()];
    activeGames[interaction.user.id] = { bet, playerHand, dealerHand };

    const embed = new EmbedBuilder()
      .setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`)
      .setDescription(
        `* **Bài Của Bạn:** ${playerHand.map(c=>c.rank+c.suit).join(' ')} (**Tổng:** ${calcHand(playerHand) > 21 ? 'QUẮC' : calcHand(playerHand)})\n` +
        `* **Bài Của BOT:** ${dealerHand[0].rank+dealerHand[0].suit} ???`
      )
      .setColor('Blue');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('xizach_hit').setLabel('Rút 🃏').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('xizach_stand').setLabel('Dằn ✋').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    const game = activeGames[interaction.user.id];
    if (!game) return interaction.reply({ content: '<a:AbbyShocked:1393909368138895411> Bạn chưa bắt đầu ván bài nào!', ephemeral: true });

    const { playerHand, dealerHand, bet } = game;
    
    if (interaction.customId === 'xizach_hit') {
      game.playerHand.push(drawCard());
      const val = calcHand(game.playerHand);

      // Kiểm tra Ngũ Linh sau khi rút
      if (game.playerHand.length === 5 && val <= 21) {
        await addBalance(interaction.user.id, game.bet * 2.5); // Thắng 2.5 lần tiền cược
        delete activeGames[interaction.user.id];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')} (${val})\n\n<a:AbbyWOW:1393909383884439602> Bạn đã thắng **NGŨ LINH**! Nhận được **${game.bet * 1.5}**<a:diamondgem:1402590496647413811>`).setColor('Gold')],
          components: []
        });
      }

      if (val > 21) {
        delete activeGames[interaction.user.id];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')}  (${val})\n\n<a:AbbyCry:1393909295665643540> Bạn đã thua ${game.bet}<a:diamondgem:1402590496647413811> do **QUẮC**`).setColor('Red')],
          components: []
        });
      }

      return interaction.update({
        embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')} (${val})\n* **Bài Của BOT:** ${game.dealerHand[0].rank+game.dealerHand[0].suit} ???`).setColor('Green')],
        components: interaction.message.components
      });
    }

    if (interaction.customId === 'xizach_stand') {
      let dealerVal = calcHand(game.dealerHand);
      while (dealerVal < 17 && dealerVal !== 22) { // Ngừng rút khi Ngũ Linh
        game.dealerHand.push(drawCard());
        dealerVal = calcHand(game.dealerHand);
      }
      const playerVal = calcHand(game.playerHand);

      let result;
      let winAmount = 0;

      // Kiểm tra Ngũ Linh trước
      const playerHasQuintuple = playerVal === 22;
      const dealerHasQuintuple = dealerVal === 22;

      if (playerHasQuintuple && !dealerHasQuintuple) {
        winAmount = game.bet * 1.5;
        await addBalance(interaction.user.id, game.bet + winAmount);
        result = `<a:AbbyWOW:1393909383884439602> Bạn đã thắng **NGŨ LINH**! Nhận được **${winAmount}**<a:diamondgem:1402590496647413811>`;
      } else if (dealerHasQuintuple && !playerHasQuintuple) {
        result = `<a:AbbyCry:1393909295665643540> BOT đã thắng **NGŨ LINH**! Bạn bị mất **${game.bet}**<a:diamondgem:1402590496647413811>`;
      } else if (playerHasQuintuple && dealerHasQuintuple) {
          // Cả hai cùng Ngũ Linh, người chơi thắng
          winAmount = game.bet * 1.5;
          await addBalance(interaction.user.id, game.bet + winAmount);
          result = `<a:AbbyWOW:1393909383884439602> Cả hai cùng **NGŨ LINH**! Bạn thắng và nhận được **${winAmount}**<a:diamondgem:1402590496647413811>`;
      }
      else if (dealerVal > 21 || playerVal > dealerVal) {
        await addBalance(interaction.user.id, game.bet * 2);
        result = `<a:AbbyWOW:1393909383884439602> Bạn đã thắng! Nhận được **${game.bet}**<a:diamondgem:1402590496647413811>`;
      } else if (playerVal === dealerVal) {
        await addBalance(interaction.user.id, game.bet);
        result = `<a:AbbyFlower:1393909312761364541> Hòa, bạn được hoàn lại **${game.bet}**<a:diamondgem:1402590496647413811>`;
      } else {
        result = `<a:AbbyCry:1393909295665643540> BOT đã thắng! Bạn bị mất **${game.bet}**<a:diamondgem:1402590496647413811>`;
      }

      delete activeGames[interaction.user.id];

      return interaction.update({
        embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')} (${playerVal === 22 ? 'NGŨ LINH' : playerVal})\n* **Bài Của BOT:** ${game.dealerHand.map(c=>c.rank+c.suit).join(' ')} (${dealerVal === 22 ? 'NGŨ LINH' : dealerVal})\n\n${result}`).setColor('Blue')],
        components: []
      });
    }
  }
};
