import { db } from './db'

type EmbedField = { name: string; value: string; inline?: boolean }

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function sendDiscordEmbed(payload: {
  title?: string
  description?: string
  fields?: EmbedField[]
  imageUrl?: string
  mention?: string
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const embed: any = {}
  if (payload.title) embed.title = payload.title
  if (payload.description) embed.description = payload.description
  if (payload.fields) embed.fields = payload.fields
  if (payload.imageUrl) embed.image = { url: payload.imageUrl }

  const body = {
    content: payload.mention ?? null,
    embeds: [embed],
  }

  // Retry with exponential backoff
  let attempt = 0
  const maxAttempts = 3
  while (attempt < maxAttempts) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) return

      const text = await res.text().catch(() => '')
      throw new Error(`Discord webhook failed: ${res.status} ${res.statusText} ${text}`)
    } catch (err) {
      console.error('Discord webhook attempt failed:', err)
      attempt++
      if (attempt < maxAttempts) await sleep(500 * attempt)
      else {
        // Log failure to admin notifications (best-effort)
        try {
          const admin = await db.user.findFirst({ where: { role: 'admin' } })
          if (admin) {
            await db.notification.create({
              data: {
                userId: admin.id,
                title: 'Webhook delivery failed',
                body: String(err).slice(0, 1000),
                type: 'warning',
              },
            })
          }
        } catch (e) {
          console.error('Failed to log webhook failure to DB:', e)
        }
        return
      }
    }
  }
}
