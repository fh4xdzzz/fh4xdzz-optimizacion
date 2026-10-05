import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'

const schema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^(DULCAN-[A-Z0-9]{4,16}|[A-Z0-9]{3,20})$/),
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ valid: false, error: 'Inicia sesión para validar el cupón.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ valid: false, error: 'El código no tiene un formato válido.' })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ valid: false, error: 'No pudimos validar el cupón.' }, { status: 503 })
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids = [...new Set(parsed.data.serviceIds)]
  const [{ data: services }, { data: packages }, { data: coupon }] = await Promise.all([
    supabase.from('services').select('id, price, billing_type').in('id', ids).eq('is_active', true),
    supabase.from('service_packages').select('id, discount_percent, service_package_items(service_id)').eq('is_active', true),
    supabase.from('discount_coupons').select('id, discount_type, discount_value, minimum_amount, max_redemptions, redemption_count, starts_at, expires_at').eq('code', parsed.data.code).eq('is_active', true).maybeSingle(),
  ])
  if (!services || services.length !== ids.length || services.some(service => service.billing_type === 'subscription')) return NextResponse.json({ valid: false, error: 'El carrito contiene un servicio no válido.' })

  const subtotal = services.reduce((sum, service) => sum + Number(service.price), 0)
  const selected = new Set(ids)
  const bestPackage = (packages || []).filter(pack => {
    const packageIds = (pack.service_package_items || []).map((item: { service_id: string }) => item.service_id)
    return packageIds.length > 1 && packageIds.every((id: string) => selected.has(id))
  }).sort((a, b) => Number(b.discount_percent) - Number(a.discount_percent))[0]
  const packageDiscount = bestPackage ? subtotal * Number(bestPackage.discount_percent) / 100 : 0
  const base = subtotal - packageDiscount
  const now = Date.now()
  const valid = coupon
    && (!coupon.starts_at || new Date(coupon.starts_at).getTime() <= now)
    && (!coupon.expires_at || new Date(coupon.expires_at).getTime() > now)
    && (coupon.max_redemptions == null || coupon.redemption_count < coupon.max_redemptions)
    && base >= Number(coupon.minimum_amount)
  if (!valid) return NextResponse.json({ valid: false, error: 'Este cupón no existe, venció o alcanzó su límite de usos.' })

  const rawDiscount = coupon.discount_type === 'percent' ? base * Number(coupon.discount_value) / 100 : Number(coupon.discount_value)
  const couponDiscount = Math.min(rawDiscount, Math.max(0, base - 0.5))
  return NextResponse.json({ valid: true, couponDiscount: Number(couponDiscount.toFixed(2)), packageDiscount: Number(packageDiscount.toFixed(2)), total: Number(Math.max(0.5, base - couponDiscount).toFixed(2)), label: `${Number(coupon.discount_value)}% de descuento aplicado` })
}
