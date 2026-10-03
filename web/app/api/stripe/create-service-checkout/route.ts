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
      .select('id, name, price, duration_estimate, billing_type, recurring_price, billing_interval')
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

    const metadata = {
      checkout_flow: 'service_request_v2',
      user_id: session.user.id,
      service_id: service.id,
      client_name: parsed.data.name,
      client_discord: session.user.discord_username,
      description: parsed.data.description,
      request_code: requestCode,
      billing_type: service.billing_type || 'one_time',
    }
    const setupPrice = Number(service.price)
    const lineItems = [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(setupPrice * 100),
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
          name: `${service.name} · alojamiento mensual`,
          description: 'Hosting administrado del bot, con renovación automática mensual hasta cancelar.',
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
            message: `El primer cobro incluye la creación ($${setupPrice.toFixed(2)}) y el primer mes de hosting ($${recurringPrice!.toFixed(2)}). Después se cobrarán $${recurringPrice!.toFixed(2)} al mes hasta cancelar.`,
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
        recurringAmount: recurringPrice,
        billingType: isSubscription ? 'subscription' : 'one_time',
        total: setupPrice + (recurringPrice || 0),
        currency: 'USD',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[stripe/create-service-checkout] No se pudo crear la sesión', { message })
    return NextResponse.json({ error: 'No se pudo abrir el pago seguro. Inténtalo nuevamente.' }, { status: 500 })
  }
}

