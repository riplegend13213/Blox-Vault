import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { reviews: true, wishlistItems: true },
        },
      },
    })

    if (!product || !product.active) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const { reviews, _count, ...rest } = product
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0

    return NextResponse.json({
      success: true,
      data: {
        product: {
          ...rest,
          avgRating: Math.round(avgRating * 10) / 10,
          reviewCount: _count.reviews,
          wishlistCount: _count.wishlistItems,
          reviews,
        },
      },
    })
  } catch (error) {
    console.error('Product detail error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
