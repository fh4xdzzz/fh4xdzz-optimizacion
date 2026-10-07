import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe-server'
import { getDiscordService } from '@/lib/discord-integration'
import { sendOrderNotificationEmail } from '@/lib/order-notifications'
import { isSubscriptionRenewalInvoice } from '@/lib/stripe-payment'

type AdminClient = SupabaseClient

function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id || null
}

async function recordPayment(supabase: AdminClient, values: Record<string, string | number | boolean | null>) {
  const { data, error } = await supabase.from('payment_transactions').insert(values).select('id').maybeSingle()
  if (!error) return Boolean(data)
  if (error.code === '23505') return false
  throw new Error(`No se pudo registrar la transacción: ${error.message}`)
}

async function redeemCoupon(supabase: AdminClient, couponId: string | null) {
  if (!couponId) return
  const { error } = await supabase.rpc('increment_coupon_redemption', { p_coupon_id: couponId })
  if (error) throw new Error(`No se pudo registrar el uso del cupón: ${error.message}`)
}

async function processCheckout(supabase: AdminClient, event: Stripe.Event, checkout: Stripe.Checkout.Session) {
  if (checkout.payment_status !== 'paid' || !checkout.metadata?.user_id) return

  const metadata = checkout.metadata
  let orderId = metadata.order_id || null
  let serviceId = metadata.service_id || null
  let cartId: string | null = null
  let couponId = metadata.coupon_id || null
  let couponDiscount = Number(metadata.coupon_discount || 0)
  let shouldNotify = false

  if (metadata.checkout_flow === 'cart_v1' && metadata.cart_id) {
    cartId = metadata.cart_id
    const { data: cart, error: cartError } = await supabase.from('checkout_carts')
      .select('*').eq('id', cartId).eq('user_id', metadata.user_id).maybeSingle()
    if (cartError || !cart) throw new Error('No se encontró el carrito pagado.')

    couponId = cart.coupon_id || null
    couponDiscount = Number(cart.coupon_discount || 0)
    const { data: existingOrders, error: lookupError } = await supabase.from('orders')
      .select('id, service_id').eq('stripe_session_id', checkout.id).order('stripe_item_index')
    if (lookupError) throw new Error(`No se pudo comprobar el pedido: ${lookupError.message}`)

    if (existingOrders?.length) {
      orderId = existingOrders[0].id
      serviceId = existingOrders[0].service_id
    } else {
      const items = Array.isArray(cart.items) ? cart.items : []
      const subtotal = Number(cart.subtotal) || 1
      const totalCents = Number(checkout.amount_total || 0)
      let allocatedCents = 0
      const rows = items.map((item: { id: string; name: string; price: number }, index: number) => {
        const cents = index === items.length - 1 ? totalCents - allocatedCents : Math.round(totalCents * Number(item.price) / subtotal)
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
          stripe_session_id: checkout.id,
          stripe_item_index: index,
          coupon_id: couponId,
          coupon_discount: index === 0 ? couponDiscount : 0,
        }
      })
      const { data: createdOrders, error: createError } = await supabase.from('orders').insert(rows).select('id, service_id')
      if (createError || !createdOrders?.length) throw new Error(`No se pudieron crear los pedidos del carrito: ${createError?.message || 'sin filas'}`)
      orderId = createdOrders[0].id
      serviceId = createdOrders[0].service_id
      shouldNotify = true
    }

    const { error: paidError } = await supabase.from('checkout_carts')
      .update({ status: 'paid', paid_at: new Date(event.created * 1000).toISOString() }).eq('id', cart.id).neq('status', 'paid')
    if (paidError) throw new Error(`No se pudo confirmar el carrito: ${paidError.message}`)
  } else if (metadata.checkout_flow === 'service_request_v2' && metadata.service_id) {
    serviceId = metadata.service_id
    const { data: existingOrder, error: lookupError } = await supabase.from('orders')
      .select('id').eq('stripe_session_id', checkout.id).eq('stripe_item_index', 0).maybeSingle()
    if (lookupError) throw new Error(`No se pudo comprobar el pedido: ${lookupError.message}`)

    if (existingOrder) {
      orderId = existingOrder.id
    } else {
      const { data: createdOrder, error: createError } = await supabase.from('orders').insert({
        order_number: metadata.request_code || `PAID-${checkout.id}`,
        user_id: metadata.user_id,
        service_id: metadata.service_id,
        status: 'reviewing',
        client_name: metadata.client_name || 'Cliente',
        client_email: checkout.customer_details?.email || checkout.customer_email || '',
        client_discord: metadata.client_discord || null,
        description: metadata.description || 'Solicitud pagada desde Stripe.',
        price: Number(checkout.amount_total || 0) / 100,
        notes: `Pago Stripe confirmado. Sesión: ${checkout.id}`,
        stripe_session_id: checkout.id,
        stripe_item_index: 0,
        coupon_id: couponId,
        coupon_discount: couponDiscount,
      }).select('id').single()
      if (createError || !createdOrder) throw new Error(`No se pudo crear el pedido: ${createError?.message || 'sin fila'}`)
      orderId = createdOrder.id
      shouldNotify = true
    }
  } else if (metadata.order_id) {
    const { data: updatedOrder, error } = await supabase.from('orders').update({
      status: 'reviewing',
      notes: `Pago Stripe confirmado. Sesión: ${checkout.id}`,
      stripe_session_id: checkout.id,
      stripe_item_index: 0,
    }).eq('id', metadata.order_id).eq('user_id', metadata.user_id).eq('status', 'pending').select('id, service_id').maybeSingle()
    if (error) throw new Error(`No se pudo actualizar el pedido: ${error.message}`)
    shouldNotify = Boolean(updatedOrder)
    serviceId = updatedOrder?.service_id || serviceId
  }

  const subscriptionId = stripeId(checkout.subscription)
  const customerId = stripeId(checkout.customer)
  if (metadata.billing_type === 'subscription' && subscriptionId && serviceId) {
    const { error } = await supabase.from('service_subscriptions').upsert({
      user_id: metadata.user_id, service_id: serviceId, order_id: orderId,
      stripe_customer_id: customerId, stripe_subscription_id: subscriptionId,
      status: 'active', cancel_at_period_end: false,
    }, { onConflict: 'stripe_subscription_id' })
    if (error) throw new Error(`No se pudo registrar la suscripción: ${error.message}`)
  }

  const transactionCreated = await recordPayment(supabase, {
    stripe_event_id: event.id,
    stripe_session_id: checkout.id,
    stripe_invoice_id: stripeId(checkout.invoice),
    stripe_payment_intent_id: stripeId(checkout.payment_intent),
    stripe_subscription_id: subscriptionId,
    user_id: metadata.user_id,
    service_id: serviceId,
    order_id: orderId,
    checkout_cart_id: cartId,
    coupon_id: couponId,
    payment_kind: metadata.billing_type === 'subscription' ? 'subscription_initial' : 'one_time',
    livemode: event.livemode,
    amount: Number(checkout.amount_total || 0) / 100,
    discount_amount: couponDiscount,
    currency: checkout.currency || 'usd',
    paid_at: new Date(event.created * 1000).toISOString(),
  })
  if (transactionCreated) await redeemCoupon(supabase, couponId)
  if (!orderId) return

  const { data: order, error: orderError } = await supabase.from('orders')
    .select('id, order_number, user_id, service_id, client_name, client_email').eq('id', orderId).maybeSingle()
  if (orderError || !order) throw new Error('No se pudo recuperar el pedido para notificar.')
  const [{ data: service }, { data: user }] = await Promise.all([
    supabase.from('services').select('name').eq('id', order.service_id).maybeSingle(),
    supabase.from('users').select('discord_id').eq('id', order.user_id).maybeSingle(),
  ])
  if (shouldNotify) {
    await Promise.allSettled([getDiscordService().notifyOrderPaid({
      order_id: order.id, order_number: order.order_number, service_name: service?.name || 'Servicio',
      customer_name: order.client_name, discord_user_id: user?.discord_id || undefined,
    })])
  }

  const emailSent = await sendOrderNotificationEmail({
    kind: 'paid', eventId: `order-paid-v2-${order.id}`, orderId: order.id,
    orderNumber: order.order_number, customerName: order.client_name,
    customerEmail: order.client_email, serviceName: service?.name || 'Servicio', status: 'reviewing',
  })
  if (!emailSent) throw new Error('El pedido se creó, pero el correo no pudo enviarse.')
}

