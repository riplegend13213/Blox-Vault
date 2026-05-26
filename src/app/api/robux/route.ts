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

// GET: List active Robux packages (sorted by sortOrder)
export async function GET() {
  try {
    const packages = await db.robuxPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: { packages },
    })
  } catch (error) {
    console.error('Robux packages list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const createRobuxOrderSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  paymentMethod: z.enum([
    'bkash',
    'nagad',
    'rocket',
    'usdt',
    'btc',
    'eth',
    'bnb',
    'ltc',
  ]),
  transactionId: z.string().optional(),
  robloxUsername: z.string().min(1, 'Roblox username is required'),
})

// POST: Create a Robux order
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
    const parsed = createRobuxOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { packageId, paymentMethod, transactionId, robloxUsername } =
      parsed.data

    // Verify package exists and is active
    const robuxPackage = await db.robuxPackage.findUnique({
      where: { id: packageId },
    })

    if (!robuxPackage || !robuxPackage.active) {
      return NextResponse.json(
        { success: false, error: 'Robux package not found or inactive' },
        { status: 404 }
      )
    }

    const total = robuxPackage.priceBdt
    const pointsEarned = Math.floor(total / 100)

    // Create order, loyalty points transaction, and notification in a transaction
    const order = await db.$transaction(async (tx) => {
      const robuxOrder = await tx.robuxOrder.create({
        data: {
          userId: user.id,
          packageId,
          robuxAmount: robuxPackage.amount + robuxPackage.bonus,
          paymentMethod,
          transactionId: transactionId || null,
          robloxUsername,
          total,
          status: 'pending_payment',
        },
        include: {
          package: true,
        },
      })

      // Award loyalty points if any earned
      if (pointsEarned > 0) {
        await tx.pointTransaction.create({
          data: {
            userId: user.id,
            amount: pointsEarned,
            type: 'purchase_earn',
            reference: robuxOrder.id,
          },
        })

        await tx.user.update({
          where: { id: user.id },
          data: { loyaltyPoints: { increment: pointsEarned } },
        })
      }

      // Create notification for the user
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Robux Order Created',
          body: `Your order for ${robuxPackage.amount + robuxPackage.bonus} Robux has been created. Please complete payment.`,
          type: 'order',
        },
      })

      return robuxOrder
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          order,
          pointsEarned,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create robux order error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
