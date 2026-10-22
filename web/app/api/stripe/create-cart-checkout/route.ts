import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { getStripe } from '@/lib/stripe-server'
import { calculateBestPackageDiscount, calculateCouponDiscount } from '@/lib/store-pricing'
import { AFFILIATE_COOKIE, normalizeAffiliateCode } from '@/lib/affiliate-program'
import { randomUUID } from 'node:crypto'
import { DULCAN_PRODUCT, activationScope, licenseConfigurationReady, licenseLiveMode } from '@/lib/dulcan-license-crypto'
import { sameLicenseOrigin } from '@/lib/dulcan-license-service'

const schema = z.object({
  serviceIds: z.array(z.string().uuid()).max(10).default([]),
  includeLicense: z.boolean().default(false),
  name: z.string().trim().max(100).default(''),
  description: z.string().trim().max(500).default(''),
  coupon: z.string().trim().max(32).optional(),
})

export async function POST(request: NextRequest) {
  if (!sameLicenseOrigin(request.headers.get('origin'))) return NextResponse.json({ error: 'Origen no válido.' }, { status: 403 })
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión para pagar.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del carrito.' }, { status: 400 })

  const ids = [...new Set(parsed.data.serviceIds)]
  const includeLicense = parsed.data.includeLicense
  if ((!ids.length && !includeLicense) || ids.length + Number(includeLicense) > 10) return NextResponse.json({ error: 'Selecciona entre 1 y 10 artículos.' }, { status: 400 })
  if (ids.length && (parsed.data.name.length < 2 || parsed.data.description.length < 10)) return NextResponse.json({ error: 'Completa tu nombre y los detalles de los servicios.' }, { status: 400 })
  if (ids.length && !session.user.discord_username) return NextResponse.json({ error: 'Vincula Discord desde tu perfil antes de continuar.' }, { status: 400 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripe = getStripe()
  if (!url || !key || !stripe) return NextResponse.json({ error: 'El pago no está disponible temporalmente.' }, { status: 503 })
  const supabase = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
  let licenseProduct: { id: string; name: string; amount_cents: number; currency: string } | null = null
  let purchaseId: string | null = null
  if (includeLicense) {
    if (!licenseConfigurationReady() || licenseLiveMode() !== /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '')) return NextResponse.json({ error: 'La licencia no está disponible temporalmente.' }, { status: 503 })
    const { data, error } = await supabase.from('software_products').select('id,name,amount_cents,currency,active').eq('id', DULCAN_PRODUCT).maybeSingle()
    if (error || !data?.active || data.currency !== 'usd' || !Number.isInteger(data.amount_cents) || data.amount_cents <= 0) return NextResponse.json({ error: 'La licencia no está disponible.' }, { status: 503 })
    licenseProduct = data
    const throttle = await supabase.rpc('consume_dulcan_activation_limit', { p_scope: activationScope('checkout-user', session.user.id), p_limit: 5 })
    if (throttle.error) throw new Error('No se pudo limitar el pago')
    if (!throttle.data) return NextResponse.json({ error: 'Espera un minuto antes de iniciar otra compra.' }, { status: 429 })
    purchaseId = randomUUID()
    const { error: purchaseError } = await supabase.from('software_purchases').insert({ id: purchaseId, user_id: session.user.id, product_id: data.id, email: session.user.email, customer_name: parsed.data.name || session.user.full_name || 'Cliente', amount_cents: data.amount_cents, currency: data.currency, livemode: licenseLiveMode() })
    if (purchaseError) throw new Error('No se pudo preparar la licencia')
  }

  const { data: services, error: serviceError } = ids.length ? await supabase.from('services')
    .select('id, name, slug, price, billing_type').in('id', ids).eq('is_active', true)
    : { data: [], error: null }
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

  let affiliateCreatorId = ''
  let affiliateCommissionRate = ''
  const referralCode = normalizeAffiliateCode(request.cookies.get(AFFILIATE_COOKIE)?.value || '')
  if (referralCode || couponId) {
    const { data: couponAffiliate } = couponId
      ? await supabase.from('affiliate_creators').select('id, commission_rate').eq('status', 'active').eq('coupon_id', couponId).maybeSingle()
      : { data: null }
    const { data: referralAffiliate } = !couponAffiliate && referralCode
      ? await supabase.from('affiliate_creators').select('id, commission_rate').eq('status', 'active').eq('slug', referralCode).maybeSingle()
      : { data: null }
    const affiliate = couponAffiliate || referralAffiliate
    affiliateCreatorId = affiliate?.id || ''
    affiliateCommissionRate = affiliate ? String(affiliate.commission_rate) : ''
  }

  const serviceTotal = ids.length ? Math.max(0.5, subtotal - packageDiscount - couponDiscount) : 0
  const total = Math.round(serviceTotal * 100 + (licenseProduct?.amount_cents || 0)) / 100
  const items = services.map((service) => ({ id: service.id, name: service.name, slug: service.slug, price: Number(service.price), kind: 'service' }))
  if (licenseProduct) items.push({ id: licenseProduct.id, name: licenseProduct.name, slug: DULCAN_PRODUCT, price: licenseProduct.amount_cents / 100, kind: 'license' })
  const { data: cart, error: cartError } = await supabase.from('checkout_carts').insert({
    user_id: session.user.id, customer_name: parsed.data.name || session.user.full_name || 'Cliente', customer_email: session.user.email,
    customer_discord: session.user.discord_username || null, description: parsed.data.description || 'Licencia Dulcan Optimizer para 1 PC.', items,
    subtotal: (subtotal + (licenseProduct?.amount_cents || 0) / 100).toFixed(2), package_discount: packageDiscount.toFixed(2), coupon_discount: couponDiscount.toFixed(2),
    total: total.toFixed(2), package_id: packagePricing.packageId, coupon_id: couponId,
  }).select('id').single()
  if (cartError || !cart) return NextResponse.json({ error: 'No pudimos preparar el carrito.' }, { status: 500 })

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['card'], customer_email: session.user.email,
    client_reference_id: session.user.id,
    metadata: { checkout_flow: 'cart_v1', cart_id: cart.id, user_id: session.user.id, affiliate_creator_id: affiliateCreatorId, affiliate_commission_rate: affiliateCommissionRate, ...(purchaseId ? { purchase_id: purchaseId } : {}) },
    line_items: [...(services.length ? [{ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round(serviceTotal * 100), product_data: {
      name: services.length > 1 ? `Paquete TheDulcanDesign · ${services.length} servicios` : services[0].name,
      description: services.map((service) => service.name).join(' + ').slice(0, 500),
    } } }] : []), ...(licenseProduct ? [{ quantity: 1, price_data: { currency: 'usd', unit_amount: licenseProduct.amount_cents, product_data: { name: licenseProduct.name, description: 'Licencia permanente para 1 PC. Sin suscripción; verificación online cada 30 días.' } } }] : [])],
    success_url: `${origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}&cart=1`,
    cancel_url: `${origin}/carrito?cancelled=1`,
  }, { idempotencyKey: `unified-cart-${cart.id}` })
  const binding = await supabase.from('checkout_carts').update({ stripe_session_id: checkout.id }).eq('id', cart.id)
  if (binding.error || !checkout.url) throw new Error('No se pudo enlazar el pago')
  if (purchaseId) {
    const binding = await supabase.from('software_purchases').update({ stripe_session_id: checkout.id }).eq('id', purchaseId).is('stripe_session_id', null)
    if (binding.error) throw new Error('No se pudo enlazar la licencia')
  }
  return NextResponse.json({ url: checkout.url, summary: { subtotal, packageDiscount, couponDiscount, total } })
  } catch { return NextResponse.json({ error: 'No pudimos preparar el pago. Inténtalo de nuevo.' }, { status: 503 }) }
}
