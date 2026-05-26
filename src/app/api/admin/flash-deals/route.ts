import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { zodFirstError } from '@/lib/validation'
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

// POST: Create a flash deal (productId, discountPrice, endsAt)
const createFlashDealSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  discountPrice: z.number().min(0.01, 'Discount price must be greater than 0'),
  endsAt: z.string().min(1, 'End date is required'),
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
    const parsed = createFlashDealSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { productId, discountPrice, endsAt } = parsed.data

    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (discountPrice >= product.priceBdt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Discount price must be less than the current product price',
        },
        { status: 400 }
      )
    }

    const endDate = new Date(endsAt)
    if (endDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'End date must be in the future' },
        { status: 400 }
      )
    }

    // Store the current price as originalPrice, set new price and flash deal fields
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        isFlashDeal: true,
        flashDealEndsAt: endDate,
        originalPrice: product.priceBdt,
        priceBdt: discountPrice,
      },
    })

    return NextResponse.json({
      success: true,
      data: { product: updatedProduct },
    })
  } catch (error) {
    console.error('Create flash deal error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update flash deal (productId, isFlashDeal, flashDealEndsAt, originalPrice)
const updateFlashDealSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  isFlashDeal: z.boolean().optional(),
  flashDealEndsAt: z.string().optional().nullable(),
  originalPrice: z.number().optional().nullable(),
  discountPrice: z.number().min(0.01, 'Discount price must be greater than 0').optional(),
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
    const parsed = updateFlashDealSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { productId, discountPrice, ...updateData } = parsed.data

    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Build clean update data with date conversions
    const cleanData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        if (key === 'flashDealEndsAt' && typeof value === 'string') {
          cleanData[key] = new Date(value)
        } else if (key === 'flashDealEndsAt' && value === null) {
          cleanData[key] = null
        } else if (key === 'originalPrice' && value === null) {
          cleanData[key] = null
        } else {
          cleanData[key] = value
        }
      }
    }

    // If discountPrice is provided, update the product price
    if (discountPrice !== undefined) {
      cleanData['priceBdt'] = discountPrice
      // Set originalPrice if not already set
      if (!product.originalPrice && !updateData.originalPrice) {
        cleanData['originalPrice'] = product.priceBdt
      }
    }

    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: cleanData,
    })

    return NextResponse.json({
      success: true,
      data: { product: updatedProduct },
    })
  } catch (error) {
    console.error('Update flash deal error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Remove flash deal status from product
const deleteFlashDealSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
})

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = deleteFlashDealSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { productId } = parsed.data

    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Restore original price if available, then remove flash deal fields
    const restoredPrice = product.originalPrice ?? product.priceBdt

    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        isFlashDeal: false,
        flashDealEndsAt: null,
        originalPrice: null,
        priceBdt: restoredPrice,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        product: updatedProduct,
        message: 'Flash deal removed and original price restored',
      },
    })
  } catch (error) {
    console.error('Delete flash deal error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
