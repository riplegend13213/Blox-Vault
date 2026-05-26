import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List active flash deals (products where isFlashDeal=true AND flashDealEndsAt > now)
export async function GET() {
  try {
    const now = new Date()

    const flashDeals = await db.product.findMany({
      where: {
        isFlashDeal: true,
        flashDealEndsAt: { gt: now },
        active: true,
      },
      orderBy: { flashDealEndsAt: 'asc' },
    })

    // Add countdown info to each deal
    const dealsWithCountdown = flashDeals.map((deal) => {
      const endsAt = deal.flashDealEndsAt!
      const timeRemaining = endsAt.getTime() - now.getTime()

      return {
        ...deal,
        countdown: {
          totalMs: Math.max(0, timeRemaining),
          days: Math.floor(Math.max(0, timeRemaining) / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (Math.max(0, timeRemaining) % (1000 * 60 * 60 * 24)) /
              (1000 * 60 * 60)
          ),
          minutes: Math.floor(
            (Math.max(0, timeRemaining) % (1000 * 60 * 60)) / (1000 * 60)
          ),
          seconds: Math.floor(
            (Math.max(0, timeRemaining) % (1000 * 60)) / 1000
          ),
        },
        discountPercentage: deal.originalPrice
          ? Math.round(
              ((deal.originalPrice - deal.priceBdt) / deal.originalPrice) * 100
            )
          : 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: { flashDeals: dealsWithCountdown },
    })
  } catch (error) {
    console.error('Flash deals list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
