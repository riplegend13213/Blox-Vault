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

const createReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  review: z.string().min(1, 'Review text is required').max(1000, 'Review must be at most 1000 characters'),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}
    if (productId) {
      where.productId = productId
    }

    // Only show verified reviews on public listing
    if (!productId) {
      where.verifiedPurchase = true
    }

    const skip = (page - 1) * limit

    const includeClause: any = {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    }

    // Include product info when listing all reviews (no productId filter)
    if (!productId) {
      includeClause.product = {
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
        },
      }
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: includeClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.review.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Reviews list error:', error)
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
    const parsed = createReviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { productId, rating, review } = parsed.data

    // Check if product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if user has purchased this product (verified purchase)
    const hasPurchased = await db.order.findFirst({
      where: {
        userId: user.id,
        productId,
        status: 'delivered',
      },
    })

    // Check if user already reviewed this product
    const existingReview = await db.review.findFirst({
      where: {
        userId: user.id,
        productId,
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    const newReview = await db.review.create({
      data: {
        userId: user.id,
        productId,
        rating,
        review,
        verifiedPurchase: !!hasPurchased,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json(
      { success: true, data: { review: newReview } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
