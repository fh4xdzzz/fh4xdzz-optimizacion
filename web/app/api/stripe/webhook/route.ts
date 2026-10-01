import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe-server'
import { getDiscordService } from '@/lib/discord-integration'
import { sendOrderNotificationEmail } from '@/lib/order-notifications'

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
    if (checkout.payment_status === 'paid' && checkout.metadata?.user_id) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
      const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

      let orderId = checkout.metadata.order_id
      let shouldNotify = false
      if (checkout.metadata.checkout_flow === 'service_request_v2' && checkout.metadata.service_id) {
        const paymentNote = `Pago Stripe confirmado. Sesión: ${checkout.id}`
        const { data: existingOrder } = await supabase.from('orders')
          .select('id').eq('notes', paymentNote).maybeSingle()

        if (existingOrder) {
          orderId = existingOrder.id
        } else {
          const { data: createdOrder, error: createError } = await supabase.from('orders').insert({
            order_number: checkout.metadata.request_code || `PAID-${checkout.id}`,
            user_id: checkout.metadata.user_id,
            service_id: checkout.metadata.service_id,
            status: 'reviewing',
            client_name: checkout.metadata.client_name || 'Cliente',
            client_email: checkout.customer_details?.email || checkout.customer_email || '',
            client_discord: checkout.metadata.client_discord || null,
            description: checkout.metadata.description || 'Solicitud pagada desde Stripe.',
            price: Number(checkout.amount_total || 0) / 100,
            notes: paymentNote,
          }).select('id').single()
          if (createError || !createdOrder) {
            console.error('[stripe/webhook] No se pudo crear el pedido pagado', createError)
            return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 })
          }
          orderId = createdOrder.id
          shouldNotify = true
        }
      } else if (checkout.metadata.order_id) {
        const { data: updatedOrder, error } = await supabase.from('orders').update({
          status: 'reviewing',
          notes: `Pago Stripe confirmado. Sesión: ${checkout.id}`,
        }).eq('id', checkout.metadata.order_id).eq('user_id', checkout.metadata.user_id).eq('status', 'pending').select('id').maybeSingle()
        if (error) return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 })
        shouldNotify = Boolean(updatedOrder)
      }

      if (!orderId) return NextResponse.json({ received: true })

      const { data: order } = await supabase.from('orders')
        .select('id, order_number, client_name, client_email, services(name), users(discord_id)')
        .eq('id', orderId).maybeSingle()
      if (order && shouldNotify) {
        const service = Array.isArray(order.services) ? order.services[0] : order.services
        const user = Array.isArray(order.users) ? order.users[0] : order.users
        await Promise.allSettled([
          getDiscordService().notifyOrderPaid({
            order_id: order.id,
            order_number: order.order_number,
            service_name: service?.name || 'Servicio',
            customer_name: order.client_name,
            discord_user_id: user?.discord_id || undefined,
          }),
          sendOrderNotificationEmail({
            kind: 'paid',
            eventId: `order-paid-${order.id}`,
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.client_name,
            customerEmail: order.client_email,
            serviceName: service?.name || 'Servicio',
            status: 'reviewing',
          }),
        ])
      }
    }
  }

  return NextResponse.json({ received: true })
}
