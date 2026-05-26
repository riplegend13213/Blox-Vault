import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('bv_session')

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.value },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
      },
    })

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      )
      response.cookies.set('bv_session', '', { maxAge: 0, path: '/' })
      return response
    }

    if (user.banned) {
      const response = NextResponse.json(
        { success: false, error: 'Account has been banned' },
        { status: 403 }
      )
      response.cookies.set('bv_session', '', { maxAge: 0, path: '/' })
      return response
    }

    return NextResponse.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
