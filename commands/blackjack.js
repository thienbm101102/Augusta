const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, addBalance, deductBalance, getBalance } = require('../db');

// This is a temporary in-memory store for active games.
const activeGames = {};

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
  while (total > 21 && aces > 0) { total -= 10; aces--; }
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
        `* **Bài Của Bạn:** ${playerHand.map(c => c.rank + c.suit).join(' ')} (**Tổng:** ${calcHand(playerHand)})\n` +
        `* **Bài Của BOT:** ${dealerHand[0].rank + dealerHand[0].suit} ???`
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
      const playerVal = calcHand(game.playerHand);
      
      const isPlayerTwoAces = game.playerHand.length === 2 && game.playerHand.every(card => card.rank === 'A');
      const isPlayerXidach = game.playerHand.length === 2 && playerVal === 21;
      const isPlayerNguLinh = game.playerHand.length === 5 && playerVal <= 21;
      
      if (playerVal > 21) {
        delete activeGames[interaction.user.id];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c => c.rank + c.suit).join(' ')}  (${playerVal})\n\n<a:AbbyCry:1393909295665643540> Bạn đã thua ${bet}<a:diamondgem:1402590496647413811> do **QUẮC**`).setColor('Red')],
          components: []
        });
      }

      if (isPlayerTwoAces) {
        await addBalance(interaction.user.id, bet * 2);
        delete activeGames[interaction.user.id];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c => c.rank + c.suit).join(' ')} (2 Át)\n\n<a:AbbyWOW:1393909383884439602> Bạn đã thắng **XÌ BÀN**! Nhận được **${bet}**<a:diamondgem:1402590496647413811>`).setColor('Gold')],
          components: []
        });
      } else if (isPlayerXidach) {
        await addBalance(interaction.user.id, bet * 2);
        delete activeGames[interaction.user.id];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c => c.rank + c.suit).join(' ')} (${playerVal})\n\n<a:AbbyWOW:1393909383884439602> Bạn đã thắng **XÌ DÁCH**! Nhận được **${bet}**<a:diamondgem:1402590496647413811>`).setColor('Gold')],
          components: []
        });
      } else if (isPlayerNguLinh) {
        await addBalance(interaction.user.id, bet * 2);
        delete activeGames[interaction.user.id];
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c => c.rank + c.suit).join(' ')} (${playerVal})\n\n<a:AbbyWOW:1393909383884439602> Bạn đã thắng **NGŨ LINH**! Nhận được **${bet}**<a:diamondgem:1402590496647413811>`).setColor('Gold')],
          components: []
        });
      }
      
      return interaction.update({
        embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c => c.rank + c.suit).join(' ')} (${playerVal})\n* **Bài Của BOT:** ${game.dealerHand[0].rank + game.dealerHand[0].suit} ???`).setColor('Green')],
        components: interaction.message.components
      });
    }

    if (interaction.customId === 'xizach_stand') {
      const playerVal = calcHand(game.playerHand);
      
      let dealerVal = calcHand(game.dealerHand);
      while (dealerVal < 17) {
        game.dealerHand.push(drawCard());
        dealerVal = calcHand(game.dealerHand);
      }

      let result;
      let isWin = false;
      let isDraw = false;

      const isPlayerTwoAces = playerHand.length === 2 && playerHand.every(card => card.rank === 'A');
      const isPlayerXidach = playerHand.length === 2 && playerVal === 21;
      const isPlayerNguLinh = playerHand.length === 5 && playerVal <= 21;

      const isDealerTwoAces = dealerHand.length === 2 && dealerHand.every(card => card.rank === 'A');
      const isDealerXidach = dealerHand.length === 2 && dealerVal === 21;
      const isDealerNguLinh = dealerHand.length === 5 && dealerVal <= 21;

      // Ưu tiên 2 Át
      if (isPlayerTwoAces && isDealerTwoAces) {
        isDraw = true;
      } else if (isPlayerTwoAces) {
        isWin = true;
      } else if (isDealerTwoAces) {
        isWin = false;
      // Tiếp theo là Xì Dách
      } else if (isPlayerXidach && isDealerXidach) {
        isDraw = true;
      } else if (isPlayerXidach) {
        isWin = true;
      } else if (isDealerXidach) {
        isWin = false;
      // Tiếp theo là Ngũ Linh
      } else if (isPlayerNguLinh && isDealerNguLinh) {
        isDraw = true;
      } else if (isPlayerNguLinh) {
        isWin = true;
      } else if (isDealerNguLinh) {
        isWin = false;
      // Cuối cùng là so điểm thông thường
      } else if (dealerVal > 21 || playerVal > dealerVal) {
        isWin = true;
      } else if (playerVal === dealerVal) {
        isDraw = true;
      } else {
        isWin = false;
      }
      
      // Cập nhật kết quả và tiền
      if (isDraw) {
        await addBalance(interaction.user.id, bet);
        result = `<a:AbbyFlower:1393909312761364541> Hòa, bạn được hoàn lại **${bet}**<a:diamondgem:1402590496647413811>`;
      } else if (isWin) {
        await addBalance(interaction.user.id, bet * 2);
        result = `<a:AbbyWOW:1393909383884439602> Bạn đã thắng! Nhận được **${bet}**<a:diamondgem:1402590496647413811>`;
      } else {
        result = `<a:AbbyCry:1393909295665643540> BOT đã thắng! Bạn bị mất **${bet}**<a:diamondgem:1402590496647413811>`;
      }

      delete activeGames[interaction.user.id];
      
      const finalColor = isWin ? 'Green' : 'Red';
      if (isDraw) finalColor = 'Blue';

      return interaction.update({
        embeds: [new EmbedBuilder()
          .setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`)
          .setDescription(
            `* **Bài Của Bạn:** ${game.playerHand.map(c => c.rank + c.suit).join(' ')} (${playerVal})\n` +
            `* **Bài Của BOT:** ${game.dealerHand.map(c => c.rank + c.suit).join(' ')} (${dealerVal})\n\n${result}`
          )
          .setColor(finalColor)],
        components: []
      });
    }
  }
};
