'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

interface Order { id: string; order_number: string; user_id: string; price: number; status: string; services?: { name?: string } | null }

function PaymentPageContent() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useSearchParams()
  const orderId = params.get('orderId')
  const cancelled = params.get('cancelled') === '1'

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return router.replace('/pedidos')
      const session = await getSession()
      if (!session) return router.replace(`/auth/login?redirect=/pago?orderId=${orderId}`)
      const { data } = await createClient().from('orders').select('id, order_number, user_id, price, status, services(name)')
        .eq('id', orderId).eq('user_id', session.user.id).is('deleted_at', null).maybeSingle()
      if (!data) setError('No se encontró este pedido.')
      else setOrder(data as unknown as Order)
      setLoading(false)
    }
    loadOrder()
  }, [orderId, router])

  async function startCheckout() {
    if (!order) return
    setPaying(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id }),
      })
      const responseText = await response.text()
      let payload: { url?: string; error?: string } = {}
      if (responseText) {
        try {
          payload = JSON.parse(responseText) as { url?: string; error?: string }
        } catch {
          throw new Error('El servidor de pagos devolvió una respuesta inválida. Inténtalo nuevamente.')
        }
      }
      if (!response.ok || !payload.url) throw new Error(payload.error || 'No se pudo abrir el pago')
      window.location.assign(payload.url)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'No se pudo abrir el pago')
      setPaying(false)
    }
  }

  return <div className="min-h-screen bg-background"><Navbar /><section className="px-4 pb-20 pt-32">
    <div className="container mx-auto max-w-2xl"><Card><CardHeader><CardTitle>Pagar pedido</CardTitle>
      <CardDescription>Pago seguro con tarjeta procesado por Stripe.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {loading && <p>Cargando pedido...</p>}
        {order && <div className="rounded-lg border border-border bg-card p-4"><p className="text-sm text-muted">{order.order_number}</p>
          <p className="text-xl font-bold">{order.services?.name || 'Servicio'}</p><p className="mt-2 text-3xl font-bold text-primary">${Number(order.price).toFixed(2)} USD</p></div>}
        {cancelled && <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-300">Pago cancelado. No se realizó ningún cargo.</p>}
        {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300">{error}</p>}
        {order?.status === 'pending' && <Button className="w-full" size="lg" onClick={startCheckout} disabled={paying}>{paying ? 'Abriendo pago seguro…' : 'Pagar con tarjeta'}</Button>}
        {order && order.status !== 'pending' && <p className="rounded-lg bg-green-500/10 p-4 text-green-300">Este pedido ya fue procesado.</p>}
        <p className="text-center text-xs text-muted">Los datos de tu tarjeta se introducen directamente en Stripe y no se guardan en esta web.</p>
      </CardContent></Card></div>
  </section><Footer /></div>
}

export default function PaymentPage() {
  return <Suspense fallback={<div className="min-h-screen bg-background"><Navbar /><p className="pt-32 text-center">Cargando...</p></div>}><PaymentPageContent /></Suspense>
}
