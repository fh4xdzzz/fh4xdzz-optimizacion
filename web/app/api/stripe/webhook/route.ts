import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe-server'

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = request.headers.get('stripe-signature')
  if (!stripe || !webhookSecret || !signature) return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const checkout = event.data.object as Stripe.Checkout.Session
    if (checkout.payment_status === 'paid' && checkout.metadata?.order_id && checkout.metadata?.user_id) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
      const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      const { error } = await supabase.from('orders').update({
        status: 'reviewing',
        notes: `Pago Stripe confirmado. Sesión: ${checkout.id}`,
      }).eq('id', checkout.metadata.order_id).eq('user_id', checkout.metadata.user_id).eq('status', 'pending')
      if (error) return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
