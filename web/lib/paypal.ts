import { loadScript } from '@paypal/paypal-js'

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export interface PayPalOrder {
  id: string
  status: string
  purchase_units: Array<{
    amount: {
      currency_code: string
      value: string
    }
  }>
}

export interface CreateOrderParams {
  amount: number
  currency?: string
  description: string
  orderId: string
}

export class PayPalService {
  private paypal: any = null

  async loadPayPal() {
    if (!this.paypal) {
      this.paypal = await loadScript({
        'client-id': PAYPAL_CLIENT_ID!,
        currency: 'USD',
      } as any)
    }
    return this.paypal
  }

  async createOrder(params: CreateOrderParams): Promise<string> {
    const paypal = await this.loadPayPal()
    
    const order = await paypal.Buttons({
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [
            {
              description: params.description,
              custom_id: params.orderId,
              amount: {
                currency_code: params.currency || 'USD',
                value: params.amount.toFixed(2),
              },
            },
          ],
        })
      },
    })

    return order
  }

  async approveOrder(orderId: string): Promise<PayPalOrder> {
    const paypal = await this.loadPayPal()
    
    const order = await paypal.Buttons({
      onApprove: async (data: any, actions: any) => {
        return actions.order.capture()
      },
    })

    return order
  }
}

export const paypalService = new PayPalService()
