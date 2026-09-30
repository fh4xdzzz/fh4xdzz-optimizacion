'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadScript } from '@paypal/paypal-js'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

interface Order {
  id: string
  order_number: string
  user_id: string
  price: number
  status: string
  services?: { name?: string } | null
}

function PaymentPageContent() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paid, setPaid] = useState(false)
  const paypalContainer = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)
  const router = useRouter()
  const orderId = useSearchParams().get('orderId')

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return router.replace('/pedidos')
      const session = await getSession()
      if (!session) return router.replace(`/auth/login?redirect=/pago?orderId=${orderId}`)
      const { data } = await createClient().from('orders').select('id, order_number, user_id, price, status, services(name)')
        .eq('id', orderId).eq('user_id', session.user.id).is('deleted_at', null).maybeSingle()
      if (!data) {
        setError('No se encontró este pedido.')
      } else {
        setOrder(data as unknown as Order)
      }
      setLoading(false)
    }
    loadOrder()
  }, [orderId, router])

  useEffect(() => {
    if (!order || order.status !== 'pending' || rendered.current || !paypalContainer.current) return
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId) return
    rendered.current = true
    loadScript({ clientId, currency: 'USD', intent: 'capture' }).then(paypal => {
      if (!paypal?.Buttons || !paypalContainer.current) throw new Error('PayPal no está disponible')
      return paypal.Buttons({
        style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
        createOrder: async () => {
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id }),
          })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload.error || 'No se pudo iniciar el pago')
          return payload.id
        },
        onApprove: async data => {
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, paypalOrderId: data.orderID }),
          })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload.error || 'No se pudo verificar el pago')
          setPaid(true)
          setTimeout(() => router.push('/pedidos'), 2500)
        },
        onCancel: () => setError('El pago fue cancelado. No se realizó ningún cargo.'),
        onError: () => setError('No se pudo completar el pago. Inténtalo nuevamente.'),
      }).render(paypalContainer.current)
    }).catch(() => setError('No se pudo cargar PayPal. Inténtalo nuevamente.'))
  }, [order, router])

  return <div className="min-h-screen bg-background"><Navbar /><section className="px-4 pb-20 pt-32">
    <div className="container mx-auto max-w-2xl"><Card className={paid ? 'border-green-500/50' : ''}>
      <CardHeader><CardTitle>{paid ? '¡Pago confirmado!' : 'Pagar pedido'}</CardTitle>
        <CardDescription>{paid ? 'Recibimos tu pago y comenzaremos a revisar el pedido.' : 'Pago seguro procesado por PayPal.'}</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {loading && <p>Cargando pedido...</p>}
        {order && <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted">{order.order_number}</p>
          <p className="text-xl font-bold">{order.services?.name || 'Servicio'}</p>
          <p className="mt-2 text-3xl font-bold text-primary">${Number(order.price).toFixed(2)} USD</p>
        </div>}
        {order && order.status !== 'pending' && !paid && <p className="rounded-lg bg-yellow-500/10 p-4 text-yellow-300">Este pedido ya fue procesado.</p>}
        {(error || (order?.status === 'pending' && !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID)) && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">{error || 'Los pagos todavía no están configurados. Contacta a soporte.'}</p>}
        {!paid && order?.status === 'pending' && <div ref={paypalContainer} />}
        {paid && <p className="text-center text-green-400">Redirigiendo a tus pedidos…</p>}
      </CardContent>
    </Card></div>
  </section><Footer /></div>
}

export default function PaymentPage() {
  return <Suspense fallback={<div className="min-h-screen bg-background"><Navbar /><p className="pt-32 text-center">Cargando...</p></div>}><PaymentPageContent /></Suspense>
}
