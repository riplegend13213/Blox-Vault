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

async function sendDiscordWebhook(message: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  })
}

const updateOrderSchema = z.object({
  proofImage: z.string().optional(),
  transactionId: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Find the order
    const order = await db.order.findUnique({
      where: { id },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Users can only update their own orders (for proof upload)
    // Admins can update any order
    if (user.role !== 'admin' && order.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Regular users can only upload proof and add transaction ID
    if (user.role !== 'admin') {
      const parsed = updateOrderSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: zodFirstError(parsed.error) },
          { status: 400 }
        )
      }

      const { proofImage, transactionId } = parsed.data
      const updateData: Record<string, unknown> = {}

      if (proofImage) {
        updateData.proofImage = proofImage
        // Auto-advance status if payment proof is uploaded
        if (order.status === 'pending_payment') {
          updateData.status = 'under_review'
        }
      }

      if (transactionId) {
        updateData.transactionId = transactionId
      }

      const updatedOrder = await db.order.update({
        where: { id },
        data: updateData,
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

      // Create notification
      if (proofImage && order.status === 'pending_payment') {
        await db.notification.create({
          data: {
            userId: user.id,
            title: 'Payment Proof Submitted',
            body: `Payment proof for order #${id.slice(-8)} has been submitted and is under review.`,
            type: 'payment',
          },
        })

        const webhookMessage = `🧾 Payment proof uploaded for order #${id.slice(-8)}\n` +
          `Product: ${updatedOrder.product.name}\n` +
          `Method: ${updatedOrder.paymentMethod}\n` +
          `Discord: ${updatedOrder.discordUsername ?? 'N/A'}\n` +
          `Roblox: ${updatedOrder.robloxUsername ?? 'N/A'}\n` +
          `Proof: ${updatedOrder.proofImage}`

        await sendDiscordWebhook(webhookMessage)
      }

      return NextResponse.json({
        success: true,
        data: { order: updatedOrder },
      })
    }

    // Admin update - can update status, delivery status, admin note
    const adminUpdateSchema = z.object({
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
      adminNote: z.string().optional(),
      proofImage: z.string().optional(),
    })

    const parsed = adminUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { ...parsed.data }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
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
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    })

    // Create notification for the customer about status change
    if (parsed.data.status || parsed.data.deliveryStatus) {
      const statusMessages: Record<string, string> = {
        pending_payment: 'Your order is awaiting payment.',
        under_review: 'Your payment is being reviewed.',
        confirmed: 'Your payment has been confirmed!',
        processing: 'Your order is being processed.',
        delivered: 'Your order has been delivered! Enjoy!',
        cancelled: 'Your order has been cancelled.',
      }

      const deliveryMessages: Record<string, string> = {
        pending: 'Delivery is pending.',
        preparing: 'Your order is being prepared for delivery.',
        in_transit: 'Your order is in transit!',
        delivered: 'Your order has been delivered!',
      }

      let title = 'Order Update'
      let notifBody = ''

      if (parsed.data.status && statusMessages[parsed.data.status]) {
        title = 'Order Status Update'
        notifBody = statusMessages[parsed.data.status]
      } else if (parsed.data.deliveryStatus && deliveryMessages[parsed.data.deliveryStatus]) {
        title = 'Delivery Status Update'
        notifBody = deliveryMessages[parsed.data.deliveryStatus]
      }

      if (notifBody) {
        await db.notification.create({
          data: {
            userId: order.userId,
            title,
            body: notifBody,
            type: 'order',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder },
    })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
