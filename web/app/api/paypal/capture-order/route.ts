import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paypalOrderId } = body

    if (!paypalOrderId) {
      return NextResponse.json(
        { error: 'Missing PayPal order ID' },
        { status: 400 }
      )
    }

    // Capturar el pago en PayPal
    const paypalApiUrl = process.env.PAYPAL_MODE === 'sandbox'
      ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`
      : `https://api-m.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`

    const response = await fetch(paypalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('PayPal capture error:', data)
      return NextResponse.json(
        { error: 'Failed to capture PayPal payment' },
        { status: 500 }
      )
    }

    // Si el pago fue exitoso, actualizar el estado del pedido en Supabase
    if (data.status === 'COMPLETED') {
      const supabase = createClient()
      const customId = data.purchase_units[0]?.custom_id

      if (customId) {
        // Verificar que el pedido existe y no está soft-deleted
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('id', customId)
          .is('deleted_at', null)
          .single()

        if (order) {
          await supabase
            .from('orders')
            .update({ status: 'paid' })
            .eq('id', customId)
        }
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PayPal capture order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
