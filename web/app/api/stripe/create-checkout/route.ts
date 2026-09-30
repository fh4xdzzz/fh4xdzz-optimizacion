import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe-server'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

  const { orderId } = await request.json()
  if (!orderId) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: order } = await supabase.from('orders')
    .select('id, order_number, user_id, client_email, price, description, status, services(name)')
    .eq('id', orderId).eq('user_id', session.user.id).eq('status', 'pending').is('deleted_at', null).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado o ya procesado' }, { status: 404 })

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe aún no está configurado' }, { status: 503 })

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  const service = Array.isArray(order.services) ? order.services[0] : order.services
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: order.client_email,
    client_reference_id: order.id,
    metadata: { order_id: order.id, user_id: session.user.id, order_number: order.order_number },
    line_items: [{ quantity: 1, price_data: {
      currency: 'usd', unit_amount: Math.round(Number(order.price) * 100),
      product_data: { name: service?.name || `Servicio ${order.order_number}`, description: String(order.description).slice(0, 500) },
    } }],
    success_url: `${origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pago?orderId=${encodeURIComponent(order.id)}&cancelled=1`,
  })

  if (!checkout.url) return NextResponse.json({ error: 'Stripe no devolvió una página de pago' }, { status: 502 })
  return NextResponse.json({ url: checkout.url })
}
