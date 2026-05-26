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
    select: { id: true, role: true, banned: true },
  })

  if (!user || user.banned) return null
  return user
}

const createOrderSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
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
})

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const orders = await db.order.findMany({
      where: { userId: user.id },
      include: {
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
    })

    return NextResponse.json({
      success: true,
      data: { orders },
    })
  } catch (error) {
    console.error('Orders list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { productId, paymentMethod, transactionId } = parsed.data

    // Verify product exists and is active
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product || !product.active) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.stock <= 0) {
      return NextResponse.json(
        { success: false, error: 'Product is out of stock' },
        { status: 400 }
      )
    }

    const order = await db.order.create({
      data: {
        userId: user.id,
        productId,
        paymentMethod,
        transactionId: transactionId || null,
        total: product.priceBdt,
        status: 'pending_payment',
        deliveryStatus: 'pending',
      },
      include: {
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

    // Create notification for the user
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Order Created',
        body: `Your order for ${product.name} has been created. Please complete payment.`,
        type: 'order',
      },
    })

    return NextResponse.json(
      { success: true, data: { order } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
