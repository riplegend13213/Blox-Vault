import { db } from './db'
import { ensureAdminUser } from './auth'

const CATEGORIES = [
  'permanent_fruit',
  'physical_fruit', 
  'gamepass',
  'fruit_storage',
  'account',
  'raid_service',
  'leveling',
  'boosting',
  'custom',
]

const SAMPLE_PRODUCTS = [
  {
    name: 'Permanent Dragon Fruit',
    slug: 'permanent-dragon-fruit',
    description: 'The legendary Dragon Fruit, permanently unlocked on your account. One of the most sought-after fruits in Blox Fruits with devastating fire-based attacks and incredible mobility. This is a PERMANENT unlock that stays on your account forever.',
    category: 'permanent_fruit',
    stock: 5,
    priceBdt: 2500,
    priceCrypto: 22,
    rarity: 'mythical',
    images: '[]',
    featured: true,
    deliveryInfo: 'Delivery within 15-30 minutes after payment verification. We join your game and trade the fruit to your account.',
  },
  {
    name: 'Permanent Kitsune Fruit',
    slug: 'permanent-kitsune-fruit',
    description: 'The mythical Kitsune Fruit with incredible transformation abilities. Permanently unlocked on your account. Known for its devastating combos and unique fox-based transformations.',
    category: 'permanent_fruit',
    stock: 3,
    priceBdt: 3000,
    priceCrypto: 26,
    rarity: 'mythical',
    images: '[]',
    featured: true,
    deliveryInfo: 'Delivery within 15-30 minutes after payment verification. We join your game and trade the fruit to your account.',
  },
  {
    name: 'Permanent Leopard Fruit',
    slug: 'permanent-leopard-fruit',
    description: 'The powerful Leopard Fruit with incredible speed and damage. Permanently unlocked on your account. Excellent for both PvP and grinding with its high damage output.',
    category: 'permanent_fruit',
    stock: 4,
    priceBdt: 2200,
    priceCrypto: 19,
    rarity: 'legendary',
    images: '[]',
    featured: true,
    deliveryInfo: 'Delivery within 15-30 minutes after payment verification.',
  },
  {
    name: 'Permanent Venom Fruit',
    slug: 'permanent-venom-fruit',
    description: 'The deadly Venom Fruit with poison-based attacks and area denial capabilities. Permanently unlocked on your account. One of the best fruits for PvP combat.',
    category: 'permanent_fruit',
    stock: 6,
    priceBdt: 1800,
    priceCrypto: 16,
    rarity: 'legendary',
    images: '[]',
    featured: false,
    deliveryInfo: 'Delivery within 15-30 minutes after payment verification.',
  },
  {
    name: 'Physical Dough Fruit',
    slug: 'physical-dough-fruit',
    description: 'Physical Dough Fruit for trading or eating. One of the best fruits for PvP with incredible combo potential and Awakening abilities.',
    category: 'physical_fruit',
    stock: 8,
    priceBdt: 1200,
    priceCrypto: 10,
    rarity: 'legendary',
    images: '[]',
    featured: true,
    deliveryInfo: 'Delivery within 5-15 minutes. We meet in-game and trade the physical fruit.',
  },
  {
    name: 'Physical Buddha Fruit',
    slug: 'physical-buddha-fruit',
    description: 'Physical Buddha Fruit - the king of grinding. Massive hitbox expansion makes this the most popular fruit for PvE content and leveling.',
    category: 'physical_fruit',
    stock: 12,
    priceBdt: 800,
    priceCrypto: 7,
    rarity: 'legendary',
    images: '[]',
    featured: false,
    deliveryInfo: 'Delivery within 5-15 minutes. We meet in-game and trade.',
  },
  {
    name: 'Fruit Notifier Gamepass',
    slug: 'fruit-notifier-gamepass',
    description: 'Fruit Notifier Gamepass - get instant notifications when fruits spawn on any island. Essential for fruit hunting and collecting rare fruits.',
    category: 'gamepass',
    stock: 10,
    priceBdt: 600,
    priceCrypto: 5,
    rarity: 'rare',
    images: '[]',
    featured: true,
    deliveryInfo: 'Gamepass is gifted to your account within 10-20 minutes after payment verification.',
  },
  {
    name: '2x XP Gamepass',
    slug: '2x-xp-gamepass',
    description: 'Double XP Gamepass - level up twice as fast! Perfect for reaching max level quickly and unlocking new content. Stacks with weekend 2x XP events.',
    category: 'gamepass',
    stock: 10,
    priceBdt: 500,
    priceCrypto: 4.5,
    rarity: 'rare',
    images: '[]',
    featured: false,
    deliveryInfo: 'Gamepass is gifted to your account within 10-20 minutes.',
  },
  {
    name: 'Max Fruit Storage Slots',
    slug: 'max-fruit-storage',
    description: 'Unlock maximum fruit storage slots on your account. Store more fruits simultaneously for trading, collecting, or building your perfect loadout.',
    category: 'fruit_storage',
    stock: 15,
    priceBdt: 400,
    priceCrypto: 3.5,
    rarity: 'epic',
    images: '[]',
    featured: false,
    deliveryInfo: 'Storage upgrade applied within 15-30 minutes after payment verification.',
  },
  {
    name: 'Max Level Account (2550)',
    slug: 'max-level-account',
    description: 'Fully leveled account at maximum level 2550 with premium stats. Comes with basic fruits and materials. Perfect starting point for end-game content.',
    category: 'account',
    stock: 2,
    priceBdt: 5000,
    priceCrypto: 44,
    rarity: 'mythical',
    images: '[]',
    featured: true,
    deliveryInfo: 'Account credentials delivered within 30-60 minutes after payment verification.',
  },
  {
    name: 'Pirate Raid Carry',
    slug: 'pirate-raid-carry',
    description: 'Professional Pirate Raid completion service. Our experts will help you complete any raid difficulty. Includes all raid rewards and bounty increases.',
    category: 'raid_service',
    stock: 20,
    priceBdt: 350,
    priceCrypto: 3,
    rarity: 'epic',
    images: '[]',
    featured: false,
    deliveryInfo: 'Service completed within 30-60 minutes. We join your server and carry you through the raid.',
  },
  {
    name: '1-2550 Leveling Service',
    slug: 'full-leveling-service',
    description: 'Complete leveling service from level 1 to max level 2550. Professional, safe, and fast. Your account will be leveled efficiently using the best methods.',
    category: 'leveling',
    stock: 20,
    priceBdt: 2000,
    priceCrypto: 17,
    rarity: 'legendary',
    images: '[]',
    featured: true,
    deliveryInfo: 'Service typically completed within 24-48 hours. We provide progress updates.',
  },
  {
    name: 'Bounty Boost (30M)',
    slug: 'bounty-boost-30m',
    description: 'Get your bounty boosted to 30 million. Professional PvP players will help you achieve maximum bounty safely and efficiently.',
    category: 'boosting',
    stock: 15,
    priceBdt: 1500,
    priceCrypto: 13,
    rarity: 'legendary',
    images: '[]',
    featured: false,
    deliveryInfo: 'Boost completed within 2-6 hours depending on current bounty level.',
  },
  {
    name: 'Custom Package',
    slug: 'custom-package',
    description: 'Can\'t find what you need? Request a custom package tailored to your specific requirements. Any combination of fruits, levels, items, or services.',
    category: 'custom',
    stock: 99,
    priceBdt: 0,
    priceCrypto: 0,
    rarity: null,
    images: '[]',
    featured: false,
    deliveryInfo: 'Contact us with your requirements for a custom quote and delivery estimate.',
  },
]

export async function seedDatabase() {
  console.log('Seeding database...')
  
  // Ensure admin user exists
  await ensureAdminUser()
  console.log('Admin user ensured')
  
  // Check if products already exist
  const existingProducts = await db.product.count()
  if (existingProducts > 0) {
    console.log(`Database already has ${existingProducts} products, skipping seed`)
    return
  }
  
  // Create sample products
  for (const product of SAMPLE_PRODUCTS) {
    await db.product.create({ data: product })
  }
  console.log(`Created ${SAMPLE_PRODUCTS.length} sample products`)
  
  // Create a sample customer
  const { hash } = await import('bcryptjs')
  const passwordHash = await hash('Customer@2024', 12)
  
  await db.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      username: 'SampleCustomer',
      email: 'customer@example.com',
      passwordHash,
      role: 'customer',
      emailVerified: true,
    },
  })
  console.log('Sample customer user created')
  
  console.log('Database seeding complete!')
}

// Run if called directly
seedDatabase()
  .catch(console.error)
  .finally(() => process.exit())
