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

const wishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
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

    const wishlist = await db.wishlistItem.findMany({
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
            priceCrypto: true,
            rarity: true,
            stock: true,
            active: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: { wishlist },
    })
  } catch (error) {
    console.error('Wishlist GET error:', error)
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
    const parsed = wishlistSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { productId } = parsed.data

    // Check product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product || !product.active) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if already in wishlist
    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Product already in wishlist' },
        { status: 409 }
      )
    }

    const wishlistItem = await db.wishlistItem.create({
      data: {
        userId: user.id,
        productId,
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

    return NextResponse.json(
      { success: true, data: { wishlistItem } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const wishlistItem = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    })

    if (!wishlistItem) {
      return NextResponse.json(
        { success: false, error: 'Item not found in wishlist' },
        { status: 404 }
      )
    }

    await db.wishlistItem.delete({
      where: { id: wishlistItem.id },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Removed from wishlist' },
    })
  } catch (error) {
    console.error('Wishlist DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
