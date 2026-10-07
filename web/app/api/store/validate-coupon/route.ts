import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { calculateBestPackageDiscount, calculateCouponDiscount, formatCouponLabel } from '@/lib/store-pricing'

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
    supabase.from('discount_coupons').select('id, discount_type, discount_value, minimum_amount, max_redemptions, redemption_count, starts_at, expires_at, is_active').eq('code', parsed.data.code).maybeSingle(),
  ])
  if (!services || services.length !== ids.length || services.some(service => service.billing_type === 'subscription')) return NextResponse.json({ valid: false, error: 'El carrito contiene un servicio no válido.' })

  const subtotal = services.reduce((sum, service) => sum + Number(service.price), 0)
  const { discount: packageDiscount } = calculateBestPackageDiscount(services, packages || [])
  const base = subtotal - packageDiscount
  const now = Date.now()
  if (!coupon) return NextResponse.json({ valid: false, error: 'Este código de cupón no existe.' })
  if (!coupon.is_active) return NextResponse.json({ valid: false, error: 'Este cupón está desactivado.' })
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return NextResponse.json({ valid: false, error: 'Este cupón todavía no está disponible.' })
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now) return NextResponse.json({ valid: false, error: 'Este cupón está vencido.' })
  if (coupon.max_redemptions != null && coupon.redemption_count >= coupon.max_redemptions) return NextResponse.json({ valid: false, error: 'Este cupón alcanzó su límite de usos.' })
  if (base < Number(coupon.minimum_amount)) return NextResponse.json({ valid: false, error: `Este cupón requiere una compra mínima de $${Number(coupon.minimum_amount).toFixed(2)}.` })

  const couponDiscount = calculateCouponDiscount(base, coupon.discount_type, coupon.discount_value)
  return NextResponse.json({
    valid: true,
    couponDiscount,
    packageDiscount,
    total: Number(Math.max(0.5, base - couponDiscount).toFixed(2)),
    label: formatCouponLabel(coupon.discount_type, coupon.discount_value),
  })
}
