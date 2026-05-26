import { db } from './db'
import { hashPassword } from './auth'

const ROBUX_PACKAGES = [
  { name: '100 Robux', amount: 100, priceBdt: 120, priceCrypto: 1.0, bonus: 0, popular: false, sortOrder: 1 },
  { name: '200 Robux', amount: 200, priceBdt: 230, priceCrypto: 2.0, bonus: 10, popular: false, sortOrder: 2 },
  { name: '400 Robux', amount: 400, priceBdt: 440, priceCrypto: 3.8, bonus: 30, popular: true, sortOrder: 3 },
  { name: '800 Robux', amount: 800, priceBdt: 850, priceCrypto: 7.4, bonus: 80, popular: false, sortOrder: 4 },
  { name: '1700 Robux', amount: 1700, priceBdt: 1750, priceCrypto: 15.2, bonus: 170, popular: false, sortOrder: 5 },
  { name: '4500 Robux', amount: 4500, priceBdt: 4500, priceCrypto: 39, bonus: 500, popular: false, sortOrder: 6 },
]

const FLASH_DEALS = [
  {
    name: '⚡ Flash: Permanent Dragon Fruit',
    slug: 'flash-permanent-dragon-fruit',
    description: 'LIMITED TIME OFFER! The legendary Dragon Fruit at a special flash deal price. Permanently unlocked on your account. Same quality, lower price — grab it before time runs out!',
    category: 'permanent_fruit',
    stock: 3,
    priceBdt: 1800,
    priceCrypto: 15.5,
    rarity: 'mythical',
    featured: true,
    isFlashDeal: true,
    flashDealEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    originalPrice: 2500,
    deliveryInfo: 'Flash deal delivery within 15-30 minutes.',
  },
  {
    name: '⚡ Flash: Physical Dough Fruit',
    slug: 'flash-physical-dough-fruit',
    description: 'FLASH SALE! Get the physical Dough Fruit at an unbeatable price. Perfect for PvP with incredible combo potential. Limited stock available!',
    category: 'physical_fruit',
    stock: 5,
    priceBdt: 800,
    priceCrypto: 7,
    rarity: 'legendary',
    featured: true,
    isFlashDeal: true,
    flashDealEndsAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    originalPrice: 1200,
    deliveryInfo: 'Flash deal — priority delivery within 10 minutes.',
  },
]

const ANNOUNCEMENTS = [
  {
    title: '🎉 Robux Purchasing Now Available!',
    body: 'You can now purchase Robux directly through BloxVault! Choose from 6 different packages with bonus Robux on every purchase. Fast, secure, and reliable.',
    type: 'promo',
    active: true,
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: '⚡ Flash Deals Are Live!',
    body: 'Limited-time flash deals on premium fruits! Up to 30% off on select items. Hurry — deals expire soon!',
    type: 'promo',
    active: true,
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    title: '🏆 Loyalty Points Program Launched',
    body: 'Earn points with every purchase! Get 1 point per ৳100 spent. Redeem points for discounts on future orders. Plus, earn 50 bonus points just for signing up!',
    type: 'update',
    active: true,
  },
]

export async function seedNewFeatures() {
  console.log('Seeding new features...')

  // Seed Robux packages
  const existingPackages = await db.robuxPackage.count()
  if (existingPackages === 0) {
    for (const pkg of ROBUX_PACKAGES) {
      await db.robuxPackage.create({ data: pkg })
    }
    console.log(`Created ${ROBUX_PACKAGES.length} Robux packages`)
  } else {
    console.log(`Robux packages already exist (${existingPackages})`)
  }

  // Seed flash deals
  const existingFlashDeals = await db.product.count({ where: { isFlashDeal: true } })
  if (existingFlashDeals === 0) {
    for (const deal of FLASH_DEALS) {
      await db.product.create({ data: deal })
    }
    console.log(`Created ${FLASH_DEALS.length} flash deals`)
  } else {
    console.log(`Flash deals already exist (${existingFlashDeals})`)
  }

  // Seed announcements
  const existingAnnouncements = await db.announcement.count()
  if (existingAnnouncements === 0) {
    for (const ann of ANNOUNCEMENTS) {
      await db.announcement.create({ data: ann })
    }
    console.log(`Created ${ANNOUNCEMENTS.length} announcements`)
  } else {
    console.log(`Announcements already exist (${existingAnnouncements})`)
  }

  // Add loyalty points to existing users
  const customerUser = await db.user.findUnique({ where: { email: 'customer@example.com' } })
  if (customerUser && !customerUser.referralCode) {
    await db.user.update({
      where: { id: customerUser.id },
      data: { 
        loyaltyPoints: 50,
        referralCode: 'BLOX' + customerUser.username.toUpperCase().slice(0, 4),
      },
    })
    // Add signup bonus transaction
    await db.pointTransaction.create({
      data: {
        userId: customerUser.id,
        amount: 50,
        type: 'signup_bonus',
        reference: 'Welcome bonus',
      },
    })
    console.log('Updated customer with loyalty points and referral code')
  }

  // Update admin with referral code
  const adminUser = await db.user.findUnique({ where: { email: 'admin@bloxvault.com' } })
  if (adminUser && !adminUser.referralCode) {
    await db.user.update({
      where: { id: adminUser.id },
      data: { referralCode: 'BLOXADMIN' },
    })
    console.log('Updated admin with referral code')
  }

  console.log('New features seeding complete!')
}

// Run if called directly
seedNewFeatures()
  .catch(console.error)
  .finally(() => process.exit())
