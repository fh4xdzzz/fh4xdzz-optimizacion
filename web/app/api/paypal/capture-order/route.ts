import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getPayPalAccessToken, paypalBaseUrl } from '@/lib/paypal-server'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
  const { paypalOrderId, orderId } = await request.json()
  if (!paypalOrderId || !orderId) return NextResponse.json({ error: 'Pago inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: order } = await supabase.from('orders').select('id, price')
    .eq('id', orderId).eq('user_id', session.user.id).eq('status', 'pending').is('deleted_at', null).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado o ya procesado' }, { status: 404 })

  const accessToken = await getPayPalAccessToken()
  if (!accessToken) return NextResponse.json({ error: 'PayPal aún no está configurado' }, { status: 503 })
  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  const payload = await response.json()
  const purchase = payload.purchase_units?.[0]
  const capture = purchase?.payments?.captures?.[0]
  const valid = response.ok && payload.status === 'COMPLETED' && purchase?.custom_id === order.id &&
    capture?.status === 'COMPLETED' && capture?.amount?.currency_code === 'USD' &&
    capture?.amount?.value === Number(order.price).toFixed(2)
  if (!valid) return NextResponse.json({ error: 'El pago no pudo verificarse' }, { status: 422 })

  const { error } = await supabase.from('orders')
    .update({ status: 'reviewing', notes: `Pago PayPal confirmado. Captura: ${capture.id}` })
    .eq('id', order.id).eq('user_id', session.user.id).eq('status', 'pending')
  if (error) return NextResponse.json({ error: 'Pago recibido; no se pudo actualizar el pedido' }, { status: 500 })
  return NextResponse.json({ success: true, captureId: capture.id })
}
