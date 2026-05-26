import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { zodFirstError } from '@/lib/validation'
import { db } from '@/lib/db'

async function getAuthUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get('bv_session')
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.value },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      banned: true,
      loyaltyPoints: true,
      referralCode: true,
    },
  })

  if (!user || user.banned) return null
  return user
}

// GET: Get user's loyalty points balance and recent transactions
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const [transactions, totalEarned, totalSpent] = await Promise.all([
      db.pointTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      db.pointTransaction.aggregate({
        where: { userId: user.id, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      db.pointTransaction.aggregate({
        where: { userId: user.id, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        balance: user.loyaltyPoints,
        totalEarned: totalEarned._sum.amount || 0,
        totalSpent: Math.abs(totalSpent._sum.amount || 0),
        transactions,
      },
    })
  } catch (error) {
    console.error('Loyalty points GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const redeemPointsSchema = z.object({
  pointsToRedeem: z
    .number()
    .int()
    .min(100, 'Minimum 100 points required for redemption'),
})

// POST: Redeem points (minimum 100 points, each point worth ৳1 discount)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = redeemPointsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { pointsToRedeem } = parsed.data

    if (pointsToRedeem > user.loyaltyPoints) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient points. You have ${user.loyaltyPoints} points but tried to redeem ${pointsToRedeem}.`,
        },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Deduct points from user
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { loyaltyPoints: { decrement: pointsToRedeem } },
        select: { id: true, loyaltyPoints: true },
      })

      // Create point transaction record
      const pointTx = await tx.pointTransaction.create({
        data: {
          userId: user.id,
          amount: -pointsToRedeem,
          type: 'redemption',
          reference: `Redemption of ${pointsToRedeem} points (৳${pointsToRedeem} discount)`,
        },
      })

      // Create notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Points Redeemed',
          body: `You have redeemed ${pointsToRedeem} loyalty points for ৳${pointsToRedeem} discount.`,
          type: 'info',
        },
      })

      return { updatedUser, pointTx }
    })

    return NextResponse.json({
      success: true,
      data: {
        redeemedPoints: pointsToRedeem,
        discountValue: pointsToRedeem, // ৳1 per point
        newBalance: result.updatedUser.loyaltyPoints,
        transaction: result.pointTx,
      },
    })
  } catch (error) {
    console.error('Redeem points error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
