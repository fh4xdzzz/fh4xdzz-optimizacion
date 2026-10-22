import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe-server'
import { licenseAdmin } from '@/lib/dulcan-license-service'

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
    const isCart = checkout.metadata?.checkout_flow === 'cart_v1'
    let cart: { status: string; items: { id: string; kind?: string; name: string }[] } | null = null
    if (isCart) {
      const found = await supabase.from('checkout_carts').select('status,items').eq('id', checkout.metadata!.cart_id).eq('user_id', session.user.id).eq('stripe_session_id', checkout.id).maybeSingle()
      if (found.error || !found.data) throw new Error('Carrito de pago no encontrado')
      cart = found.data
    }
    const serviceItems = cart && Array.isArray(cart.items) ? cart.items.filter(item => item.kind !== 'license') : []
    const hasLicense = Boolean(isCart && checkout.metadata?.purchase_id)
    let licenseReady = false
    if (hasLicense) {
      const found = await licenseAdmin().from('software_licenses').select('id').eq('purchase_id', checkout.metadata!.purchase_id).eq('user_id', session.user.id).eq('status', 'active').maybeSingle()
      if (found.error) throw new Error('No se pudo consultar la licencia')
      licenseReady = Boolean(found.data)
    }
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
    if (hasLicense) serviceName = serviceItems.length ? `Dulcan Optimizer + ${serviceItems.length} ${serviceItems.length === 1 ? 'servicio' : 'servicios'}` : 'Dulcan Optimizer'
    const hasServices = isCart ? serviceItems.length > 0 : true
    const fulfillmentReady = isCart ? cart?.status === 'paid' && (!hasLicense || licenseReady) && (!hasServices || Boolean(order)) : Boolean(order)

    return NextResponse.json({
      paymentStatus: checkout.payment_status,
      customerEmail: checkout.customer_details?.email || checkout.customer_email || session.user.email,
      amount: Number(checkout.amount_total || 0) / 100,
      currency: (checkout.currency || 'usd').toUpperCase(),
      serviceName,
      hasLicense,
      hasServices,
      licenseReady,
      fulfillmentReady,
      serviceIds: serviceItems.map(item => item.id),
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
