import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { zodFirstError } from '@/lib/validation'
import { db } from '@/lib/db'
import { sendDiscordEmbed } from '@/lib/discord'
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
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Prisma.OrderWhereInput = {}

    if (status) {
      where.status = status
    }

    if (userId) {
      where.userId = userId
    }

    if (search) {
      where.OR = [
        { id: { contains: search } },
        { transactionId: { contains: search } },
        { user: { username: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      db.order.findMany({
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
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
              images: true,
              priceBdt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
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
    console.error('Admin orders GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const updateOrderAdminSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  status: z
    .enum([
      'pending_payment',
      'under_review',
      'confirmed',
      'processing',
      'delivered',
      'cancelled',
    ])
    .optional(),
  deliveryStatus: z
    .enum(['pending', 'preparing', 'in_transit', 'delivered'])
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
    const parsed = updateOrderAdminSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { orderId, ...updateData } = parsed.data

    const order = await db.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Clean null values - use undefined for fields not being updated
    const cleanData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanData[key] = value
      }
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: cleanData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            images: true,
            priceBdt: true,
          },
        },
      },
    })

    // Send notification to the customer about status change
    if (parsed.data.status) {
      const statusMessages: Record<string, string> = {
        pending_payment: 'Your order is awaiting payment.',
        under_review: 'Your payment is being reviewed.',
        confirmed: 'Your payment has been confirmed!',
        processing: 'Your order is being processed.',
        delivered: 'Your order has been delivered! Enjoy!',
        cancelled: 'Your order has been cancelled.',
      }

      await db.notification.create({
        data: {
          userId: order.userId,
          title: 'Order Status Update',
          body: statusMessages[parsed.data.status] || 'Your order status has been updated.',
          type: 'order',
        },
      })
      // send webhook with order and customer info
      try {
        const customer = (await db.user.findUnique({ where: { id: order.userId }, select: { username: true, email: true } }))
        await sendDiscordEmbed({
          title: `Admin updated order #${orderId.slice(-8)}`,
          description: `Product: ${updatedOrder.product.name}`,
          fields: [
            { name: 'Customer', value: `${customer?.username ?? 'Unknown'} (${customer?.email ?? 'N/A'})` },
            { name: 'Status', value: String(parsed.data.status) },
          ],
        })
      } catch (e) {
        console.error('Webhook admin order status error:', e)
      }
    }

    if (parsed.data.deliveryStatus) {
      const deliveryMessages: Record<string, string> = {
        pending: 'Delivery is pending.',
        preparing: 'Your order is being prepared for delivery.',
        in_transit: 'Your order is in transit!',
        delivered: 'Your order has been delivered!',
      }

      await db.notification.create({
        data: {
          userId: order.userId,
          title: 'Delivery Status Update',
          body: deliveryMessages[parsed.data.deliveryStatus] || 'Your delivery status has been updated.',
          type: 'order',
        },
      })
      try {
        const customer = (await db.user.findUnique({ where: { id: order.userId }, select: { username: true, email: true } }))
        await sendDiscordEmbed({
          title: `Delivery update for order #${orderId.slice(-8)}`,
          description: `Product: ${updatedOrder.product.name}`,
          fields: [
            { name: 'Customer', value: `${customer?.username ?? 'Unknown'} (${customer?.email ?? 'N/A'})` },
            { name: 'Delivery', value: String(parsed.data.deliveryStatus) },
          ],
        })
      } catch (e) {
        console.error('Webhook admin delivery status error:', e)
      }
    }

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error('Admin orders PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
