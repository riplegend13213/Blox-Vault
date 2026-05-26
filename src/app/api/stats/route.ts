import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeActivity = searchParams.get('includeActivity') === 'true'
    const activityLimit = parseInt(searchParams.get('activityLimit') || '5')

    // Completed orders count
    const completedOrders = await db.order.count({
      where: { status: 'delivered' },
    })

    // Active customers - distinct users with at least one order
    const customersWithOrders = await db.order.findMany({
      select: { userId: true },
      distinct: ['userId'],
    })
    const activeCustomers = customersWithOrders.length

    // Average delivery time for delivered orders
    const deliveredOrders = await db.order.findMany({
      where: { status: 'delivered' },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    })

    let avgDeliveryTime = 0
    if (deliveredOrders.length > 0) {
      const totalMinutes = deliveredOrders.reduce((sum, order) => {
        const diffMs = order.updatedAt.getTime() - order.createdAt.getTime()
        const diffMinutes = diffMs / (1000 * 60)
        return sum + diffMinutes
      }, 0)
      avgDeliveryTime = Math.round(totalMinutes / deliveredOrders.length)
    }

    // Average satisfaction (average rating of all reviews)
    const reviews = await db.review.findMany({
      select: { rating: true },
    })

    let satisfaction = 0
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
      satisfaction = Math.round((totalRating / reviews.length) * 10) / 10
    }

    // Recent activity (optional)
    let recentActivity = null
    if (includeActivity) {
      const recentOrders = await db.order.findMany({
        where: {
          status: { in: ['confirmed', 'processing', 'delivered'] },
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
          product: {
            select: {
              name: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: activityLimit,
      })

      recentActivity = recentOrders.map((order) => ({
        id: order.id,
        username: order.user.username,
        productName: order.product.name,
        productCategory: order.product.category,
        status: order.status,
        createdAt: order.createdAt,
      }))
    }

    // Total Robux sold (sum of robuxAmount from delivered robux orders)
    const totalRobuxResult = await db.robuxOrder.aggregate({
      _sum: { robuxAmount: true },
      where: { status: 'delivered' },
    })
    const totalRobuxSold = totalRobuxResult._sum.robuxAmount || 0

    // Total loyalty points distributed (sum of positive point transactions)
    const loyaltyResult = await db.pointTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } },
    })
    const loyaltyPointsDistributed = loyaltyResult._sum.amount || 0

    return NextResponse.json({
      success: true,
      data: {
        completedOrders,
        activeCustomers,
        avgDeliveryTime, // in minutes
        satisfaction, // out of 5
        totalRobuxSold,
        loyaltyPointsDistributed,
        recentActivity,
      },
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
