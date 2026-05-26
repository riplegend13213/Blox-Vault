import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List active announcements (active=true AND startDate <= now AND (endDate is null OR endDate > now))
export async function GET() {
  try {
    const now = new Date()

    const announcements = await db.announcement.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: { announcements },
    })
  } catch (error) {
    console.error('Announcements list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
