import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const rarity = searchParams.get('rarity')

    const where: Prisma.ProductWhereInput = {
      active: true,
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (featured === 'true') {
      where.featured = true
    }

    if (rarity) {
      where.rarity = rarity
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {}
    switch (sort) {
      case 'price_low':
        orderBy.priceBdt = 'asc'
        break
      case 'price_high':
        orderBy.priceBdt = 'desc'
        break
      case 'name_asc':
        orderBy.name = 'asc'
        break
      case 'name_desc':
        orderBy.name = 'desc'
        break
      case 'newest':
      default:
        orderBy.createdAt = 'desc'
        break
    }

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          reviews: {
            select: { rating: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
      }),
      db.product.count({ where }),
    ])

    const productsWithRating = products.map((product) => {
      const { reviews, _count, ...rest } = product
      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0

      return {
        ...rest,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: _count.reviews,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        products: productsWithRating,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Products list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
