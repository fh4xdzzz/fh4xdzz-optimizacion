'use client'

import { useEffect, useState } from 'react'
import { Check, CircleCheck, Clock3, LoaderCircle, Mail, MessageCircle, PackageCheck, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface PaymentSummary {
  paymentStatus: string
  customerEmail: string
  amount: number
  currency: string
  serviceName: string
  order: { id: string; orderNumber: string; status: string } | null
}

export default function PaymentSuccessClient({ sessionId }: { sessionId?: string }) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [error, setError] = useState(sessionId ? '' : 'No encontramos la referencia de este pago.')
  const [checking, setChecking] = useState(Boolean(sessionId))

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const verify = async () => {
      attempts += 1
      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No pudimos verificar el pago.')
        if (cancelled) return
        setSummary(payload)
        setError('')
        if (payload.paymentStatus === 'paid' && !payload.order && attempts < 8) {
          timer = setTimeout(verify, 1500)
          return
        }
        setChecking(false)
      } catch (verificationError) {
        if (cancelled) return
        setError(verificationError instanceof Error ? verificationError.message : 'No pudimos verificar el pago.')
        setChecking(false)
      }
    }

    verify()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [sessionId])

  const paid = summary?.paymentStatus === 'paid'
  const orderReady = Boolean(summary?.order)
  const formattedAmount = summary
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: summary.currency }).format(summary.amount)
    : ''

  const openSupport = () => {
    window.dispatchEvent(new CustomEvent('open-support-chat', {
      detail: { message: `Hola, necesito ayuda con mi pago${summary?.order?.orderNumber ? ` y el pedido ${summary.order.orderNumber}` : ''}.` },
    }))
  }

  return <div className="min-h-screen bg-background">
    <Navbar />
    <main className="relative overflow-hidden px-4 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.2),transparent_60%)]" />
      <section className="container relative mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 shadow-2xl shadow-emerald-500/20">
            {checking ? <LoaderCircle className="h-10 w-10 animate-spin text-primary" /> : paid ? <CircleCheck className="h-10 w-10 text-emerald-400" /> : <Clock3 className="h-10 w-10 text-amber-300" />}
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Pago seguro con Stripe</p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">{checking ? 'Confirmando tu pedido…' : paid ? '¡Pago confirmado!' : 'Estamos verificando el pago'}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">{paid ? 'Gracias por confiar en TheDulcanDesign. Tu solicitud ya está protegida y nuestro equipo fue notificado.' : 'No cierres esta página mientras revisamos la confirmación.'}</p>
        </div>

        {error ? <Card className="border-red-500/35 bg-red-500/5"><CardContent className="p-6 text-center"><p className="text-red-200">{error}</p><div className="mt-5 flex justify-center gap-3"><Button href="/pedidos">Ver mis pedidos</Button><Button variant="outline" onClick={openSupport}>Contactar soporte</Button></div></CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card shadow-2xl shadow-primary/10">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-6">
                <div><p className="text-sm text-muted">Servicio contratado</p><h2 className="mt-1 text-2xl font-bold">{summary?.serviceName || 'Preparando detalles…'}</h2></div>
                {summary && <p className="shrink-0 text-xl font-bold text-primary">{formattedAmount}</p>}
              </div>
              <div className="space-y-5 py-6">
                <div className="flex gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-5 w-5" /></div><div><h3 className="font-semibold">Pago recibido</h3><p className="mt-1 text-sm text-muted">Stripe confirmó la transacción de forma segura.</p></div></div>
                <div className="flex gap-4"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${orderReady ? 'bg-emerald-500 text-white' : 'bg-primary/20 text-primary'}`}>{orderReady ? <Check className="h-5 w-5" /> : <LoaderCircle className="h-5 w-5 animate-spin" />}</div><div><h3 className="font-semibold">Pedido creado</h3><p className="mt-1 text-sm text-muted">{orderReady ? `Referencia ${summary?.order?.orderNumber}` : 'Sincronizando el pago con tu área privada…'}</p></div></div>
                <div className="flex gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-muted">3</div><div><h3 className="font-semibold">Revisión del especialista</h3><p className="mt-1 text-sm text-muted">Te avisaremos cuando el equipo comience a trabajar.</p></div></div>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row"><Button href="/pedidos" size="lg" className="flex-1"><PackageCheck className="mr-2 h-5 w-5" />Ver seguimiento privado</Button><Button variant="outline" size="lg" onClick={openSupport}><MessageCircle className="mr-2 h-5 w-5" />Soporte</Button></div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-white/10"><CardContent className="p-5"><Mail className="mb-4 h-6 w-6 text-primary" /><h3 className="font-semibold">Confirmación privada</h3><p className="mt-2 break-all text-sm text-muted">{summary?.customerEmail ? `Los avisos se enviarán a ${summary.customerEmail}.` : 'Preparando tus datos de contacto.'}</p></CardContent></Card>
            <Card className="border-white/10"><CardContent className="p-5"><ShieldCheck className="mb-4 h-6 w-6 text-emerald-400" /><h3 className="font-semibold">Tus datos están protegidos</h3><p className="mt-2 text-sm leading-6 text-muted">La información de la tarjeta fue procesada directamente por Stripe y no se guarda en esta web.</p></CardContent></Card>
          </div>
        </div>}
      </section>
    </main>
    <Footer />
  </div>
}
