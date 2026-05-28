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
  // When an image URL is provided, prefer sending it as an attachment to
  // ensure Discord reliably displays the image (some hosts or redirects
  // prevent embed previews). We'll set the embed image url to the
  // attachment reference: attachment://<filename>
  const shouldAttachImage = Boolean(payload.imageUrl)

  const body = {
    content: payload.mention ?? null,
    embeds: [embed],
  }

  // Retry with exponential backoff
  let attempt = 0
  const maxAttempts = 3
  while (attempt < maxAttempts) {
    try {
      // If there's no image to attach, send a regular JSON payload.
      if (!shouldAttachImage) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) return
        const text = await res.text().catch(() => '')
        throw new Error(`Discord webhook failed: ${res.status} ${res.statusText} ${text}`)
      }

      // Attempt to fetch the image and send as multipart/form-data attachment.
      try {
        // Support data URLs (base64) as well as remote URLs.
        let arrayBuffer: ArrayBuffer
        let contentType = 'application/octet-stream'
        if ((payload.imageUrl as string).startsWith('data:')) {
          const m = (payload.imageUrl as string).match(/^data:(.+);base64,(.+)$/)
          if (!m) throw new Error('Invalid data URL')
          contentType = m[1]
          const b = Buffer.from(m[2], 'base64')
          arrayBuffer = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
        } else {
          const imgRes = await fetch(payload.imageUrl as string)
          if (!imgRes.ok) throw new Error('Failed to fetch image for attachment')
          arrayBuffer = await imgRes.arrayBuffer()
          contentType = imgRes.headers.get('content-type') || contentType
        }

        let ext = 'png'
        if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
        else if (contentType.includes('gif')) ext = 'gif'
        const filename = `proof.${ext}`

        // Build multipart form data
        const form = new FormData()
        // @ts-ignore - Node Fetch/FormData support may vary in runtime
        form.append('file', new Blob([arrayBuffer], { type: contentType }), filename)
        // Set embed to reference the attachment
        embed.image = { url: `attachment://${filename}` }
        form.append('payload_json', JSON.stringify(body))

        const res = await fetch(webhookUrl, {
          method: 'POST',
          body: form as any,
        })

        if (res.ok) return
        const text = await res.text().catch(() => '')
        throw new Error(`Discord webhook (multipart) failed: ${res.status} ${res.statusText} ${text}`)
      } catch (e) {
        // If attachment flow fails, fallback to the JSON-only approach with the original image URL
        const fallbackRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, embeds: [{ ...embed, image: { url: payload.imageUrl } }] }),
        })
        if (fallbackRes.ok) return
        const text = await fallbackRes.text().catch(() => '')
        throw new Error(`Discord webhook fallback failed: ${fallbackRes.status} ${fallbackRes.statusText} ${text}`)
      }
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
