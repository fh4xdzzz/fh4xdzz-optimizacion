import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { getStripe } from '@/lib/stripe-server'
import { calculateBestPackageDiscount, calculateCouponDiscount } from '@/lib/store-pricing'

const schema = z.object({
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(500),
  coupon: z.string().trim().max(32).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión para pagar.' }, { status: 401 })
  if (!session.user.discord_username) return NextResponse.json({ error: 'Vincula Discord desde tu perfil antes de continuar.' }, { status: 400 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del carrito.' }, { status: 400 })

  const ids = [...new Set(parsed.data.serviceIds)]
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripe = getStripe()
  if (!url || !key || !stripe) return NextResponse.json({ error: 'El pago no está disponible temporalmente.' }, { status: 503 })
  const supabase = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: services, error: serviceError } = await supabase.from('services')
    .select('id, name, slug, price, billing_type').in('id', ids).eq('is_active', true)
  if (serviceError || !services || services.length !== ids.length) return NextResponse.json({ error: 'Uno de los servicios ya no está disponible.' }, { status: 400 })
  if (services.some((service) => service.billing_type === 'subscription')) return NextResponse.json({ error: 'Las suscripciones se contratan por separado.' }, { status: 400 })

  const subtotal = services.reduce((sum, service) => sum + Number(service.price), 0)
  const { data: packages } = await supabase.from('service_packages')
    .select('id, discount_percent, service_package_items(service_id)').eq('is_active', true)
  const packagePricing = calculateBestPackageDiscount(services, packages || [])
  const packageDiscount = packagePricing.discount

  let couponId: string | null = null
  let couponDiscount = 0
  if (parsed.data.coupon) {
    const code = parsed.data.coupon.toUpperCase()
    const { data: coupon } = await supabase.from('discount_coupons').select('*').eq('code', code).eq('is_active', true).maybeSingle()
    const now = Date.now()
    const valid = coupon
      && (!coupon.starts_at || new Date(coupon.starts_at).getTime() <= now)
      && (!coupon.expires_at || new Date(coupon.expires_at).getTime() > now)
      && (coupon.max_redemptions == null || coupon.redemption_count < coupon.max_redemptions)
      && subtotal - packageDiscount >= Number(coupon.minimum_amount)
    if (!valid) return NextResponse.json({ error: 'El cupón no existe, venció o no cumple el mínimo.' }, { status: 400 })
    couponId = coupon.id
    const base = subtotal - packageDiscount
    couponDiscount = calculateCouponDiscount(base, coupon.discount_type, coupon.discount_value)
  }

  const total = Math.max(0.5, subtotal - packageDiscount - couponDiscount)
  const items = services.map((service) => ({ id: service.id, name: service.name, slug: service.slug, price: Number(service.price) }))
  const { data: cart, error: cartError } = await supabase.from('checkout_carts').insert({
    user_id: session.user.id, customer_name: parsed.data.name, customer_email: session.user.email,
    customer_discord: session.user.discord_username, description: parsed.data.description, items,
    subtotal: subtotal.toFixed(2), package_discount: packageDiscount.toFixed(2), coupon_discount: couponDiscount.toFixed(2),
    total: total.toFixed(2), package_id: packagePricing.packageId, coupon_id: couponId,
  }).select('id').single()
  if (cartError || !cart) return NextResponse.json({ error: 'No pudimos preparar el carrito.' }, { status: 500 })

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['card'], customer_email: session.user.email,
    client_reference_id: session.user.id,
    metadata: { checkout_flow: 'cart_v1', cart_id: cart.id, user_id: session.user.id },
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round(total * 100), product_data: {
      name: services.length > 1 ? `Paquete TheDulcanDesign · ${services.length} servicios` : services[0].name,
      description: services.map((service) => service.name).join(' + ').slice(0, 500),
    } } }],
    success_url: `${origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}&cart=1`,
    cancel_url: `${origin}/carrito?cancelled=1`,
  })
  await supabase.from('checkout_carts').update({ stripe_session_id: checkout.id }).eq('id', cart.id)
  return NextResponse.json({ url: checkout.url, summary: { subtotal, packageDiscount, couponDiscount, total } })
}
