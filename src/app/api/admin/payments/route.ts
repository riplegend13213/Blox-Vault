import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const rows = await db.paymentSetting.findMany()
  const data: Record<string, string> = {}
  rows.forEach(r => data[r.key] = r.value)
  return NextResponse.json({ data })
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const entries = Object.entries(body || {})
    for (const [key, value] of entries) {
      await db.paymentSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update settings' }, { status: 500 })
  }
}
