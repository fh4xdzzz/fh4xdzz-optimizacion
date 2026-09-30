import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getPayPalAccessToken, paypalBaseUrl } from '@/lib/paypal-server'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
  const { orderId } = await request.json()
  if (!orderId) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: order } = await supabase.from('orders')
    .select('id, order_number, user_id, price, description, status')
    .eq('id', orderId).eq('user_id', session.user.id).is('deleted_at', null).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (order.status !== 'pending') return NextResponse.json({ error: 'Este pedido ya fue procesado' }, { status: 409 })

  const accessToken = await getPayPalAccessToken()
  if (!accessToken) return NextResponse.json({ error: 'PayPal aún no está configurado' }, { status: 503 })
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `order-${order.id}` },
    body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{
      custom_id: order.id, invoice_id: order.order_number,
      description: String(order.description).slice(0, 127),
      amount: { currency_code: 'USD', value: Number(order.price).toFixed(2) },
    }] }),
  })
  const payload = await response.json()
  if (!response.ok) return NextResponse.json({ error: 'PayPal no pudo crear el cobro' }, { status: 502 })
  return NextResponse.json({ id: payload.id })
}
