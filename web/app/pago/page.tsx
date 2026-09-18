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
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (!orderId) {
      router.push('/pedidos')
      return
    }

    loadOrderAndMarkAsPaid()
  }, [orderId, router])

  const loadOrderAndMarkAsPaid = async () => {
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

      // Marcar orden como pagada automáticamente
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'reviewing' })
        .eq('id', orderId)

      if (updateError) {
        console.error('Error marking order as paid:', updateError)
      } else {
        setPaymentSuccess(true)
        // Redirigir a pedidos después de 3 segundos
        setTimeout(() => {
          router.push('/pedidos')
        }, 3000)
      }
    } catch (error) {
      console.error('Error loading order:', error)
      router.push('/pedidos')
    } finally {
      setLoading(false)
    }
  }

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
                  <CardTitle className="text-2xl">¡Pedido Confirmado!</CardTitle>
                  <CardDescription className="mt-2">
                    Tu pedido ha sido procesado correctamente
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted mb-1">Número de pedido</div>
                    <div className="text-xl font-bold">{order?.order_number}</div>
                  </div>

                  <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted mb-1">Servicio</div>
                    <div className="text-xl font-bold">{order?.services?.name}</div>
                  </div>

                  <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted mb-1">Monto</div>
                    <div className="text-3xl font-bold text-primary">${order?.price?.toFixed(2)} USD</div>
                  </div>

                  <div className="text-center">
                    <p className="text-muted mb-4">Serás redirigido a tus pedidos...</p>
                  </div>
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
              <CardTitle>Procesando Pedido</CardTitle>
              <CardDescription>
                Tu pedido está siendo procesado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p>Cargando...</p>
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
