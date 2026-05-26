import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { zodFirstError } from '@/lib/validation'
import { db } from '@/lib/db'

import { verifySession, isSessionSigningEnabled } from '@/lib/session'

async function requireAdmin() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('bv_session')
  if (!raw) return null
  const sessionValue = (raw as any)?.value ?? raw

  let userId = String(sessionValue)
  if (isSessionSigningEnabled) {
    const verified = verifySession(String(sessionValue))
    if (!verified) return null
    userId = verified
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, banned: true },
  })

  if (!user || user.banned || user.role !== 'admin') return null
  return user
}

// GET: List all announcements
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const announcements = await db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: { announcements },
    })
  } catch (error) {
    console.error('Admin announcements GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create announcement
const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  type: z
    .enum(['info', 'promo', 'warning', 'update'])
    .default('info'),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  active: z.boolean().default(true),
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
    const parsed = createAnnouncementSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const announcement = await db.announcement.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        type: parsed.data.type,
        startDate: parsed.data.startDate
          ? new Date(parsed.data.startDate)
          : new Date(),
        endDate: parsed.data.endDate
          ? new Date(parsed.data.endDate)
          : null,
        active: parsed.data.active,
      },
    })

    return NextResponse.json(
      { success: true, data: { announcement } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create announcement error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update announcement
const updateAnnouncementSchema = z.object({
  announcementId: z.string().min(1, 'Announcement ID is required'),
  title: z.string().min(1, 'Title is required').optional(),
  body: z.string().min(1, 'Body is required').optional(),
  type: z.enum(['info', 'promo', 'warning', 'update']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  active: z.boolean().optional(),
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
    const parsed = updateAnnouncementSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { announcementId, ...updateData } = parsed.data

    const existing = await db.announcement.findUnique({
      where: { id: announcementId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Build clean update data with date conversions
    const cleanData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        if (key === 'startDate' && typeof value === 'string') {
          cleanData[key] = new Date(value)
        } else if (key === 'endDate' && typeof value === 'string') {
          cleanData[key] = new Date(value)
        } else if (key === 'endDate' && value === null) {
          cleanData[key] = null
        } else {
          cleanData[key] = value
        }
      }
    }

    const updatedAnnouncement = await db.announcement.update({
      where: { id: announcementId },
      data: cleanData,
    })

    return NextResponse.json({
      success: true,
      data: { announcement: updatedAnnouncement },
    })
  } catch (error) {
    console.error('Update announcement error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete announcement
const deleteAnnouncementSchema = z.object({
  announcementId: z.string().min(1, 'Announcement ID is required'),
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
    const parsed = deleteAnnouncementSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { announcementId } = parsed.data

    const existing = await db.announcement.findUnique({
      where: { id: announcementId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    await db.announcement.delete({
      where: { id: announcementId },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Announcement deleted successfully' },
    })
  } catch (error) {
    console.error('Delete announcement error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
