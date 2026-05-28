import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'

async function getAuthUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get('bv_session')
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.value },
    select: { id: true, username: true, email: true, banned: true, loyaltyPoints: true },
  })

  if (!user || user.banned) return null
  return user
}

// GET: fetch loyalty summary and recent transactions
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

    const [transactions, earnedSum, spentSum] = await Promise.all([
      db.pointTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.pointTransaction.aggregate({ where: { userId: user.id, amount: { gt: 0 } }, _sum: { amount: true } }),
      db.pointTransaction.aggregate({ where: { userId: user.id, amount: { lt: 0 } }, _sum: { amount: true } }),
    ])

    const totalEarned = (earnedSum._sum.amount ?? 0) as number
    const totalSpent = Math.abs((spentSum._sum.amount ?? 0) as number)

    return NextResponse.json({
      success: true,
      data: { balance: user.loyaltyPoints, totalEarned, totalSpent, transactions },
    })
  } catch (error) {
    console.error('Loyalty GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

const redeemSchema = z.object({ points: z.number().int().min(1) })

// POST: Redeem points (simple flow)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const parsed = redeemSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })

    const points = parsed.data.points
    if (points > user.loyaltyPoints) return NextResponse.json({ success: false, error: 'Insufficient points' }, { status: 400 })

    const result = await db.$transaction(async (tx) => {
      const pointTx = await tx.pointTransaction.create({ data: { userId: user.id, amount: -points, type: 'redemption', reference: null } })
      const updatedUser = await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: { decrement: points } }, select: { id: true, loyaltyPoints: true } })
      await tx.notification.create({ data: { userId: user.id, title: 'Points Redeemed', body: `You redeemed ${points} points for ৳${points} discount.`, type: 'info' } })
      return { pointTx, updatedUser }
    })

    return NextResponse.json({ success: true, data: { redeemedPoints: points, newBalance: result.updatedUser.loyaltyPoints, transaction: result.pointTx } })
  } catch (error) {
    console.error('Loyalty POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
