import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { AFFILIATE_COOKIE, AFFILIATE_COOKIE_MAX_AGE, AFFILIATE_VISITOR_COOKIE, normalizeAffiliateCode } from '@/lib/affiliate-program'

const schema = z.object({
  code: z.string().min(3).max(20),
  landingPath: z.string().startsWith('/').max(300).default('/'),
  referrerHost: z.string().max(255).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if ((origin && origin !== requestOrigin) || (fetchSite && !['same-origin', 'same-site'].includes(fetchSite))) {
    return NextResponse.json({ tracked: false }, { status: 403 })
  }
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ tracked: false }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ tracked: false }, { status: 503 })

  const code = normalizeAffiliateCode(parsed.data.code)
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: creator, error } = await supabase.from('affiliate_creators')
    .select('id, slug').eq('slug', code).eq('status', 'active').maybeSingle()

  if (error) {
    console.error('[referrals/visit] No se pudo validar el enlace', error)
    return NextResponse.json({ tracked: false }, { status: 500 })
  }
  if (!creator) return NextResponse.json({ tracked: false }, { status: 404 })

  const existingCookie = request.cookies.get(AFFILIATE_VISITOR_COOKIE)?.value || ''
  const [existingVisitor, existingSignature = ''] = existingCookie.split('.', 2)
  const expectedSignature = createHmac('sha256', key).update(`affiliate-visitor|${existingVisitor}`).digest('hex')
  const hasValidVisitor = z.string().uuid().safeParse(existingVisitor).success
    && existingSignature.length === expectedSignature.length
    && timingSafeEqual(Buffer.from(existingSignature), Buffer.from(expectedSignature))
  if (!hasValidVisitor) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const day = new Date().toISOString().slice(0, 10)
    const fingerprint = createHmac('sha256', key).update(`${ip}|${creator.id}|${day}`).digest('hex')
    const { data: allowed, error: rateError } = await supabase.rpc('claim_affiliate_visit', { p_fingerprint: fingerprint, p_limit: 50 })
    if (rateError) {
      console.error('[referrals/visit] No se pudo comprobar el límite', rateError)
      return NextResponse.json({ tracked: false }, { status: 500 })
    }
    if (!allowed) return NextResponse.json({ tracked: false }, { status: 429 })
  }
  const visitorId = hasValidVisitor ? existingVisitor! : crypto.randomUUID()
  const { error: visitError } = await supabase.from('affiliate_visits').upsert({
    creator_id: creator.id,
    visitor_id: visitorId,
    landing_path: parsed.data.landingPath,
    referrer_host: parsed.data.referrerHost || null,
  }, { onConflict: 'creator_id,visitor_id', ignoreDuplicates: true })

  if (visitError) {
    console.error('[referrals/visit] No se pudo registrar la visita', visitError)
    return NextResponse.json({ tracked: false }, { status: 500 })
  }

  const response = NextResponse.json({ tracked: true, code: creator.slug })
  const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: AFFILIATE_COOKIE_MAX_AGE }
  response.cookies.set(AFFILIATE_COOKIE, creator.slug, cookieOptions)
  const visitorSignature = createHmac('sha256', key).update(`affiliate-visitor|${visitorId}`).digest('hex')
  response.cookies.set(AFFILIATE_VISITOR_COOKIE, `${visitorId}.${visitorSignature}`, cookieOptions)
  return response
}

