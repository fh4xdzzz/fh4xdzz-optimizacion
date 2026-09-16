import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, amount, description } = body

    if (!orderId || !amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Crear orden en PayPal
    const paypalApiUrl = process.env.PAYPAL_MODE === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com/v2/checkout/orders'
      : 'https://api-m.paypal.com/v2/checkout/orders'

    const response = await fetch(paypalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
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

    if (!response.ok) {
      console.error('PayPal error:', data)
      return NextResponse.json(
        { error: 'Failed to create PayPal order' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PayPal create order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
