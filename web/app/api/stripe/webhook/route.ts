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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 })
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const checkout = event.data.object as Stripe.Checkout.Session
    if (checkout.payment_status === 'paid' && checkout.metadata?.user_id) {
      let orderId = checkout.metadata.order_id
      let shouldNotify = false
      if (checkout.metadata.checkout_flow === 'cart_v1' && checkout.metadata.cart_id) {
        const { data: cart, error: cartLookupError } = await supabase.from('checkout_carts')
          .select('*').eq('id', checkout.metadata.cart_id).eq('user_id', checkout.metadata.user_id).maybeSingle()
        if (cartLookupError || !cart) return NextResponse.json({ error: 'No se encontró el carrito pagado.' }, { status: 500 })
        const { data: existingCartOrder } = await supabase.from('orders').select('id').ilike('notes', `%Carrito: ${cart.id}%`).limit(1).maybeSingle()
        if (existingCartOrder) {
          orderId = existingCartOrder?.id
          if (cart.status !== 'paid') await supabase.from('checkout_carts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', cart.id)
        } else {
          const items = Array.isArray(cart.items) ? cart.items : []
          const subtotal = Number(cart.subtotal) || 1
          const totalCents = Number(checkout.amount_total || 0)
          let allocatedCents = 0
          const rows = items.map((item: { id: string; name: string; price: number }, index: number) => {
            const cents = index === items.length - 1
              ? totalCents - allocatedCents
              : Math.round(totalCents * Number(item.price) / subtotal)
            allocatedCents += cents
            return {
              order_number: `CART-${checkout.id}-${index + 1}`,
              user_id: cart.user_id,
              service_id: item.id,
              status: 'reviewing',
              client_name: cart.customer_name,
              client_email: cart.customer_email,
              client_discord: cart.customer_discord,
              description: cart.description,
              price: cents / 100,
              notes: `Pago Stripe confirmado. Sesión: ${checkout.id}. Carrito: ${cart.id}`,
            }
          })
          const { data: createdOrders, error: createCartError } = await supabase.from('orders').insert(rows).select('id')
          if (createCartError || !createdOrders?.length) return NextResponse.json({ error: 'No se pudieron crear los pedidos del carrito.' }, { status: 500 })
          orderId = createdOrders[0].id
          shouldNotify = true
          await supabase.from('checkout_carts').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', cart.id).eq('status', 'pending')
          if (cart.coupon_id) {
            const { data: coupon } = await supabase.from('discount_coupons').select('redemption_count').eq('id', cart.coupon_id).maybeSingle()
            if (coupon) await supabase.from('discount_coupons').update({ redemption_count: Number(coupon.redemption_count) + 1 }).eq('id', cart.coupon_id)
          }
        }
      } else if (checkout.metadata.checkout_flow === 'service_request_v2' && checkout.metadata.service_id) {
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
          if (checkout.metadata.coupon_id) {
            const { data: coupon } = await supabase.from('discount_coupons').select('redemption_count').eq('id', checkout.metadata.coupon_id).maybeSingle()
            if (coupon) await supabase.from('discount_coupons').update({ redemption_count: Number(coupon.redemption_count) + 1 }).eq('id', checkout.metadata.coupon_id)
          }
        }
      } else if (checkout.metadata.order_id) {
        const { data: updatedOrder, error } = await supabase.from('orders').update({
          status: 'reviewing',
          notes: `Pago Stripe confirmado. Sesión: ${checkout.id}`,
        }).eq('id', checkout.metadata.order_id).eq('user_id', checkout.metadata.user_id).eq('status', 'pending').select('id').maybeSingle()
        if (error) return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 })
        shouldNotify = Boolean(updatedOrder)
      }

      const subscriptionId = typeof checkout.subscription === 'string'
        ? checkout.subscription
        : checkout.subscription?.id
      const customerId = typeof checkout.customer === 'string'
        ? checkout.customer
        : checkout.customer?.id
      if (checkout.metadata.billing_type === 'subscription' && subscriptionId && checkout.metadata.service_id) {
        const { error: subscriptionError } = await supabase.from('service_subscriptions').upsert({
          user_id: checkout.metadata.user_id,
          service_id: checkout.metadata.service_id,
          order_id: orderId || null,
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          cancel_at_period_end: false,
        }, { onConflict: 'stripe_subscription_id' })
        if (subscriptionError) {
          console.error('[stripe/webhook] No se pudo registrar la suscripción', subscriptionError)
          return NextResponse.json({ error: 'No se pudo registrar la suscripción' }, { status: 500 })
        }
      }

      if (!orderId) return NextResponse.json({ received: true })

      // Keep the order lookup independent from embedded relationships. A missing
      // or ambiguous PostgREST relationship must never make the webhook return
      // 200 without attempting the confirmation email.
      const { data: order, error: orderError } = await supabase.from('orders')
        .select('id, order_number, user_id, service_id, client_name, client_email')
        .eq('id', orderId).maybeSingle()
      if (orderError || !order) {
        console.error('[stripe/webhook] No se pudo recuperar el pedido para notificar', {
          orderId,
          error: orderError,
        })
        return NextResponse.json({ error: 'No se pudo recuperar el pedido para notificar' }, { status: 500 })
      }

      const [{ data: service, error: serviceError }, { data: user, error: userError }] = await Promise.all([
        supabase.from('services').select('name').eq('id', order.service_id).maybeSingle(),
        supabase.from('users').select('discord_id').eq('id', order.user_id).maybeSingle(),
      ])
      if (serviceError) console.warn('[stripe/webhook] No se pudo recuperar el nombre del servicio', serviceError)
      if (userError) console.warn('[stripe/webhook] No se pudo recuperar Discord del cliente', userError)

      if (shouldNotify) {
        await Promise.allSettled([getDiscordService().notifyOrderPaid({
          order_id: order.id,
          order_number: order.order_number,
          service_name: service?.name || 'Servicio',
          customer_name: order.client_name,
          discord_user_id: user?.discord_id || undefined,
        })])
      }

      // El correo se intenta también en reenvíos del webhook. Resend usa una
      // clave idempotente por pedido, por lo que un reintento no lo duplica.
      // Si falla, devolvemos error para que Stripe vuelva a entregar el evento.
      const emailSent = await sendOrderNotificationEmail({
        kind: 'paid',
        // Version the idempotency key when the email template changes so an
        // existing test purchase can receive the new design exactly once.
        eventId: `order-paid-v2-${order.id}`,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.client_name,
        customerEmail: order.client_email,
        serviceName: service?.name || 'Servicio',
        status: 'reviewing',
      })
      if (!emailSent) {
        return NextResponse.json({ error: 'El pedido se creó, pero el correo no pudo enviarse.' }, { status: 502 })
      }
    }
  }

  if (
    event.type === 'customer.subscription.created'
    || event.type === 'customer.subscription.updated'
    || event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata.user_id
    const serviceId = subscription.metadata.service_id
    const requestCode = subscription.metadata.request_code
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

    let orderId: string | null = null
    if (requestCode) {
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', requestCode)
        .maybeSingle()
      orderId = order?.id || null
    }

    if (userId && serviceId) {
      const { error: subscriptionError } = await supabase.from('service_subscriptions').upsert({
        user_id: userId,
        service_id: serviceId,
        order_id: orderId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      }, { onConflict: 'stripe_subscription_id' })
      if (subscriptionError) {
        console.error('[stripe/webhook] No se pudo sincronizar la suscripción', subscriptionError)
        return NextResponse.json({ error: 'No se pudo sincronizar la suscripción' }, { status: 500 })
      }
    } else {
      const { error: subscriptionError } = await supabase.from('service_subscriptions').update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_customer_id: customerId,
      }).eq('stripe_subscription_id', subscription.id)
      if (subscriptionError) {
        console.error('[stripe/webhook] No se pudo actualizar la suscripción', subscriptionError)
        return NextResponse.json({ error: 'No se pudo actualizar la suscripción' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
