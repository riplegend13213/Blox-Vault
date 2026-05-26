import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
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

// GET: List user's Robux orders with package info
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const orders = await db.robuxOrder.findMany({
      where: { userId: user.id },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            amount: true,
            bonus: true,
            priceBdt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: { orders },
    })
  } catch (error) {
    console.error('Robux orders list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
