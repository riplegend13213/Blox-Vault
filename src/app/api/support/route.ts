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

const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject must be at most 200 characters'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be at most 5000 characters'),
})

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const params = url.searchParams
    const status = params.get('status')
    const search = params.get('search')
    const limit = parseInt(params.get('limit') || '50', 10) || 50
    const page = parseInt(params.get('page') || '1', 10) || 1
    const take = Math.min(limit, 200)
    const skip = Math.max(0, (page - 1) * take)

    if (user.role === 'admin') {
      // Admins can see all tickets; allow optional filtering & pagination
      const where: any = {}
      if (status && status !== 'all') where.status = status
      if (search) {
        where.OR = [
          { subject: { contains: search, mode: 'insensitive' } },
          { user: { username: { contains: search, mode: 'insensitive' } } },
        ]
      }

      const tickets = await db.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, email: true, avatar: true } },
          messages: {
            select: {
              id: true,
              senderId: true,
              isAdmin: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take,
        skip,
      })

      return NextResponse.json({ success: true, data: { tickets } })
    }

    // Regular users: only their own tickets (keep previous behavior)
    const userWhere: any = { userId: user.id }
    if (status && status !== 'all') userWhere.status = status

    const tickets = await db.supportTicket.findMany({
      where: userWhere,
      include: {
        messages: {
          select: {
            id: true,
            senderId: true,
            isAdmin: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { tickets } })
  } catch (error) {
    console.error('Support tickets GET error:', error)
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
    const parsed = createTicketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodFirstError(parsed.error) },
        { status: 400 }
      )
    }

    const { subject, message } = parsed.data

    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        status: 'open',
      },
    })

    // Create the first message
    const ticketMessage = await db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        message,
        isAdmin: false,
      },
    })

    // Create notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Support Ticket Created',
        body: `Your ticket "${subject}" has been created. We'll respond as soon as possible.`,
        type: 'support',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          ticket: {
            ...ticket,
            messages: [ticketMessage],
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create support ticket error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
