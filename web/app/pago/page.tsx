'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

function PaymentPageContent() {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (!orderId) {
      router.push('/pedidos')
      return
    }

    loadOrder()
  }, [orderId, router])

  const loadOrder = async () => {
    try {
      const session = await getSession()
      if (!session) {
        router.push('/auth/login?redirect=/pago?orderId=' + orderId)
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(*)')
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
      router.push('/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const createPayPalOrder = async () => {
    try {
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.price,
          description: order.services?.name || 'Servicio',
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error creating PayPal order')
      
      setPaypalOrderId(data.id)
      
      // Cargar PayPal SDK y renderizar botones
      const paypal = await (window as any).paypal
      if (paypal) {
        paypal.Buttons({
          createOrder: () => data.id,
          onApprove: async (data: any) => {
            try {
              const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paypalOrderId: data.orderID }),
              })

              const captureData = await response.json()
              if (!response.ok) throw new Error(captureData.error || 'Error capturing payment')
              
              setPaymentSuccess(true)
              setTimeout(() => {
                router.push('/pedidos')
              }, 3000)
            } catch (error) {
              setPaymentError('Error al procesar el pago. Inténtalo de nuevo.')
            }
          },
          onError: (err: any) => {
            setPaymentError('Error con PayPal. Inténtalo de nuevo.')
          },
        }).render('#paypal-button-container')
      }
    } catch (error) {
      setPaymentError('Error al crear la orden de PayPal. Inténtalo de nuevo.')
    }
  }

  useEffect(() => {
    if (order && !paypalOrderId) {
      // Cargar PayPal SDK
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`
      script.addEventListener('load', () => {
        createPayPalOrder()
      })
      document.body.appendChild(script)
    }
  }, [order])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando...</p>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-green-500/50">
              <CardHeader>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">¡Pago Exitoso!</CardTitle>
                  <CardDescription className="mt-2">
                    Tu pago ha sido procesado correctamente
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-muted mb-4">Serás redirigido a tus pedidos...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Pagar con PayPal</CardTitle>
              <CardDescription>
                Completa el pago para tu pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-card p-4 rounded-lg border border-border">
                  <div className="text-sm text-muted mb-1">Número de pedido</div>
                  <div className="text-xl font-bold">{order?.order_number}</div>
                </div>

                <div className="bg-card p-4 rounded-lg border border-border">
                  <div className="text-sm text-muted mb-1">Servicio</div>
                  <div className="text-xl font-bold">{order?.services?.name}</div>
                </div>

                <div className="bg-card p-4 rounded-lg border border-border">
                  <div className="text-sm text-muted mb-1">Monto a pagar</div>
                  <div className="text-3xl font-bold text-primary">${order?.price?.toFixed(2)} USD</div>
                </div>

                {paymentError && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm">
                    {paymentError}
                  </div>
                )}

                <div id="paypal-button-container" className="min-h-[50px]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando...</p>
          </div>
        </section>
        <Footer />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  )
}
