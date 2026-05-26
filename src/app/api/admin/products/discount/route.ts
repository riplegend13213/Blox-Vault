import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
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

const applySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  discountPercent: z
    .number()
    .min(0, 'Discount must be >= 0')
    .max(100, 'Discount must be <= 100'),
  expiresAt: z.string().optional().nullable(),
})

const removeSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const body = await request.json()
    const parsed = applySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error?.issues?.[0]?.message || parsed.error?.message || 'Invalid input'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }

    const { productId, discountPercent, expiresAt } = parsed.data
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })

    // Save originalPrice if not set
    const original = product.originalPrice ?? product.priceBdt

    const discounted = Math.round((original * (1 - discountPercent / 100)) * 100) / 100

    const updated = await db.product.update({
      where: { id: productId },
      data: {
        originalPrice: original,
        priceBdt: discounted,
        isFlashDeal: true,
        flashDealEndsAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({ success: true, data: { product: updated } })
  } catch (error) {
    console.error('Apply discount error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const body = await request.json()
    const parsed = removeSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error?.issues?.[0]?.message || parsed.error?.message || 'Invalid input'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }

    const { productId } = parsed.data
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })

    const restoredPrice = product.originalPrice ?? product.priceBdt

    const updated = await db.product.update({
      where: { id: productId },
      data: {
        priceBdt: restoredPrice,
        originalPrice: null,
        isFlashDeal: false,
        flashDealEndsAt: null,
      },
    })

    return NextResponse.json({ success: true, data: { product: updated } })
  } catch (error) {
    console.error('Remove discount error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
