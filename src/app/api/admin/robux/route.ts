import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { zodFirstError } from '@/lib/validation'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

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

// GET: List all Robux orders with user info and package details
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Prisma.RobuxOrderWhereInput = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { transactionId: { contains: search } },
        { robloxUsername: { contains: search } },
        { user: { username: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      db.robuxOrder.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
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
        skip,
        take: limit,
      }),
      db.robuxOrder.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Admin robux orders GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update Robux order status
const updateRobuxOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z
    .enum([
      'pending_payment',
      'under_review',
      'processing',
      'delivered',
      'cancelled',
    ])
    .optional(),
  adminNote: z.string().optional().nullable(),
})

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateRobuxOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { orderId, ...updateData } = parsed.data

    const order = await db.robuxOrder.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Robux order not found' },
        { status: 404 }
      )
    }

    // Build clean update data
    const cleanData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanData[key] = value
      }
    }

    const updatedOrder = await db.robuxOrder.update({
      where: { id: orderId },
      data: cleanData,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        package: true,
      },
    })

    // Send notification about status change
    if (parsed.data.status) {
      const statusMessages: Record<string, string> = {
        pending_payment: 'Your Robux order is awaiting payment.',
        under_review: 'Your Robux order payment is being reviewed.',
        processing: 'Your Robux order is being processed.',
        delivered: 'Your Robux has been delivered! Enjoy!',
        cancelled: 'Your Robux order has been cancelled.',
      }

      await db.notification.create({
        data: {
          userId: order.userId,
          title: 'Robux Order Status Update',
          body:
            statusMessages[parsed.data.status] ||
            'Your Robux order status has been updated.',
          type: 'order',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error('Admin robux order PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create new Robux package
const createRobuxPackageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().int().min(1, 'Robux amount must be at least 1'),
  priceBdt: z.number().min(0.01, 'Price must be greater than 0'),
  priceCrypto: z.number().optional().nullable(),
  bonus: z.number().int().default(0),
  popular: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createRobuxPackageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const robuxPackage = await db.robuxPackage.create({
      data: {
        name: parsed.data.name,
        amount: parsed.data.amount,
        priceBdt: parsed.data.priceBdt,
        priceCrypto: parsed.data.priceCrypto ?? null,
        bonus: parsed.data.bonus,
        popular: parsed.data.popular,
        active: parsed.data.active,
        sortOrder: parsed.data.sortOrder,
      },
    })

    return NextResponse.json(
      { success: true, data: { package: robuxPackage } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create robux package error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update Robux package
const updateRobuxPackageSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  name: z.string().min(1, 'Name is required').optional(),
  amount: z.number().int().min(1, 'Robux amount must be at least 1').optional(),
  priceBdt: z.number().min(0.01, 'Price must be greater than 0').optional(),
  priceCrypto: z.number().optional().nullable(),
  bonus: z.number().int().optional(),
  popular: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateRobuxPackageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { packageId, ...updateData } = parsed.data

    const existing = await db.robuxPackage.findUnique({
      where: { id: packageId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Robux package not found' },
        { status: 404 }
      )
    }

    // Build clean update data - remove undefined fields
    const cleanData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanData[key] = value
      }
    }

    const updatedPackage = await db.robuxPackage.update({
      where: { id: packageId },
      data: cleanData,
    })

    return NextResponse.json({
      success: true,
      data: { package: updatedPackage },
    })
  } catch (error) {
    console.error('Update robux package error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
