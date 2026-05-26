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

const addMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be at most 5000 characters'),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Users can only see their own tickets, admins can see all
    if (user.role !== 'admin' && ticket.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ticket },
    })
  } catch (error) {
    console.error('Ticket detail error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Users can only message on their own tickets, admins can message on any
    if (user.role !== 'admin' && ticket.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Don't allow messages on closed tickets
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Cannot add messages to a closed ticket' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = addMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { message } = parsed.data
    const isAdmin = user.role === 'admin'

    const ticketMessage = await db.ticketMessage.create({
      data: {
        ticketId: id,
        senderId: user.id,
        message,
        isAdmin,
      },
    })

    // Update ticket status
    if (isAdmin) {
      // Admin replying sets status to in_progress
      await db.supportTicket.update({
        where: { id },
        data: { status: 'in_progress' },
      })
    } else {
      // User replying to an in_progress ticket sets it back to open
      if (ticket.status === 'in_progress') {
        await db.supportTicket.update({
          where: { id },
          data: { status: 'open' },
        })
      }
    }

    // Create notification for the other party
    if (isAdmin) {
      await db.notification.create({
        data: {
          userId: ticket.userId,
          title: 'Support Ticket Reply',
          body: `Admin replied to your ticket "${ticket.subject}"`,
          type: 'support',
        },
      })
    }

    return NextResponse.json(
      { success: true, data: { message: ticketMessage } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add ticket message error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
