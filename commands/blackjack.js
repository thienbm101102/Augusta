const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, saveDB, getUser, addBalance, getBalance, setBalance } = require('../db');

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
  return total;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xizach')
    .setDescription('Bắt đầu chơi Xì Zách')
    .addIntegerOption(opt => opt.setName('bet').setDescription('Số tiền cược').setRequired(true).setMinValue(1000).setMaxValue(50000)),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const user = getUser(interaction.user.id);
    if (bet <= 0 || bet > user.balance) {
      return interaction.reply('<a:AbbyCheers:1393909248076943380> Số <a:diamondgem:1402590496647413811> cược không hợp lệ hoặc không đủ, vui lòng kiếm thêm tiền!');
    }

    // setup game
    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard()];
    db.games[interaction.user.id] = { bet, playerHand, dealerHand };
    user.balance -= bet;
    saveDB();

    const embed = new EmbedBuilder()
      .setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`)
      .setDescription(
        `* **Bài Của Bạn:** ${playerHand.map(c=>c.rank+c.suit).join(' ')} (**Tổng:** ${calcHand(playerHand)})\n` +
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
    const game = db.games[interaction.user.id];
    if (!game) return interaction.reply({ content: '<a:AbbyShocked:1393909368138895411> Bạn chưa bắt đầu ván bài nào!', ephemeral: true });

    const { playerHand, dealerHand, bet } = game;
    
    // Sửa lỗi: Cần so sánh với customId mới
    if (interaction.customId === 'xizach_hit') {
      game.playerHand.push(drawCard());
      const val = calcHand(game.playerHand);
      if (val > 21) {
        delete db.games[interaction.user.id];
        saveDB();
        return interaction.update({
          embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')}  (${val})\n\n<a:AbbyCry:1393909295665643540> Bạn đã thua ${game.bet}<a:diamondgem:1402590496647413811>do **NGOẮC**`).setColor('Red')],
          components: []
        });
      }
      return interaction.update({
        embeds: [new EmbedBuilder().setTitle(`**<:cards:1407796608220794981> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')} (${val})\n* **Bài Của BOT:** ${game.dealerHand[0].rank+game.dealerHand[0].suit} ???`).setColor('Green')],
        components: interaction.message.components
      });
    }

    // Sửa lỗi: Cần so sánh với customId mới
    if (interaction.customId === 'xizach_stand') {
      let dealerVal = calcHand(game.dealerHand);
      while (dealerVal < 17) {
        game.dealerHand.push(drawCard());
        dealerVal = calcHand(game.dealerHand);
      }
      const playerVal = calcHand(game.playerHand);

      let result;
      if (dealerVal > 21 || playerVal > dealerVal) {
        addBalance(interaction.user.id, game.bet*2);
        result = `<a:AbbyWOW:1393909383884439602> Bạn đã thắng! Nhận được **${game.bet}**<a:diamondgem:1402590496647413811>`;
      } else if (playerVal === dealerVal) {
        addBalance(interaction.user.id, game.bet);
        result = `<a:AbbyFlower:1393909312761364541> Hòa, bạn được hoàn lại **${game.bet}**<a:diamondgem:1402590496647413811>`;
      } else {
        result = `<a:AbbyCry:1393909295665643540> BOT đã thắng! Bạn bị mất **${game.bet}**<a:diamondgem:1402590496647413811>`;
      }

      delete db.games[interaction.user.id];
      saveDB();

      return interaction.update({
        embeds: [new EmbedBuilder().setTitle(`**<a:Verified:1406631971509243974> Xì Zách Cùng Augusta | Số <a:diamondgem:1402590496647413811> Đặt ${bet}**`).setDescription(`* **Bài Của Bạn:** ${game.playerHand.map(c=>c.rank+c.suit).join(' ')} (${playerVal})\n* **Bài Của BOT:** ${game.dealerHand.map(c=>c.rank+c.suit).join(' ')} (${dealerVal})\n\n${result}`).setColor('Blue')],
        components: []
      });
    }
  }

};