async function processInvoicePaid(supabase: AdminClient, event: Stripe.Event, invoice: Stripe.Invoice) {
  if (!isSubscriptionRenewalInvoice(invoice.billing_reason)) return
  const details = invoice.parent?.subscription_details
  const subscriptionId = stripeId(details?.subscription)
  if (!subscriptionId) return

  const { data: subscription, error } = await supabase.from('service_subscriptions')
    .select('user_id, service_id, order_id').eq('stripe_subscription_id', subscriptionId).maybeSingle()
  const metadata = details?.metadata || {}
  if (error) throw new Error(`No se pudo buscar la suscripción: ${error.message}`)
  const userId = subscription?.user_id || metadata.user_id || null
  const serviceId = subscription?.service_id || metadata.service_id || null
  if (!userId || !serviceId) throw new Error('La renovación no contiene una suscripción reconocida.')

  await recordPayment(supabase, {
    stripe_event_id: event.id, stripe_session_id: null, stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: null, stripe_subscription_id: subscriptionId,
    user_id: userId, service_id: serviceId, order_id: subscription?.order_id || null,
    checkout_cart_id: null, coupon_id: null, payment_kind: 'subscription_renewal',
    livemode: event.livemode,
    amount: Number(invoice.amount_paid || 0) / 100, discount_amount: 0,
    currency: invoice.currency || 'usd',
    paid_at: new Date((invoice.status_transitions.paid_at || event.created) * 1000).toISOString(),
  })
}

