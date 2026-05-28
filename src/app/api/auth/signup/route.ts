import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createUser, getUserByEmail, getUserByUsername } from '@/lib/auth'
import { db } from '@/lib/db'
import { isSessionSigningEnabled, signSession } from '@/lib/session'

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { username, email, password } = parsed.data

    // Check if email already exists
    const existingEmail = await getUserByEmail(email)
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Check if username already exists
    const existingUsername = await getUserByUsername(username)
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Username already taken' },
        { status: 409 }
      )
    }

    const user = await createUser({ username, email, password })

    // Award signup bonus points (50 pts)
    try {
      await db.$transaction(async (tx) => {
        await tx.pointTransaction.create({
          data: {
            userId: user.id,
            amount: 50,
            type: 'signup_bonus',
            reference: null,
          },
        })

        await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: { increment: 50 } } })

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome Bonus',
            body: 'You received 50 bonus loyalty points for signing up!',
            type: 'promo',
          },
        })
      })
    } catch (err) {
      console.error('Signup bonus error:', err)
    }

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    })

    // Auto-login after signup
    const isProd = process.env.NODE_ENV === 'production'
    const sessionValue = isSessionSigningEnabled ? signSession(user.id) : user.id

    response.cookies.set('bv_session', sessionValue, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    // default to not remembering on signup unless user explicitly requests it
    response.cookies.set('bv_remember', '0', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
