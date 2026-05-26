import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const res = NextResponse.json({ success: true })
    res.cookies.set('bv_session', '', { maxAge: 0, path: '/' })
    res.cookies.set('bv_remember', '', { maxAge: 0, path: '/' })
    return res
  } catch (e) {
    console.error('Logout error:', e)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}
