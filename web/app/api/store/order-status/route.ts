import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe-server'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId?.startsWith('cs_')) return NextResponse.json({ error: 'Referencia inválida.' }, { status: 400 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripe = getStripe()
  if (!url || !key || !stripe) return NextResponse.json({ error: 'No se pudo verificar la compra.' }, { status: 503 })

  const checkout = await stripe.checkout.sessions.retrieve(sessionId)
  if (checkout.metadata?.checkout_flow !== 'guest_store_v1' || !checkout.metadata.store_order_id) {
    return NextResponse.json({ error: 'Esta compra no pertenece a la tienda.' }, { status: 404 })
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: order, error } = await supabase.from('store_orders')
    .select('order_number, customer_email, items, total, currency, status')
    .eq('id', checkout.metadata.store_order_id).eq('stripe_session_id', sessionId).maybeSingle()
  if (error || !order) return NextResponse.json({ error: 'No encontramos la compra.' }, { status: 404 })
  return NextResponse.json({
    paymentStatus: checkout.payment_status,
    orderNumber: order.order_number,
    customerEmail: order.customer_email,
    items: order.items,
    total: Number(order.total),
    currency: order.currency,
    status: order.status,
  })
}
