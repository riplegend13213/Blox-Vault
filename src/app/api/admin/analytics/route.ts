import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

async function requireAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('bv_session')
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.value },
    select: { id: true, role: true, banned: true },
  })

  if (!user || user.banned || user.role !== 'admin') return null
  return user
}

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Revenue: sum of totals from delivered orders
    const deliveredOrders = await db.order.findMany({
      where: { status: 'delivered' },
      select: { total: true, createdAt: true },
    })

    const revenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0)

    // Monthly sales: group orders by month, sum totals
    const allOrders = await db.order.findMany({
      select: {
        total: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const monthlySalesMap = new Map<string, { total: number; count: number }>()

    for (const order of allOrders) {
      const monthKey = order.createdAt.toISOString().slice(0, 7) // "YYYY-MM"
      const existing = monthlySalesMap.get(monthKey) || { total: 0, count: 0 }
      existing.total += order.total
      existing.count += 1
      monthlySalesMap.set(monthKey, existing)
    }

    const monthlySales = Array.from(monthlySalesMap.entries())
      .map(([month, data]) => ({
        month,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // User growth: count users created per month
    const allUsers = await db.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const userGrowthMap = new Map<string, number>()

    for (const user of allUsers) {
      const monthKey = user.createdAt.toISOString().slice(0, 7)
      const current = userGrowthMap.get(monthKey) || 0
      userGrowthMap.set(monthKey, current + 1)
    }

    const userGrowth = Array.from(userGrowthMap.entries())
      .map(([month, count]) => ({
        month,
        newUsers: count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Order completion rate: delivered / total orders ratio
    const totalOrders = await db.order.count()
    const completedOrderCount = deliveredOrders.length
    const orderCompletionRate =
      totalOrders > 0
        ? Math.round((completedOrderCount / totalOrders) * 1000) / 10
        : 0 // percentage with 1 decimal

    // Additional useful stats
    const pendingOrders = await db.order.count({
      where: { status: 'pending_payment' },
    })

    const underReviewOrders = await db.order.count({
      where: { status: 'under_review' },
    })

    const totalProducts = await db.product.count({
      where: { active: true },
    })

    const totalUsers = allUsers.length

    const openTickets = await db.supportTicket.count({
      where: { status: 'open' },
    })

    return NextResponse.json({
      success: true,
      data: {
        revenue: Math.round(revenue * 100) / 100,
        monthlySales,
        userGrowth,
        orderCompletionRate,
        summary: {
          totalOrders,
          completedOrders: completedOrderCount,
          pendingOrders,
          underReviewOrders,
          totalProducts,
          totalUsers,
          openTickets,
        },
      },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
