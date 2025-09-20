const CARDS = {
    'Thường': [
        {
            name: "Cơm Cháy Tuyệt Vân",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 5, hp: 10 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324224935464970/latest.jpg?ex=68bf2794&is=68bdd614&hm=2b1d423660d4813a2c3f74d0f6ee91613ce595b33a81149773835300c91da913&=&format=webp&width=405&height=694"
        },
        {
            name: "Tiên Nhảy Tường",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 8, hp: 7 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324224553910302/latest_1.jpg?ex=68bf2794&is=68bdd614&hm=19ddef9454aefb3714a13bd9198735673f73edf85d590db68d3474a49fca7cdb&=&format=webp&width=405&height=694"
        },
        {
            name: "Gà Xông Khói",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324224184680520/latest_2.jpg?ex=68bf2793&is=68bdd613&hm=64638bab092e320955bae890d341935ca157c552040c886e9a4d43d4152d7a60&=&format=webp&width=405&height=694"
        },
        {
            name: "Gà Nấu Hoa Ngọt",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324223845072977/latest_3.jpg?ex=68bf2793&is=68bdd613&hm=f3ee8990df0ce4fe05539ec54f1117abdb63301aee0c3e67b42238aeeac2fe34&=&format=webp&width=405&height=694"
        },
        {
            name: "Bánh Khoai Tây",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324223358402702/latest_4.jpg?ex=68bf2793&is=68bdd613&hm=b81de250efbb3b61557cc920a9f93f4a933cfcde2162115afed1761038aeeb1a&=&format=webp&width=405&height=694"
        },
        {
            name: "Pizza Nấm Rơm",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324223064805466/latest_5.jpg?ex=68bf2793&is=68bdd613&hm=3df269b25d8ceb716261da5e461ef0aba0ce97256dbed0f069ae872ce0608373&=&format=webp&width=405&height=694"
        },
        {
            name: "Thịt Rừng Cuộn Bạc Hà",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324222637117541/latest_6.jpg?ex=68bf2793&is=68bdd613&hm=9bcd019495e07e520d74fbab0e90aa595f23b0f57984d932b5f5ce07d70cd2bd&=&format=webp&width=405&height=694"
        },
        {
            name: "Trứng Chiên",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324221726818355/latest_7.jpg?ex=68bf2793&is=68bdd613&hm=0661a9fd5fc3d78f4e84615c2578716cb23b0bf69fac95312cb365dab9e687a8&=&format=webp&width=405&height=694"
        },
        {
            name: "Sashimi",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324221235958010/latest_8.jpg?ex=68bf2793&is=68bdd613&hm=dbff2bfbaa08083012357886da8cb1dc9a3c6ed89df9376874d2a77f6adc7841&=&format=webp&width=405&height=694"
        },
        {
            name: "Gà Nướng Tandoori",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324220850208878/latest_9.jpg?ex=68bf2793&is=68bdd613&hm=608516fcc080c1b3c864b7052628b1db4630dde9df19384783745c41d7415078&=&format=webp&width=405&height=694"
        },
        {
            name: "Cua Phủ Bơ",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324290710409306/latest_10.jpg?ex=68bf27a3&is=68bdd623&hm=6ebaa9d0308b459d1145bf1322801979ee2b88c6d0467e34b2ad9a65d6503f78&=&format=webp&width=405&height=694"
        },
        {
            name: "Khoai Tây Chiên Cá",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324289926336522/latest_11.jpg?ex=68bf27a3&is=68bdd623&hm=1fa1a76fcb3272a1502bd29871807c14afe196b34f14108b3129146fd458884d&=&format=webp&width=405&height=694"
        },
        {
            name: "Nhung Tùng Ủ Thịt Cuộn",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324289536262336/latest_12.jpg?ex=68bf27a3&is=68bdd623&hm=aea2b489e3de38f35f30d664f83a488fe8fca892b607c29749d8b0133c6d5c89&=&format=webp&width=405&height=694"
        },
        {
            name: "Macaron Cầu Vồng",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324288982351872/latest_13.jpg?ex=68bf27a3&is=68bdd623&hm=7b661be1e013eb153a0152ff0e828e89ea8800dd2ee4c64efb96aba927b83d99&=&format=webp&width=405&height=694"
        },
        {
            name: "Bánh Quy Saurus",
            rarity: "Thường",
            description: "Không có",
            stats: { attack: 6, hp: 9 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414324288558989443/latest_14.jpg?ex=68bf27a3&is=68bdd623&hm=33b4b523dc94e66237f90dff72315cb8d4559339e8782432d1f84e9e3b786d8d&=&format=webp&width=405&height=694"
        }
    ],
    'Hiếm': [
        {
            name: "Ngai Thánh Thần Và Thế Tục",
            rarity: "Hiếm",
            description: "Không có",
            stats: { attack: 12, hp: 15 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414325368235495539/latest_15.jpg?ex=68bf28a4&is=68bdd724&hm=b91b06858b5f9fa3c3a1fc3fc8d40a5aa7d63800c5faacd31fd712aaabe93bf7&=&format=webp&width=405&height=694"
        },
        {
            name: "Khế Ước Bàn Nham",
            rarity: "Hiếm",
            description: "Không có",
            stats: { attack: 10, hp: 20 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414325367879110797/latest_16.jpg?ex=68bf28a4&is=68bdd724&hm=afe1d007f426f51c3e82cca9bf715d89913231f23a0bdc155990a7cf53714b05&=&format=webp&width=405&height=694"
        },
        {
            name: "Sân Vườn Cổ Xưa",
            rarity: "Hiếm",
            description: "Không có",
            stats: { attack: 15, hp: 12 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414325367539499038/latest_17.jpg?ex=68bf28a4&is=68bdd724&hm=656ac89d14deab2cf57687a886be64273876319c54aad7ba4dd89a739803b59d&=&format=webp&width=405&height=694"
        },
        {
            name: "Vũ Điệu Vui Vẻ",
            rarity: "Hiếm",
            description: "Không có",
            stats: { attack: 15, hp: 12 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414325367191376023/latest_18.jpg?ex=68bf28a4&is=68bdd724&hm=a0302beb4a5c5a7aef89b735340dc74f61793d7bd708a51c052f62a177068929&=&format=webp&width=405&height=694"
        },
        {
            name: "Lăng Kính Hút Năng Lượng",
            rarity: "Hiếm",
            description: "Không có",
            stats: { attack: 15, hp: 12 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414325366822273125/latest_19.jpg?ex=68bf28a4&is=68bdd724&hm=e415b113aa9f42f731257e26d1f87dd1eed25c7929ebdd7e1ffda03041e9d486&=&format=webp&width=405&height=694"
        }
    ],
    'Sử Thi': [
        {
            name: "Kamisato Ayato",
            rarity: "Sử Thi",
            description: "Cây bách được thần bảo vệ, cành mới đã lại đâm chồi nảy lộc.",
            stats: { attack: 22, hp: 28 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414514467848589364/Kamisato_Ayato_Dynamic_Skin.gif?ex=68bfd8c1&is=68be8741&hm=4259c1a55a6cd4f8aa09eaa0eb5e0b13a44b3eb297c5ee4b6d693025d07c3ec8&=&width=438&height=738"
        },
        {
            name: "Kamisato Ayaka",
            rarity: "Sử Thi",
            description: "Như sương ngưng đọng, như hạc trong đình.",
            stats: { attack: 22, hp: 28 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414326558889480302/Kamisato_Ayaka_Dynamic_Skin.gif?ex=68bf29c0&is=68bdd840&hm=2d650e9d91c3f653e8d65b0b107aa5174e5d93042a7dd2e5f47101c95fc4a794&=&width=413&height=695"
        },
        {
            name: "Kaedehara Kazuha",
            rarity: "Sử Thi",
            description: "Vui thú thưởng hoa nghe chim hót, đường dài gió lộng trăng sáng soi.",
            stats: { attack: 22, hp: 28 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414326558398877886/Kaedehara_Kazuha_Dynamic_Skin.gif?ex=68bf29c0&is=68bdd840&hm=2ec36f5bda2cc86a5b2a479096a6f61f86ddf9afb0d25e1e2055390df2f4429c&=&width=413&height=695"
        },
        {
            name: "Eremite Diệp Luân Vũ Giả",
            rarity: "Sử Thi",
            description: "Con dân của cát có truyền thống âm nhạc và vũ đạo, ban đầu là để tế thần, về sau là dùng vũ đạo và kỹ thuật chiến đấu để lấy lòng vua.",
            stats: { attack: 22, hp: 28 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414326557714940025/Eremite_Floral_Ring-Dancer_Dynamic_Skin.gif?ex=68bf29c0&is=68bdd840&hm=e5ecb4fc8b1ac7c686b5d62a3d074f3a528cec51de2ee6d7df53544c4aacc442&=&width=380&height=644"
        },
        {
            name: "Navia",
            rarity: "Sử Thi",
            description: "Hoa Hồng Vàng Tung Bay.",
            stats: { attack: 22, hp: 28 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414326557195112498/Navia_Dynamic_Skin.gif?ex=68bf29c0&is=68bdd840&hm=27c4f363a6bdf044771354b96f6c59a3a6c7f78e9075bb6652740b917ca3d35a&=&width=383&height=644"
        }
    ],
    'Huyền Thoại': [
        {
            name: "Học Sĩ Vực Sâu - Uyên Hỏa",
            rarity: "Huyền Thoại",
            description: "Từ những chương kinh điển được tiết lộ có rất nhiều lời cảnh báo được chú ý.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414513588273545276/Abyss_Lector_Fathomless_Flames_Dynamic_Skin.gif?ex=68bfd7ef&is=68be866f&hm=a0633de240896cae3e802be2a0e983840ba9cf34029ffbca682105c44aeca39a&=&width=260&height=438"
        },
        {
            name: "Sứ Đồ Vực Sâu - Kích Lưu",
            rarity: "Huyền Thoại",
            description: "Đoạn tuyệt các thế giới, vạn vật sẽ bị hủy diệt.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414327331685798058/Abyss_Herald_Wicked_Torrents_Dynamic_Skin.gif?ex=68bf2a78&is=68bdd8f8&hm=597a26765622df087c5916b7941c824a57d89b456d91d482133e1b09ba76c4c9&=&width=381&height=643"
        },
        {
            name: "Học Sĩ Vực Sâu - Tử Điện",
            rarity: "Huyền Thoại",
            description: "Ca tụng Vực Sâu, trí tuệ ăn mòn.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414327332595961956/Abyss_Lector-_Violet_Lightning_Dynamic_Skin.gif?ex=68bf2a79&is=68bdd8f9&hm=f06d2351d745b45060f16607cd17dbafaf76b7593fc04daa1414f5b7a98e2947&=&width=380&height=644"
        },
        {
            name: "Thôn Tinh Kình Ngư",
            rarity: "Huyền Thoại",
            description: "Trong những câu chuyện kỳ ảo nhất hay những lời dối trá điên cuồng nhất, ở những ngôi sao sâu thẳm trong vũ trụ có lẽ cũng đầy ắp sự sống như Teyvat, mà vũ trụ thì cũng giống như đại dương. Có thể vũ trụ vẫn luôn cố gắng xâm nhập vào Teyvat, có lẽ một thế lực cao hơn đã tạo ra biên giới để bảo vệ thế giới này.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414327332922982430/All-Devouring_Narwhal_Dynamic_Skin.gif?ex=68bf2a79&is=68bdd8f9&hm=148662a2e2e14e5d009ea95cb05614a6cfb64ca37b7f03e345f51de387790140&=&width=381&height=643"
        }
    ],
    'Thần Thoại': [
        {
            name: "Furina",
            rarity: "Thần Thoại",
            description: "Tiếng ca bất diệt, vũ điệu vô tận.",
            stats: { attack: 25, hp: 20 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414326559334203392/Furina_Dynamic_Skin.gif?ex=68bf29c0&is=68bdd840&hm=27c15f603c980c3767010a99a68d1a2c649f8df39e61db800b160fc4ad37fa26&=&width=413&height=695"
        },
        {
            name: "Raiden Shogun",
            rarity: "Thần Thoại",
            description: "Tiếng sấm hủy diệt, ảo ảnh phù thế.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414327352670027860/Raiden_Shogun_Dynamic_Skin.gif?ex=68bf2a7d&is=68bdd8fd&hm=7ae8140aa96fb836141ed3c8f30b9f86fd3b012f8ec24febbf93eadf04cb9e73&=&width=438&height=738"
        },
        {
            name: "Nahida",
            rarity: "Thần Thoại",
            description: "Kết tinh bạch thảo, cung điện đổi mới.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414509410767732736/Nahida_Dynamic_Skin.gif?ex=68bfd40b&is=68be828b&hm=2d344fd9c54e0cfa5940716039009ebe9ae32f3ff402830a277652ff3bc4aae2&=&width=438&height=738"
        },
        {
            name: "Zhongli",
            rarity: "Thần Thoại",
            description: "Ngọc ẩn trong đá, chiếu sáng muôn nơi; Lấp lánh như sao, không gì sánh kịp.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414509535892344913/Zhongli_Dynamic_Skin.gif?ex=68bfd429&is=68be82a9&hm=7ed9f5a4c33d657ed40fa7fbf40ea0f789bb3cb361a7a3e2c6b1977f27f856ea&=&width=438&height=738"
        },
        {
            name: "Venti",
            rarity: "Thần Thoại",
            description: "Bốn mùa luân chuyển, gió bốn phương sẽ không bao giờ dừng lại./n Đương nhiên rồi, công lao cũng không phải của nó, mà chủ yếu là của tôi./n Nếu không có nhà thơ lang thang, ai sẽ hát lên những điều này?",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414509667161210930/Venti_Dynamic_Skin.gif?ex=68bfd448&is=68be82c8&hm=18899610fa3ccd0df0b0b821bddc72e3f5bc79d02cbcb45f01d14c05ab1ebc05&=&width=438&height=738"
        },
        {
            name: "Mavuika",
            rarity: "Thần Thoại",
            description: "Ngọn lửa sáng nhất, lộng lẫy nhất, rực rỡ nhất đã tái sinh.",
            stats: { attack: 40, hp: 40 },
            imageUrl: "https://media.discordapp.net/attachments/1351633975046570106/1414512677128114258/latest_20.jpg?ex=68bfd716&is=68be8596&hm=bcfb22f9c19de4265d1851f6dc7e980d7f75f186e04651db731cacfdea4859da&=&format=webp&width=481&height=825"
        },
    ]
};

const CARD_RARITY_RATE = {
    'Thường': 0.55,
    'Hiếm': 0.35,
    'Sử Thi': 0.08,
    'Huyền Thoại': 0.015,
    'Thần Thoại': 0.005
};

module.exports = { CARDS, CARD_RARITY_RATE };
