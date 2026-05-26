import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const rawSession = request.cookies.get('bv_session')
    if (!rawSession) return NextResponse.next()

    // rawSession may be a string or a Cookie object depending on runtime
    const sessionValue = (rawSession as any)?.value ?? rawSession
    if (!sessionValue) return NextResponse.next()

    // Keep the exact session cookie value (signed or raw) and refresh expiry

    const isProd = process.env.NODE_ENV === 'production'
    const res = NextResponse.next()

    // Read remember flag to decide expiry to preserve user's choice
    const rawRemember = request.cookies.get('bv_remember')
    const rememberValue = (rawRemember as any)?.value ?? rawRemember
    const remember = rememberValue === '1'
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7

    // refresh session cookie expiry on each request (preserve remember)
    res.cookies.set('bv_session', String(sessionValue), {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    // also refresh the bv_remember cookie expiry (non-httpOnly)
    res.cookies.set('bv_remember', remember ? '1' : '0', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
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
