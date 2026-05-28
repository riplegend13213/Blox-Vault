import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sendDiscordEmbed } from '@/lib/discord'

async function requireAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('bv_session')
  if (!session) return null

  const user = await db.user.findUnique({ where: { id: session.value }, select: { id: true, role: true, banned: true } })
  if (!user || user.banned || user.role !== 'admin') return null
  return user
}

const schema = z.object({
  userId: z.string().min(1),
  points: z.number().int(),
  reason: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 })

    const { userId, points, reason } = parsed.data

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })

    const result = await db.$transaction(async (tx) => {
      const txRec = await tx.pointTransaction.create({ data: { userId, amount: points, type: points > 0 ? 'admin_adjust' : 'admin_adjust', reference: reason || null } })
      const updated = await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: points } }, select: { id: true, loyaltyPoints: true, username: true, email: true } })
      await tx.notification.create({ data: { userId, title: 'Loyalty Points Updated', body: `An administrator ${points > 0 ? 'added' : 'removed'} ${Math.abs(points)} points. ${reason ?? ''}`, type: 'info' } })
      return { txRec, updated }
    })

    // Post to Discord for audit
    try {
      await sendDiscordEmbed({
        title: `Admin adjusted loyalty points — ${user.username}`,
        description: `Points: ${points > 0 ? '+' : ''}${points} ${reason ? `· ${reason}` : ''}`,
        fields: [
          { name: 'User', value: `${user.username} (${user.email})` },
          { name: 'New Balance', value: String(result.updated.loyaltyPoints) },
          { name: 'Admin', value: admin.id },
        ],
      })
    } catch (e) {
      console.error('Failed sending admin loyalty embed:', e)
    }

    return NextResponse.json({ success: true, data: { updated: result.updated, transaction: result.txRec } })
  } catch (error) {
    console.error('Admin loyalty error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
