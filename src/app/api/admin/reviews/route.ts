import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
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
    const productId = searchParams.get('productId')
    const userId = searchParams.get('userId')
    const rating = searchParams.get('rating')
    const verified = searchParams.get('verified')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Prisma.ReviewWhereInput = {}

    if (productId) {
      where.productId = productId
    }

    if (userId) {
      where.userId = userId
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    if (verified === 'true') {
      where.verifiedPurchase = true
    } else if (verified === 'false') {
      where.verifiedPurchase = false
    }

    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      db.review.findMany({
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
            },
          },
        },
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
    console.error('Admin reviews GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const deleteReviewSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
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

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('reviewId')

    if (!id) {
      // Try to get from body for DELETE
      const body = await request.json().catch(() => ({}))
      const parsed = deleteReviewSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Review ID is required' },
          { status: 400 }
        )
      }
      id = parsed.data.reviewId
    }

    const review = await db.review.findUnique({
      where: { id },
    })

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      )
    }

    await db.review.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Review deleted successfully' },
    })
  } catch (error) {
    console.error('Admin delete review error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
