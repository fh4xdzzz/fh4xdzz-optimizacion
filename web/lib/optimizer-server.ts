import { createHash, randomInt } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

export const OPTIMIZER_ALLOWED_ORDER_STATUSES = ['reviewing', 'in_progress', 'waiting_client', 'completed'] as const

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function generateOptimizerCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('')
}

export function normalizeOptimizerCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export function hashOptimizerCode(value: string) {
  return createHash('sha256').update(normalizeOptimizerCode(value), 'utf8').digest('hex')
}