async function processSubscription(supabase: AdminClient, subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id
  const serviceId = subscription.metadata.service_id
  const requestCode = subscription.metadata.request_code
  const customerId = stripeId(subscription.customer)
  let orderId: string | null = null
  if (requestCode) {
    const { data: order } = await supabase.from('orders').select('id').eq('order_number', requestCode).maybeSingle()
    orderId = order?.id || null
  }
  if (userId && serviceId) {
    const { error } = await supabase.from('service_subscriptions').upsert({
      user_id: userId, service_id: serviceId, order_id: orderId,
      stripe_customer_id: customerId, stripe_subscription_id: subscription.id,
      status: subscription.status, cancel_at_period_end: subscription.cancel_at_period_end,
    }, { onConflict: 'stripe_subscription_id' })
    if (error) throw new Error(`No se pudo sincronizar la suscripción: ${error.message}`)
  } else {
    const { error } = await supabase.from('service_subscriptions').update({
      status: subscription.status, cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_customer_id: customerId,
    }).eq('stripe_subscription_id', subscription.id)
    if (error) throw new Error(`No se pudo actualizar la suscripción: ${error.message}`)
  }
}

async function processEvent(supabase: AdminClient, event: Stripe.Event) {
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await processCheckout(supabase, event, event.data.object as Stripe.Checkout.Session)
  } else if (event.type === 'invoice.paid') {
    await processInvoicePaid(supabase, event, event.data.object as Stripe.Invoice)
  } else if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    await processSubscription(supabase, event.data.object as Stripe.Subscription)
  }
}

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
  const { data: claimed, error: claimError } = await supabase.rpc('claim_stripe_webhook_event', { p_event_id: event.id, p_event_type: event.type })
  if (claimError) {
    console.error('[stripe/webhook] No se pudo reclamar el evento', claimError)
    return NextResponse.json({ error: 'No se pudo registrar el evento.' }, { status: 500 })
  }
  if (!claimed) return NextResponse.json({ received: true, duplicate: true })

  try {
    await processEvent(supabase, event)
    const now = new Date().toISOString()
    const { error } = await supabase.from('stripe_webhook_events').update({ status: 'completed', processed_at: now, updated_at: now }).eq('event_id', event.id)
    if (error) throw new Error(`No se pudo completar el evento: ${error.message}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[stripe/webhook] Error procesando evento', { eventId: event.id, eventType: event.type, message })
    await supabase.from('stripe_webhook_events').update({ status: 'failed', last_error: message.slice(0, 2000), updated_at: new Date().toISOString() }).eq('event_id', event.id)
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 500 })
  }
}
