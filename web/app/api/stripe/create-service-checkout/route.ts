import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe-server'
import { randomBytes } from 'node:crypto'

const checkoutSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(500),
  couponCode: z.string().trim().toUpperCase().min(3).max(30).regex(/^(DULCAN-[A-Z0-9]{4,16}|[A-Z0-9]{3,20})$/).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    if (!session.user.discord_username) {
      return NextResponse.json({ error: 'Debes vincular tu cuenta de Discord desde tu perfil antes de continuar.' }, { status: 400 })
    }

    const parsed = checkoutSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Revisa los datos de la solicitud.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, slug, price, duration_estimate, billing_type, recurring_price, billing_interval')
      .eq('id', parsed.data.serviceId)
      .eq('is_active', true)
      .maybeSingle()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Este servicio ya no está disponible.' }, { status: 404 })
    }

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe aún no está configurado.' }, { status: 503 })

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const requestCode = `TDD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`
    const isSubscription = service.billing_type === 'subscription'
    const recurringPrice = service.recurring_price == null ? null : Number(service.recurring_price)
    if (isSubscription && (!recurringPrice || service.billing_interval !== 'month')) {
      return NextResponse.json({ error: 'La suscripción de este servicio no está configurada correctamente.' }, { status: 503 })
    }
    if (isSubscription) {
      const { data: existingSubscription, error: subscriptionLookupError } = await supabase
        .from('service_subscriptions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('service_id', service.id)
        .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'paused'])
        .limit(1)
        .maybeSingle()
      if (subscriptionLookupError) {
        console.error('[stripe/create-service-checkout] No se pudo comprobar la suscripción existente', subscriptionLookupError)
        return NextResponse.json({ error: 'No pudimos comprobar tu suscripción. Inténtalo nuevamente.' }, { status: 500 })
      }
      if (existingSubscription) {
        return NextResponse.json({ error: 'Ya tienes una suscripción activa para este servicio.' }, { status: 409 })
      }
    }

    const setupPrice = Number(service.price)
    let coupon: { id: string; code: string; discount_type: string; discount_value: number; minimum_amount: number; max_redemptions: number | null; redemption_count: number; starts_at: string | null; expires_at: string | null } | null = null
    let couponDiscount = 0
    if (parsed.data.couponCode) {
      if (isSubscription) return NextResponse.json({ error: 'Los cupones aplican únicamente a servicios de pago único.' }, { status: 400 })
      const { data: couponRecord, error: couponError } = await supabase.from('discount_coupons')
        .select('id, code, discount_type, discount_value, minimum_amount, max_redemptions, redemption_count, starts_at, expires_at, is_active')
        .eq('code', parsed.data.couponCode).maybeSingle()
      const now = Date.now()
      if (couponError) return NextResponse.json({ error: 'No pudimos comprobar el cupón. Inténtalo nuevamente.' }, { status: 500 })
      if (!couponRecord) return NextResponse.json({ error: 'Este código de cupón no existe.' }, { status: 400 })
      if (!couponRecord.is_active) return NextResponse.json({ error: 'Este cupón está desactivado.' }, { status: 400 })
      if (couponRecord.starts_at && new Date(couponRecord.starts_at).getTime() > now) return NextResponse.json({ error: 'Este cupón todavía no está disponible.' }, { status: 400 })
      if (couponRecord.expires_at && new Date(couponRecord.expires_at).getTime() <= now) return NextResponse.json({ error: 'Este cupón está vencido.' }, { status: 400 })
      if (couponRecord.max_redemptions != null && couponRecord.redemption_count >= couponRecord.max_redemptions) return NextResponse.json({ error: 'Este cupón alcanzó su límite de usos.' }, { status: 400 })
      if (setupPrice < Number(couponRecord.minimum_amount)) return NextResponse.json({ error: `Este cupón requiere una compra mínima de $${Number(couponRecord.minimum_amount).toFixed(2)}.` }, { status: 400 })
      coupon = couponRecord
      const rawDiscount = coupon.discount_type === 'percent' ? setupPrice * Number(coupon.discount_value) / 100 : Number(coupon.discount_value)
      couponDiscount = Number(Math.min(rawDiscount, Math.max(0, setupPrice - 0.5)).toFixed(2))
    }
    const discountedSetupPrice = Number(Math.max(0.5, setupPrice - couponDiscount).toFixed(2))

    const metadata = {
      checkout_flow: 'service_request_v2',
      user_id: session.user.id,
      service_id: service.id,
      client_name: parsed.data.name,
      client_discord: session.user.discord_username,
      description: parsed.data.description,
      request_code: requestCode,
      billing_type: service.billing_type || 'one_time',
      coupon_id: coupon?.id || '',
      coupon_code: coupon?.code || '',
      coupon_discount: couponDiscount.toFixed(2),
    }
    const lineItems = [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(discountedSetupPrice * 100),
        product_data: {
          name: isSubscription ? `${service.name} · creación inicial` : service.name,
          description: service.duration_estimate
            ? `Servicio profesional · Entrega estimada: ${service.duration_estimate}`
            : 'Servicio profesional TheDulcanDesign',
        },
      },
    }, ...(isSubscription && recurringPrice ? [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(recurringPrice * 100),
        recurring: { interval: 'month' as const },
        product_data: {
          name: `${service.name} · plan mensual`,
          description: service.slug === 'pagina-web-profesional'
            ? 'Dominio, hosting y mantenimiento técnico básico, con renovación automática mensual hasta cancelar.'
            : 'Hosting administrado del bot, con renovación automática mensual hasta cancelar.',
        },
      },
    }] : [])]

    const checkout = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      client_reference_id: session.user.id,
      metadata,
      ...(isSubscription ? { subscription_data: { metadata } } : {}),
      line_items: lineItems,
      ...(isSubscription ? {
        custom_text: {
          submit: {
            message: `El primer cobro incluye la creación ($${setupPrice.toFixed(2)}) y el primer mes de ${service.slug === 'pagina-web-profesional' ? 'dominio y hosting' : 'hosting'} ($${recurringPrice!.toFixed(2)}). Después se cobrarán $${recurringPrice!.toFixed(2)} al mes hasta cancelar.`,
          },
        },
      } : {}),
      success_url: `${origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/contacto?service=${encodeURIComponent(service.id)}&cancelled=1`,
    })

    if (!checkout.url) return NextResponse.json({ error: 'Stripe no devolvió una página de pago.' }, { status: 502 })
    return NextResponse.json({
      url: checkout.url,
      invoice: {
        code: requestCode,
        customerName: parsed.data.name,
        customerEmail: session.user.email,
        discordUsername: session.user.discord_username,
        serviceName: service.name,
        description: parsed.data.description,
        subtotal: setupPrice,
        discount: couponDiscount,
        recurringAmount: recurringPrice,
        billingType: isSubscription ? 'subscription' : 'one_time',
        total: discountedSetupPrice + (recurringPrice || 0),
        currency: 'USD',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[stripe/create-service-checkout] No se pudo crear la sesión', { message })
    return NextResponse.json({ error: 'No se pudo abrir el pago seguro. Inténtalo nuevamente.' }, { status: 500 })
  }
}

