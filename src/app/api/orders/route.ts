import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { zodFirstError } from '@/lib/validation'
import { db } from '@/lib/db'
import { sendDiscordEmbed } from '@/lib/discord'

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
  proofImage: z.string().optional(),
  robloxUsername: z.string().optional(),
  discordUsername: z.string().optional(),
  friendRequestSent: z.boolean().optional(),
  accountDeliveryMethod: z.enum(['discord', 'support_ticket']).optional(),
  usePoints: z.boolean().optional(),
  pointsToUse: z.number().int().min(0).optional(),
  eidOfferApplied: z.boolean().optional(),
  eidDiscountAmount: z.number().min(0).optional(),
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

    // Support JSON and multipart/form-data (file uploads)
    let body: any
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const maybeFile = form.get('proof') || form.get('proofImage')
      let proofImage: string | undefined
      if (maybeFile && (maybeFile as any).arrayBuffer) {
        const file = maybeFile as File
        const buffer = Buffer.from(await file.arrayBuffer())
        proofImage = `data:${file.type};base64,${buffer.toString('base64')}`
      }
      body = Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : undefined]))
      if (proofImage) body.proofImage = proofImage
      // Coerce common types from form data
      if (typeof body.friendRequestSent === 'string') {
        body.friendRequestSent = body.friendRequestSent === 'true'
      }
      if (typeof body.usePoints === 'string') {
        body.usePoints = body.usePoints === 'true'
      }
      if (typeof body.pointsToUse === 'string') {
        const n = Number(body.pointsToUse)
        body.pointsToUse = Number.isFinite(n) ? n : undefined
      }
      if (typeof body.eidOfferApplied === 'string') {
        body.eidOfferApplied = body.eidOfferApplied === 'true'
      }
      if (typeof body.eidDiscountAmount === 'string') {
        const n = Number(body.eidDiscountAmount)
        body.eidDiscountAmount = Number.isFinite(n) ? n : undefined
      }
    } else {
      body = await request.json()
    }
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { productId, paymentMethod, transactionId, robloxUsername, discordUsername, friendRequestSent, accountDeliveryMethod, usePoints, pointsToUse, eidOfferApplied, eidDiscountAmount } = parsed.data

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

    const effectiveDeliveryMethod = product.category === 'account'
      ? accountDeliveryMethod || 'discord'
      : 'discord'

    if (product.category === 'account' && effectiveDeliveryMethod === 'discord') {
      if (!discordUsername || !discordUsername.trim()) {
        return NextResponse.json(
          { success: false, error: 'Discord username is required for Discord delivery' },
          { status: 400 }
        )
      }
      if (!friendRequestSent) {
        return NextResponse.json(
          { success: false, error: 'You must send a friend request to the seller before purchasing' },
          { status: 400 }
        )
      }
    }

    let supportTicket: { id: string } | null = null

    if (product.category === 'account' && effectiveDeliveryMethod === 'support_ticket') {
      supportTicket = await db.supportTicket.create({
        data: {
          userId: user.id,
          subject: `Account order support: ${product.name}`,
          status: 'open',
        },
      })

      await db.ticketMessage.create({
        data: {
          ticketId: supportTicket.id,
          senderId: user.id,
          message: `I placed an order for ${product.name}. Payment method: ${paymentMethod}. Transaction ID: ${transactionId || 'N/A'}. Discord: ${discordUsername || 'N/A'}. Please assist with account delivery.`,
          isAdmin: false,
        },
      })
    }

    // Calculate discount from points if requested (1 point = ৳1)
    let pointsUsed = 0
    let pointsDiscount = 0
    if (usePoints && typeof pointsToUse === 'number') {
      pointsUsed = Math.max(0, Math.floor(pointsToUse))
      // Cap to product price
      pointsDiscount = Math.min(pointsUsed, Math.floor(product.priceBdt))
    }

    // Eid discount (BDT amount) if provided
    let eidApplied = false
    let eidDiscount = 0
    if (eidOfferApplied) {
      eidApplied = true
      // Prefer admin-configured eid discount from payment settings
      try {
        const setting = await db.paymentSetting.findUnique({ where: { key: 'eid_discount' } })
        if (setting && setting.value) {
          const n = Number(setting.value)
          if (Number.isFinite(n)) {
            eidDiscount = Math.max(0, Math.floor(n))
          }
        } else if (typeof eidDiscountAmount === 'number') {
          eidDiscount = Math.max(0, Math.floor(eidDiscountAmount))
        }
      } catch (e) {
        if (typeof eidDiscountAmount === 'number') {
          eidDiscount = Math.max(0, Math.floor(eidDiscountAmount))
        }
      }
      // cap to product price minus points discount
      eidDiscount = Math.min(eidDiscount, Math.floor(product.priceBdt) - pointsDiscount)
    }

    const order = await db.order.create({
      data: {
        userId: user.id,
        productId,
        proofImage: parsed.data.proofImage || null,
        paymentMethod,
        transactionId: transactionId || null,
        robloxUsername: robloxUsername || null,
        discordUsername: discordUsername || null,
        friendRequestSent: friendRequestSent || false,
        accountDeliveryMethod: product.category === 'account' ? effectiveDeliveryMethod : null,
        supportTicketId: supportTicket?.id || null,
        total: product.priceBdt - pointsDiscount - eidDiscount,
        status: 'pending_payment',
        deliveryStatus: 'pending',
        pointsEarned: 0,
        pointsUsed,
        pointsDiscount,
        eidOfferApplied: eidApplied,
        eidDiscount,
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

    // If transaction or proof provided at creation, send a webhook to staff
    if (transactionId || parsed.data.proofImage) {
      try {
        const customer = await db.user.findUnique({ where: { id: user.id }, select: { username: true, email: true } })
        const fields: any[] = [
          { name: 'Payment Method', value: paymentMethod },
          ...(transactionId ? [{ name: 'Transaction ID', value: transactionId }] : []),
          { name: 'Customer', value: `${customer?.username ?? 'Unknown'} (${customer?.email ?? 'N/A'})` },
        ]
        if (robloxUsername) fields.push({ name: 'Roblox User', value: robloxUsername, inline: true })
        if (discordUsername) fields.push({ name: 'Discord User', value: discordUsername, inline: true })

        await sendDiscordEmbed({
          title: `New order with proof — #${order.id.slice(-8)}`,
          description: `Product: ${product.name}`,
          fields,
          imageUrl: parsed.data.proofImage || undefined,
        })
      } catch (e) {
        console.error('Failed to send webhook for new order with proof:', e)
      }
    }

    // If points were used, perform point deduction and record transaction
    if (pointsUsed > 0) {
      try {
        const currentUser = await db.user.findUnique({ where: { id: user.id }, select: { loyaltyPoints: true } })
        if (!currentUser || pointsUsed > currentUser.loyaltyPoints) {
          console.warn('Insufficient points at finalization for user', user.id)
        } else {
          await db.$transaction(async (tx) => {
            await tx.pointTransaction.create({ data: { userId: user.id, amount: -pointsUsed, type: 'redemption', reference: order.id } })
            await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: { decrement: pointsUsed } } })
            await tx.notification.create({ data: { userId: user.id, title: 'Points Used', body: `You used ${pointsUsed} points for ৳${pointsDiscount} discount on order #${order.id.slice(-8)}.`, type: 'info' } })
          })
        }
      } catch (e) {
        console.error('Failed to apply loyalty points on order create:', e)
      }
    }

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
