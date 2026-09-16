import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, amount, description } = body

    console.log('PayPal create-order request:', { orderId, amount, description })

    if (!orderId || !amount || !description) {
      console.error('Missing required fields:', { orderId, amount, description })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verificar variables de entorno
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const paypalMode = process.env.PAYPAL_MODE

    console.log('PayPal config:', {
      clientId: clientId ? 'Set' : 'Not set',
      clientSecret: clientSecret ? 'Set' : 'Not set',
      paypalMode
    })

    if (!clientId || !clientSecret) {
      console.error('PayPal credentials not set')
      return NextResponse.json(
        { error: 'PayPal credentials not configured' },
        { status: 500 }
      )
    }

    // Crear orden en PayPal
    const paypalApiUrl = paypalMode === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com/v2/checkout/orders'
      : 'https://api-m.paypal.com/v2/checkout/orders'

    console.log('PayPal API URL:', paypalApiUrl)

    const response = await fetch(paypalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description,
            custom_id: orderId,
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
          },
        ],
      }),
    })

    const data = await response.json()

    console.log('PayPal response:', {
      status: response.status,
      ok: response.ok,
      data
    })

    if (!response.ok) {
      console.error('PayPal error:', data)
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: data },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PayPal create order error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
