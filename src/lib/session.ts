import crypto from 'crypto'

const SECRET = process.env.SESSION_SECRET ?? ''

export const isSessionSigningEnabled = Boolean(SECRET && SECRET.length > 8)

function base64Url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function signSession(value: string) {
  if (!isSessionSigningEnabled) throw new Error('SESSION_SECRET not configured')
  const h = crypto.createHmac('sha256', SECRET).update(value).digest()
  return `${value}.${base64Url(h)}`
}

export function verifySession(token: string) {
  if (!isSessionSigningEnabled) return null
  const idx = token.lastIndexOf('.')
  if (idx === -1) return null
  const value = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  try {
    const expected = base64Url(crypto.createHmac('sha256', SECRET).update(value).digest())
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    return value
  } catch (e) {
    return null
  }
}
