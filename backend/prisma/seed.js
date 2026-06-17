// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('Demo1234', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@forgetmenot.com' },
    update: {},
    create: {
      email: 'demo@forgetmenot.com',
      username: 'Demo User',
      passwordHash,
      avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=3B82F6&color=fff&size=200',
      role: 'STUDENT',
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create sample decks
  const decks = [
    {
      name: 'Toán Cao Cấp',
      description: 'Tích phân, đạo hàm và giới hạn',
      color: '#3B82F6',
      icon: '📐',
      examDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
    {
      name: 'Vật Lý Đại Cương',
      description: 'Cơ học, nhiệt học và điện từ',
      color: '#10B981',
      icon: '⚡',
    },
    {
      name: 'Tiếng Anh Chuyên Ngành',
      description: 'Từ vựng kỹ thuật và học thuật',
      color: '#8B5CF6',
      icon: '📖',
      examDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days - will trigger cram mode
    },
  ];

  for (const deckData of decks) {
    const deck = await prisma.deck.create({
      data: {
        ...deckData,
        userId: user.id,
        cardCount: 0,
      },
    });

    console.log(`📚 Created deck: ${deck.name}`);

    // Create sample flashcards for each deck
    const flashcards = this.getSampleFlashcards(deckData.name, deck.id);
    
    for (const card of flashcards) {
      await prisma.flashcard.create({
        data: card,
      });
    }

    // Update card count
    await prisma.deck.update({
      where: { id: deck.id },
      data: { cardCount: flashcards.length },
    });

    console.log(`   📝 Added ${flashcards.length} flashcards`);
  }

  console.log('✅ Database seeding completed!');
  console.log('📧 Demo login: demo@forgetmenot.com / Demo1234');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function getSampleFlashcards(deckName, deckId) {
  const flashcards = {
    'Toán Cao Cấp': [
      { frontText: 'Tính đạo hàm của $f(x) = x^3 + 2x^2 - 5x + 1$', backText: "$f'(x) = 3x^2 + 4x - 5$", hint: 'Sử dụng quy tắc đạo hàm cơ bản' },
      { frontText: 'Công thức tích phân từng phần?', backText: '$\\int u dv = uv - \\int v du$', hint: 'u dv = uv - v du' },
      { frontText: 'Định nghĩa giới hạn của dãy số?', backText: '$\\lim_{n \\to \\infty} a_n = L$ nếu $\\forall \\epsilon > 0, \\exists N: \\forall n > N, |a_n - L| < \\epsilon$', hint: 'Epsilon - N' },
      { frontText: 'Tính $\\int_{0}^{1} x^2 dx$', backText: '$\\frac{1}{3}$', hint: 'Sử dụng công thức nguyên hàm' },
      { frontText: 'Khi nào hàm số không có đạo hàm tại một điểm?', backText: 'Khi giới hạn của tỉ số gia không tồn tại hoặc bằng vô cùng', hint: 'Điểm gãy, điểm nhọn' },
    ],
    'Vật Lý Đại Cương': [
      { frontText: 'Định luật II Newton phát biểu như thế nào?', backText: '$\\vec{F} = m\\vec{a}$. Gia tốc của vật tỉ lệ thuận với lực tác dụng và tỉ lệ nghịch với khối lượng.', hint: 'F = ma' },
      { frontText: 'Công thức tính động năng?', backText: '$E_k = \\frac{1}{2}mv^2$', hint: 'Một nửa m v bình' },
      { frontText: 'Định luật bảo toàn năng lượng?', backText: 'Năng lượng không tự sinh ra hoặc mất đi, chỉ chuyển từ dạng này sang dạng khác', hint: 'Không tạo ra, không mất đi' },
    ],
    'Tiếng Anh Chuyên Ngành': [
      { frontText: '"Algorithm" có nghĩa là gì?', backText: 'Thuật toán - Một tập hợp các bước được định nghĩa rõ ràng để giải quyết một vấn đề', hint: 'Các bước giải quyết vấn đề' },
      { frontText: 'Dịch: "The derivative of a function represents its rate of change"', backText: 'Đạo hàm của một hàm số biểu thị tốc độ thay đổi của nó', hint: 'Rate of change = tốc độ thay đổi' },
      { frontText: 'Từ viết tắt "API" là gì?', backText: 'Application Programming Interface - Giao diện lập trình ứng dụng', hint: 'Application Programming Interface' },
    ],
  };

  return (flashcards[deckName] || []).map(card => ({
    ...card,
    deckId,
    nextReview: new Date(),
    isAiGenerated: false,
  }));
}