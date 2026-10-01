import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe-server'

const checkoutSchema = z.object({
  serviceId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  discord: z.string().trim().max(100).optional().default(''),
  description: z.string().trim().min(10).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const parsed = checkoutSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Revisa los datos de la solicitud.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, duration_estimate')
      .eq('id', parsed.data.serviceId)
      .eq('is_active', true)
      .maybeSingle()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Este servicio ya no está disponible.' }, { status: 404 })
    }

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe aún no está configurado.' }, { status: 503 })

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email,
      client_reference_id: session.user.id,
      metadata: {
        checkout_flow: 'service_request_v2',
        user_id: session.user.id,
        service_id: service.id,
        client_name: parsed.data.name,
        client_discord: parsed.data.discord,
        description: parsed.data.description,
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(service.price) * 100),
          product_data: {
            name: service.name,
            description: service.duration_estimate
              ? `Servicio profesional · Entrega estimada: ${service.duration_estimate}`
              : 'Servicio profesional TheDulcanDesign',
          },
        },
      }],
      success_url: `${origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/contacto?service=${encodeURIComponent(service.id)}&cancelled=1`,
    })

    if (!checkout.url) return NextResponse.json({ error: 'Stripe no devolvió una página de pago.' }, { status: 502 })
    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[stripe/create-service-checkout] No se pudo crear la sesión', { message })
    return NextResponse.json({ error: 'No se pudo abrir el pago seguro. Inténtalo nuevamente.' }, { status: 500 })
  }
}
