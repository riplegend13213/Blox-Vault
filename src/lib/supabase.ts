import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'uploads'

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY)

export const supabase = isSupabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      global: { headers: { 'X-Client-Info': 'BloxVault' } },
    })
  : null

export function getSupabasePublicUrl(filename: string) {
  if (!SUPABASE_URL) return ''
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURIComponent(filename)}`
}

export const supabaseBucket = SUPABASE_BUCKET

// Expose the raw key for runtime diagnostics (do NOT log full key in production)
export const supabaseKey = SUPABASE_KEY

// Validate common misconfiguration patterns for helpful errors
export function validateSupabaseKey(key?: string) {
  if (!key) return { ok: false, reason: 'missing' }
  const trimmed = key.trim()
  if (trimmed.length === 0) return { ok: false, reason: 'empty' }
  if (/^\".*\"$/.test(key) || /^'.*'$/.test(key)) return { ok: false, reason: 'surrounding-quotes' }
  if (/\s/.test(key)) return { ok: false, reason: 'contains-whitespace' }
  if (/your-|anon|public/.test(key.toLowerCase())) return { ok: false, reason: 'placeholder-or-anon' }
  return { ok: true }
}
