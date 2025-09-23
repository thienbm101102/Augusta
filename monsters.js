// File: monsters.js

module.exports = {
    'slime': {
        name: 'Slime',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413771800868814859/89807-jumping-slime.gif?ex=68bd2517&is=68bbd397&hm=0a0b082f5781b36ac13e738228a581c622f56e98c080d37c0453e2ae97c1e4c0&',
        baseStats: { attack: 10, defense: 5, hp: 150 },
        expToLevelUp: 100,
        evolvesAtLevel: 10,
        evolvesTo: 'slime_king',
        cost: 1000
    },
    'slime_king': {
        name: 'Vua Slime',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774064698261584/75929-slimemonster.gif?ex=68bd2733&is=68bbd5b3&hm=e63af6e1de5248a9a050b1c307de83606683b2eb12cf16bf1d337c782b94b041&',
        baseStats: { attack: 30, defense: 20, hp: 150 },
        expToLevelUp: 200,
        cost: 50000
    },
    'goblin': {
        name: 'Goblin',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774397918937109/92212-shinyseadra.gif?ex=68bd2783&is=68bbd603&hm=98087915718560c49e268f9f5de237eb9039223685568004690e67ab1f1b4939&',
        baseStats: { attack: 15, defense: 10, hp: 170 },
        expToLevelUp: 120,
        evolvesAtLevel: 12,
        evolvesTo: 'goblin_warrior',
        cost: 5000
    },
    'goblin_warrior': {
        name: 'Chiến Binh Goblin',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774499211640842/53268-shinynidoking.gif?ex=68bd279b&is=68bbd61b&hm=af83a811d2377a5555d96ed60d11635e68dd56673f9c1245054ac784b6340f15&',
        baseStats: { attack: 40, defense: 30, hp: 200 },
        expToLevelUp: 250,
        cost: 75000
    },
    'chim_lua': {
        name: 'Chim Lửa',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774625850003577/4726-phoenix.gif?ex=68bd27b9&is=68bbd639&hm=172df97e041b658ec75b8f85e4750a31adc2d291f4dbbcdc68156ac4a6a24b4b&',
        baseStats: { attack: 20, defense: 10, hp: 190 },
        expToLevelUp: 150,
        evolvesAtLevel: 15,
        evolvesTo: 'phuong_hoang',
        cost: 15000
    },
    'phuong_hoang': {
        name: 'Phượng Hoàng',
        imageUrl:'',
        baseStats: { attack: 50, defense: 30, hp: 250 },
        expToLevelUp: 300,
        cost: 120000
    },
    'rong_con': {
        name: 'Rồng Con',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774800073261096/81604-shinydragonair.gif?ex=68bd27e3&is=68bbd663&hm=9c64209b3863c5050b207e2250a4f858e65bbdc04a1fa557848c40c75287cca7&',
        baseStats: { attack: 25, defense: 25, hp: 120 },
        expToLevelUp: 200,
        evolvesAtLevel: 20,
        evolvesTo: 'rong_lua',
        cost: 25000
    },
    'rong_lua': {
        name: 'Rồng Lửa',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774875281199134/66781-shinydragonite.gif?ex=68bd27f4&is=68bbd674&hm=826082fa4a54f8192f9c864622a3b0ea3374aca5835d6151be25d4b419aaad7c&',
        baseStats: { attack: 70, defense: 60, hp: 500 },
        expToLevelUp: 500,
        cost: 200000
    },
    'tinh_linh_nuoc': {
        name: 'Tinh Linh Nước',
        imageUrl: 'https://cdn.discordapp.com/attachments/1351633975046570106/1413767839357210824/67249-shinysquirtle.gif?ex=68bd2167&is=68bbcfe7&hm=316c594498523ddf824fa7c008a736631b9bdaf2ea08d474491537774a41c5f6&',
        baseStats: { attack: 12, defense: 15, hp: 180 },
        expToLevelUp: 110,
        evolvesAtLevel: 11,
        evolvesTo: 'thuy_quai',
        cost: 8000
    },
    'thuy_quai': {
        name: 'Thủy Quái',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413774980612751481/6080_animated_blastoise.gif?ex=68bd280e&is=68bbd68e&hm=b396f79830ca7e1a98cc4e4c8c4993a33ee2abb927aaffe1525acca61327641f&',
        baseStats: { attack: 35, defense: 40, hp: 220 },
        expToLevelUp: 280,
        cost: 95000
    },
    'sieu_nhan_gao': {
        name: 'Siêu Nhân Gạo',
        imageUrl:'https://cdn.discordapp.com/attachments/1351633975046570106/1413775054776438845/14642-shinysnorlax.gif?ex=68bd281f&is=68bbd69f&hm=ce72d9e44ee68d01279adf3538d96d28d9750d41dcbb082c7db34d2ce4acc6da&',
        baseStats: { attack: 100, defense: 100, hp: 100 },
        expToLevelUp: 1000,
        cost: 1000000
    }

};
