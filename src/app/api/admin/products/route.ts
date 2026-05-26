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

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug must be at most 200 characters').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum([
    'permanent_fruit',
    'physical_fruit',
    'gamepass',
    'fruit_storage',
    'account',
    'raid_service',
    'leveling',
    'boosting',
    'custom',
  ]),
  stock: z.coerce.number().int().min(0, 'Stock must be non-negative').default(0),
  priceBdt: z.coerce.number().positive('Price must be positive'),
  priceCrypto: z.coerce.number().positive('Crypto price must be positive').optional().nullable(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical']).optional(),
  images: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  deliveryInfo: z.string().optional().nullable(),
  active: z.boolean().default(true),
})

const updateProductSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(1).optional(),
  category: z.enum([
    'permanent_fruit',
    'physical_fruit',
    'gamepass',
    'fruit_storage',
    'account',
    'raid_service',
    'leveling',
    'boosting',
    'custom',
  ]).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  priceBdt: z.coerce.number().positive().optional(),
  priceCrypto: z.coerce.number().positive().optional().nullable(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical']).optional().nullable(),
  images: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  deliveryInfo: z.string().optional().nullable(),
  active: z.boolean().optional(),
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
    const parsed = createProductSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Product validation failed (create):', parsed.error.issues)
      const errMsg = parsed.error?.issues?.[0]?.message || parsed.error?.message || 'Invalid input'
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Check if slug already exists
    const existingSlug = await db.product.findUnique({
      where: { slug: data.slug },
    })

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: 'A product with this slug already exists' },
        { status: 409 }
      )
    }

    const product = await db.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category,
        stock: data.stock,
        priceBdt: data.priceBdt,
        priceCrypto: data.priceCrypto || null,
        rarity: data.rarity || null,
        images: JSON.stringify(data.images),
        featured: data.featured,
        deliveryInfo: data.deliveryInfo || null,
        active: data.active,
      },
    })

    return NextResponse.json(
      { success: true, data: { product } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Admin create product error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Product validation failed (update):', parsed.error.issues)
      const errMsg = parsed.error?.issues?.[0]?.message || parsed.error?.message || 'Invalid input'
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: 400 }
      )
    }

    const { id, ...updateData } = parsed.data

    // Check product exists
    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // If slug is being changed, check for conflicts
    if (updateData.slug && updateData.slug !== existing.slug) {
      const slugConflict = await db.product.findUnique({
        where: { slug: updateData.slug },
      })
      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: 'A product with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data - handle JSON fields
    const prismaData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (key === 'images' && Array.isArray(value)) {
        prismaData[key] = JSON.stringify(value)
      } else {
        prismaData[key] = value
      }
    }

    const product = await db.product.update({
      where: { id },
      data: prismaData,
    })

    return NextResponse.json({
      success: true,
      data: { product },
    })
  } catch (error) {
    console.error('Admin update product error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
