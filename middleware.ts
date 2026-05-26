import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const session = request.cookies.get('bv_session')
    if (!session) return NextResponse.next()

    const isProd = process.env.NODE_ENV === 'production'
    const res = NextResponse.next()

    // refresh session cookie expiry on each request
    res.cookies.set('bv_session', String(session), {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return res
  } catch (e) {
    console.error('Middleware session refresh error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
