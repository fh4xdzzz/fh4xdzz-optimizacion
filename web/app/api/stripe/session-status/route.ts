import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe-server'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })

  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId?.startsWith('cs_')) {
    return NextResponse.json({ error: 'Sesión de pago inválida.' }, { status: 400 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe no está configurado.' }, { status: 503 })

  try {
    const checkout = await stripe.checkout.sessions.retrieve(sessionId)
    if (checkout.metadata?.user_id !== session.user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este pago.' }, { status: 403 })
    }

    const supabase = await createClient()
    const orderQuery = supabase
      .from('orders')
      .select('id, order_number, status, services(name)')
      .eq('user_id', session.user.id)
      .is('deleted_at', null)

    const { data: order } = checkout.metadata?.order_id
      ? await orderQuery.eq('id', checkout.metadata.order_id).maybeSingle()
      : await orderQuery.ilike('notes', `Pago Stripe confirmado. Sesión: ${sessionId}%`).limit(1).maybeSingle()

    let serviceName = 'Servicio profesional'
    if (order?.services) {
      const service = Array.isArray(order.services) ? order.services[0] : order.services
      serviceName = service?.name || serviceName
    } else if (checkout.metadata?.service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('name')
        .eq('id', checkout.metadata.service_id)
        .maybeSingle()
      serviceName = service?.name || serviceName
    }

    return NextResponse.json({
      paymentStatus: checkout.payment_status,
      customerEmail: checkout.customer_details?.email || checkout.customer_email || session.user.email,
      amount: Number(checkout.amount_total || 0) / 100,
      currency: (checkout.currency || 'usd').toUpperCase(),
      serviceName,
      order: order ? {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
      } : null,
    })
  } catch (error) {
    console.error('[stripe/session-status] No se pudo verificar la sesión', error)
    return NextResponse.json({ error: 'No pudimos verificar el pago.' }, { status: 500 })
  }
}
