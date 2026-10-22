'use client'

import { useEffect, useState } from 'react'
import { CircleCheck, LoaderCircle, Mail, PackageCheck, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { clearStoreCart } from '@/lib/store-cart'

type Summary = { paymentStatus: string; orderNumber: string; customerEmail: string; items: Array<{ name: string; quantity: number }>; total: number; currency: string; status: string }

export default function StoreThanksClient({ sessionId }: { sessionId?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState(sessionId ? '' : 'No encontramos la referencia de esta compra.')
  const [checking, setChecking] = useState(Boolean(sessionId))

  useEffect(() => {
    if (!sessionId) return
    let active = true
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const verify = async () => {
      attempts += 1
      try {
        const response = await fetch(`/api/store/order-status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No pudimos verificar la compra.')
        if (!active) return
        setSummary(payload)
        if (payload.paymentStatus === 'paid') clearStoreCart('guest')
        if (payload.paymentStatus === 'paid' && payload.status !== 'paid' && attempts < 8) {
          timer = setTimeout(verify, 1500)
          return
        }
        setChecking(false)
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'No pudimos verificar la compra.')
        setChecking(false)
      }
    }
    void verify()
    return () => { active = false; if (timer) clearTimeout(timer) }
  }, [sessionId])

  const paid = summary?.paymentStatus === 'paid'
  return <div className="min-h-screen bg-background"><Navbar /><main className="px-4 pb-24 pt-32"><section className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15">{checking ? <LoaderCircle className="h-10 w-10 animate-spin text-primary" /> : <CircleCheck className={`h-10 w-10 ${paid ? 'text-emerald-400' : 'text-amber-300'}`} />}</div><h1 className="mt-6 text-4xl font-black">{checking ? 'Confirmando tu compra…' : paid ? '¡Compra confirmada!' : 'Estamos verificando el pago'}</h1><p className="mx-auto mt-4 max-w-2xl text-lg text-muted">{paid ? 'Tu compra quedó registrada. No necesitabas una cuenta para completar el pedido.' : 'Espera unos segundos mientras Stripe confirma la transacción.'}</p>{error ? <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{error}</div> : summary && <div className="mt-10 rounded-3xl border border-primary/25 bg-card/85 p-6 text-left"><div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-muted">Referencia</p><b className="font-mono text-primary">{summary.orderNumber}</b></div><strong className="text-3xl">{new Intl.NumberFormat('en-US', { style: 'currency', currency: summary.currency }).format(summary.total)}</strong></div><div className="grid gap-4 py-6 sm:grid-cols-3"><div><PackageCheck className="mb-2 h-6 w-6 text-primary" /><b>Productos</b><p className="mt-1 text-sm text-muted">{summary.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</p></div><div><Mail className="mb-2 h-6 w-6 text-primary" /><b>Confirmación</b><p className="mt-1 break-all text-sm text-muted">{summary.customerEmail}</p></div><div><ShieldCheck className="mb-2 h-6 w-6 text-emerald-400" /><b>Pago protegido</b><p className="mt-1 text-sm text-muted">Procesado directamente por Stripe.</p></div></div></div>}<Button href="/tienda" size="lg" className="mt-8">Volver a la tienda</Button></section></main><Footer /></div>
}
