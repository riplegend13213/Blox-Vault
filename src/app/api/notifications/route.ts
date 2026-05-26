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

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
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

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = markReadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: zodFirstError(parsed.error) }, { status: 400 })
    }

    const { notificationIds, markAll } = parsed.data

    if (markAll) {
      await db.notification.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: { read: true },
      })

      return NextResponse.json({
        success: true,
        data: { message: 'All notifications marked as read' },
      })
    }

    if (notificationIds && notificationIds.length > 0) {
      // Verify the notifications belong to the user
      const userNotifications = await db.notification.findMany({
        where: {
          id: { in: notificationIds },
          userId: user.id,
        },
        select: { id: true },
      })

      const validIds = userNotifications.map((n) => n.id)

      if (validIds.length > 0) {
        await db.notification.updateMany({
          where: { id: { in: validIds } },
          data: { read: true },
        })
      }

      return NextResponse.json({
        success: true,
        data: { message: `${validIds.length} notification(s) marked as read` },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Provide notificationIds or markAll' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
