import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getStripe } from '@/lib/stripe-server'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(320),
  website: z.string().max(0).optional(),
  items: z.array(z.object({
    id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(20),
})

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Revisa tus datos y los productos seleccionados.' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripe = getStripe()
  if (!url || !key || !stripe) return NextResponse.json({ error: 'El pago no está disponible temporalmente.' }, { status: 503 })
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const quantities = new Map<number, number>()
  for (const item of parsed.data.items) quantities.set(item.id, Math.min(10, (quantities.get(item.id) || 0) + item.quantity))
  const ids = [...quantities.keys()]
  const { data: products, error } = await supabase.from('store_products')
    .select('id, slug, name, description, price, image_url, product_type, inventory_count')
    .in('id', ids).eq('is_active', true)
  if (error || !products || products.length !== ids.length) {
    return NextResponse.json({ error: 'Uno de los productos ya no está disponible.' }, { status: 400 })
  }

  if (products.some(product => product.slug === 'dulcan-optimizer')) {
    return NextResponse.json({ code: 'license_checkout_required', error: 'Compra Dulcan Optimizer desde su botón Comprar licencia para recibir tu key.' }, { status: 400 })
  }

  const unavailable = products.find((product) => {
    const quantity = quantities.get(Number(product.id)) || 1
    return product.inventory_count != null && quantity > Number(product.inventory_count)
  })
  if (unavailable) return NextResponse.json({ error: `No hay suficiente inventario de ${unavailable.name}.` }, { status: 400 })

  const items = products.map((product) => {
    const quantity = quantities.get(Number(product.id)) || 1
    return {
      id: Number(product.id),
      name: product.name,
      price: Number(product.price),
      quantity,
      product_type: product.product_type as 'digital' | 'physical',
      image_url: product.image_url as string | null,
      description: String(product.description || '').slice(0, 500),
    }
  })

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const orderNumber = `SHOP-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const { data: order, error: orderError } = await supabase.from('store_orders').insert({
    order_number: orderNumber,
    customer_name: parsed.data.name,
    customer_email: parsed.data.email.toLowerCase(),
    items: items.map(({ id, name, price, quantity, product_type }) => ({ id, name, price, quantity, product_type })),
    subtotal: subtotal.toFixed(2),
    total: subtotal.toFixed(2),
  }).select('id').single()
  if (orderError || !order) {
    console.error('[stripe/store] Error creando orden', orderError)
    return NextResponse.json({ error: 'No se pudo preparar la compra.' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: parsed.data.email.toLowerCase(),
      billing_address_collection: 'auto',
      ...(items.some((item) => item.product_type === 'physical')
        ? { shipping_address_collection: { allowed_countries: ['US', 'DO', 'PR', 'VE', 'CO', 'MX', 'ES'] as const } }
        : {}),
      metadata: { checkout_flow: 'guest_store_v1', store_order_id: order.id, order_number: orderNumber },
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name,
            description: item.description || undefined,
            ...(item.image_url?.startsWith('https://') ? { images: [item.image_url] } : {}),
          },
        },
      })),
      success_url: `${origin}/tienda/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/tienda?cancelled=1`,
    })
    await supabase.from('store_orders').update({ stripe_session_id: checkout.id }).eq('id', order.id)
    return NextResponse.json({ url: checkout.url })
  } catch (checkoutError) {
    console.error('[stripe/store] Error creando Checkout', checkoutError)
    await supabase.from('store_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id)
    return NextResponse.json({ error: 'Stripe no pudo preparar el pago.' }, { status: 500 })
  }
}
