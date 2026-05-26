import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { authenticateUser } from '@/lib/auth'
import { isSessionSigningEnabled, signSession } from '@/lib/session'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, remember } = parsed.data as { email: string; password: string; remember?: boolean }
    const user = await authenticateUser(email, password)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: { user },
    })

    const isProd = process.env.NODE_ENV === 'production'
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7 // 30 days vs 7 days

    const sessionValue = isSessionSigningEnabled ? signSession(user.id) : user.id

    response.cookies.set('bv_session', sessionValue, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    // Persist remember preference in a separate cookie so middleware can
    // preserve session expiry without reading cookie metadata.
    response.cookies.set('bv_remember', remember ? '1' : '0', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
