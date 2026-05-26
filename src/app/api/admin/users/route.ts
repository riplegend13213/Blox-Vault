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
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const banned = searchParams.get('banned')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Prisma.UserWhereInput = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (role) {
      where.role = role
    }

    if (banned === 'true') {
      where.banned = true
    } else if (banned === 'false') {
      where.banned = false
    }

    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          banned: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
              supportTickets: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const banUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  banned: z.boolean(),
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
    const parsed = banUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { userId, banned } = parsed.data

    // Don't allow banning yourself
    if (userId === admin.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot ban yourself' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Don't allow banning other admins
    if (user.role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot ban admin users' },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { banned },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
      },
    })

    // If banning, also clear their session by creating a notification
    if (banned) {
      await db.notification.create({
        data: {
          userId,
          title: 'Account Banned',
          body: 'Your account has been banned by an administrator. Please contact support if you believe this is an error.',
          type: 'system',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
    })
  } catch (error) {
    console.error('Admin ban user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
