'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, Copy, Download, FileArchive, MessageCircle, MonitorCog, PackageCheck, Paperclip, RotateCcw, ShieldCheck, UserRound } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { useNotificationStore } from '@/lib/notifications-store'

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  reviewing: { label: 'En revisión', tone: 'border-blue-400/30 bg-blue-500/10 text-blue-300' },
  in_progress: { label: 'En proceso', tone: 'border-violet-400/30 bg-violet-500/10 text-violet-300' },
  waiting_client: { label: 'Esperando tu respuesta', tone: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
  completed: { label: 'Completado', tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' },
  cancelled: { label: 'Cancelado', tone: 'border-red-400/30 bg-red-500/10 text-red-300' },
}

const TRACKING_STEPS = [
  { key: 'reviewing', label: 'Pago confirmado', description: 'Revisamos tu solicitud y preparamos el trabajo.' },
  { key: 'in_progress', label: 'Servicio en proceso', description: 'Nuestro equipo está trabajando en tu configuración.' },
  { key: 'completed', label: 'Entrega y soporte', description: 'Recibes el resultado y el soporte posterior incluido.' },
]

const STATUS_PROGRESS: Record<string, number> = { reviewing: 1, in_progress: 2, waiting_client: 2, completed: 3, cancelled: 0 }

interface Order {
  id: string
  order_number: string
  service_id: string
  service_name: string
  client_name: string
  client_email: string
  client_discord?: string | null
  description: string
  price: number
  status: string
  assigned_to?: string | null
  estimated_completion?: string | null
  actual_completion?: string | null
  created_at: string
  updated_at: string
}

interface OrderEvent {
  id: string
  event_type: string
  description: string | null
  new_status: string | null
  created_at: string
}

interface Deliverable {
  id: string
  fileName: string
  contentType: string
  fileSize: number
  note: string | null
  createdAt: string
  downloadUrl: string | null
}

interface OptimizerReport {
  id: string
  app_version: string
  device_name: string | null
  created_at: string
  report: {
    latest?: { capturedAt: string; hardware: unknown[]; system: unknown[]; network: unknown[]; obs: unknown[] } | null
    baseline?: { capturedAt: string } | null
    actions?: unknown[]
  }
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<OrderEvent[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loadingDeliverables, setLoadingDeliverables] = useState(false)
  const [optimizerReports, setOptimizerReports] = useState<OptimizerReport[]>([])
  const [optimizerCode, setOptimizerCode] = useState<{ code: string; expiresAt: string } | null>(null)
  const [loadingOptimizer, setLoadingOptimizer] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const notifyInfo = useNotificationStore(state => state.info)

  const loadOrders = useCallback(async () => {
    const session = await getSession()
    if (!session) {
      setOrders([])
      setLoading(false)
      return
    }

    setUserId(session.user.id)
    const { data, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, service_id, client_name, client_email, client_discord, description, price, status, assigned_to, estimated_completion, actual_completion, created_at, updated_at, services(name)')
      .eq('user_id', session.user.id)
      .neq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (ordersError) {
      setError('No pudimos cargar tus pedidos. Inténtalo nuevamente.')
      setLoading(false)
      return
    }

    const mapped = (data || []).map((order: any) => ({
      ...order,
      service_name: Array.isArray(order.services) ? order.services[0]?.name : order.services?.name,
    })) as Order[]
    setOrders(mapped)
    setSelectedId(current => current && mapped.some(order => order.id === current) ? current : mapped[0]?.id || null)
    setError('')
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadOrders() }, [loadOrders])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`client-orders-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, payload => {
        if (payload.eventType === 'UPDATE' && payload.old && payload.new && payload.old.status !== payload.new.status) {
          const nextStatus = STATUS_LABELS[String(payload.new.status)]?.label || String(payload.new.status)
          notifyInfo(`Tu pedido cambió a: ${nextStatus}`)
        }
        loadOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadOrders, notifyInfo, supabase, userId])

  useEffect(() => {
    if (!selectedId) {
      setEvents([])
      setDeliverables([])
      setOptimizerReports([])
      setOptimizerCode(null)
      return
    }
    const loadEvents = async () => {
      const { data } = await supabase
        .from('order_events')
        .select('id, event_type, description, new_status, created_at')
        .eq('order_id', selectedId)
        .order('created_at', { ascending: false })
      setEvents((data || []) as OrderEvent[])
    }
    loadEvents()
    setLoadingDeliverables(true)
    fetch(`/api/orders/${selectedId}/deliverables`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(payload => setDeliverables(payload.deliverables || []))
      .catch(() => setDeliverables([]))
      .finally(() => setLoadingDeliverables(false))
    fetch(`/api/orders/${selectedId}/optimizer`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(payload => setOptimizerReports(payload.reports || []))
      .catch(() => setOptimizerReports([]))
    setOptimizerCode(null)
  }, [selectedId, supabase])

  const selectedOrder = orders.find(order => order.id === selectedId) || null
  const progress = selectedOrder ? STATUS_PROGRESS[selectedOrder.status] ?? 1 : 0
  const formatDate = (value?: string | null) => value
    ? new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Por confirmar'

  const openPrivateSupport = () => {
    if (!selectedOrder) return
    window.dispatchEvent(new CustomEvent('open-support-chat', {
      detail: { message: `Hola, necesito ayuda privada con mi pedido ${selectedOrder.order_number}.` },
    }))
  }

  const requestRevision = () => {
    if (!selectedOrder) return
    window.dispatchEvent(new CustomEvent('open-support-chat', {
      detail: { message: `Hola, quiero solicitar una revisión privada de la entrega del pedido ${selectedOrder.order_number}.` },
    }))
  }

  const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

  const createOptimizerCode = async () => {
    if (!selectedOrder || loadingOptimizer) return
    setLoadingOptimizer(true)
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/optimizer`, { method: 'POST' })
      const payload = await response.json() as { code?: string; expiresAt?: string; error?: string }
      if (!response.ok || !payload.code || !payload.expiresAt) throw new Error(payload.error || 'No se pudo generar el código.')
      setOptimizerCode({ code: payload.code, expiresAt: payload.expiresAt })
    } catch (optimizerError) {
      notifyInfo(optimizerError instanceof Error ? optimizerError.message : 'No se pudo generar el código.')
    } finally {
      setLoadingOptimizer(false)
    }
  }

  const copyOptimizerCode = async () => {
    if (!optimizerCode) return
    await navigator.clipboard.writeText(optimizerCode.code)
    notifyInfo('Código copiado. Pégalo en Dulcan Optimizer.')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-24 pt-32">
        <section className="container mx-auto mb-10 max-w-6xl">
          <div className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Área privada</div>
          <h1 className="text-4xl font-bold md:text-5xl">Seguimiento de tus pedidos</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">Consulta cada etapa, la fecha estimada y comunícate con nuestro equipo sin salir de la página.</p>
        </section>

        <section className="container mx-auto max-w-6xl">
          {loading ? (
            <div className="grid gap-6 lg:grid-cols-[330px_1fr]"><div className="h-64 animate-pulse rounded-2xl bg-white/5" /><div className="h-[520px] animate-pulse rounded-2xl bg-white/5" /></div>
          ) : error ? (
            <Card className="border-red-500/30"><CardContent className="p-8 text-center text-red-300">{error}</CardContent></Card>
          ) : orders.length === 0 ? (
            <Card className="border-dashed border-primary/30 bg-primary/5"><CardContent className="p-12 text-center"><PackageCheck className="mx-auto mb-5 h-14 w-14 text-primary" /><h2 className="text-2xl font-bold">Todavía no tienes pedidos confirmados</h2><p className="mx-auto mb-6 mt-3 max-w-lg text-muted">Los pedidos aparecerán aquí automáticamente después de completar el pago.</p><Button href="/servicios" size="lg">Explorar servicios</Button></CardContent></Card>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[330px_1fr]">
              <aside className="space-y-3 lg:sticky lg:top-28">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Tus pedidos ({orders.length})</p>
                {orders.map(order => {
                  const status = STATUS_LABELS[order.status] || { label: order.status, tone: 'border-white/10 bg-white/5 text-muted' }
                  return <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === order.id ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/10' : 'border-white/10 bg-card/70 hover:border-primary/30'}`}>
                    <div className="flex items-start justify-between gap-3"><span className="font-semibold">{order.service_name}</span><span className="text-sm font-bold text-primary">${Number(order.price).toFixed(2)}</span></div>
                    <p className="mt-2 text-xs text-muted">{order.order_number}</p>
                    <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs ${status.tone}`}>{status.label}</span>
                  </button>
                })}
              </aside>

              {selectedOrder && <div className="space-y-6">
                <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-2xl shadow-primary/5">
                  <CardHeader className="border-b border-white/10 p-6 md:p-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><CardDescription>{selectedOrder.order_number}</CardDescription><CardTitle className="mt-2 text-3xl">{selectedOrder.service_name}</CardTitle></div><span className={`w-fit rounded-full border px-3 py-1.5 text-sm ${STATUS_LABELS[selectedOrder.status]?.tone || ''}`}>{STATUS_LABELS[selectedOrder.status]?.label || selectedOrder.status}</span></div>
                  </CardHeader>
                  <CardContent className="space-y-8 p-6 md:p-8">
                    {selectedOrder.status === 'cancelled' ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">Este pedido fue cancelado. Puedes comunicarte con soporte si necesitas ayuda.</div> : <div className="grid gap-5 md:grid-cols-3">
                      {TRACKING_STEPS.map((step, index) => {
                        const done = progress > index
                        const active = progress === index + 1 && progress < 3
                        return <div key={step.key}><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full border ${done ? 'border-primary bg-primary text-white' : 'border-white/20 bg-white/5 text-muted'}`}>{done && !active ? <Check className="h-5 w-5" /> : index + 1}</div><h3 className={done ? 'font-semibold text-foreground' : 'font-semibold text-muted'}>{step.label}</h3><p className="mt-1 text-sm text-muted">{step.description}</p></div>
                      })}
                    </div>}

                    <div className="grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
                      <div className="rounded-xl bg-white/[0.03] p-4"><Clock3 className="mb-3 h-5 w-5 text-primary" /><p className="text-xs uppercase tracking-wider text-muted">Entrega estimada</p><p className="mt-1 font-medium">{formatDate(selectedOrder.estimated_completion)}</p></div>
                      <div className="rounded-xl bg-white/[0.03] p-4"><UserRound className="mb-3 h-5 w-5 text-primary" /><p className="text-xs uppercase tracking-wider text-muted">Responsable</p><p className="mt-1 font-medium">{selectedOrder.assigned_to ? 'Especialista asignado' : 'Equipo TheDulcanDesign'}</p></div>
                      <div className="rounded-xl bg-white/[0.03] p-4"><PackageCheck className="mb-3 h-5 w-5 text-primary" /><p className="text-xs uppercase tracking-wider text-muted">Última actualización</p><p className="mt-1 font-medium">{formatDate(selectedOrder.updated_at)}</p></div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/10 p-5"><p className="text-xs uppercase tracking-wider text-muted">Tu solicitud</p><p className="mt-3 break-words text-sm leading-6 text-foreground/90">{selectedOrder.description}</p></div>
                    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Canal privado del pedido</h3><p className="mt-1 text-sm text-muted">Escribe al equipo o envía capturas y archivos de hasta 4 MB.</p></div><Button onClick={openPrivateSupport} className="shrink-0"><MessageCircle className="mr-2 h-4 w-4" />Abrir soporte</Button></div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-card to-card">
                  <CardHeader>
                    <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300"><MonitorCog className="h-6 w-6" /></div><div><CardTitle className="text-xl">Dulcan Optimizer</CardTitle><CardDescription className="mt-1">Envía el diagnóstico de tu PC directamente a este pedido.</CardDescription></div></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted"><div className="mb-2 flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4 text-emerald-400" />Conexión privada y temporal</div>El código dura 30 minutos, funciona una sola vez y no comparte contraseñas ni archivos personales.</div>
                    {optimizerCode ? <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Código de conexión</p><p className="my-3 font-mono text-3xl font-black tracking-[0.18em] text-white">{optimizerCode.code}</p><p className="mb-4 text-xs text-muted">Vence {formatDate(optimizerCode.expiresAt)}</p><Button onClick={copyOptimizerCode} variant="outline" size="sm"><Copy className="mr-2 h-4 w-4" />Copiar código</Button></div> : <Button onClick={createOptimizerCode} disabled={loadingOptimizer}>{loadingOptimizer ? 'Generando…' : 'Conectar Dulcan Optimizer'}</Button>}
                    {optimizerReports.length > 0 && <div className="space-y-3 border-t border-white/10 pt-4"><p className="text-sm font-semibold">Diagnósticos recibidos ({optimizerReports.length})</p>{optimizerReports.slice(0, 3).map(report => <div key={report.id} className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{report.device_name || 'Equipo del cliente'}</p><p className="mt-1 text-xs text-muted">Optimizer {report.app_version} · {formatDate(report.created_at)}</p></div><span className="mt-2 w-fit rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300 sm:mt-0">Recibido</span></div>)}</div>}
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader><CardTitle className="text-xl">Entregas privadas</CardTitle><CardDescription>Archivos finales compartidos exclusivamente contigo.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {loadingDeliverables ? <div className="h-20 animate-pulse rounded-xl bg-white/5" /> : deliverables.length > 0 ? <>
                      {deliverables.map(file => <div key={file.id} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><FileArchive className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-medium">{file.fileName}</p><p className="mt-1 text-xs text-muted">{formatFileSize(file.fileSize)} · {formatDate(file.createdAt)}</p>{file.note && <p className="mt-2 break-words text-sm text-foreground/80">{file.note}</p>}</div></div>
                        {file.downloadUrl && <Button href={file.downloadUrl} target="_blank" rel="noopener noreferrer" variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Descargar</Button>}
                      </div>)}
                      <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">¿Necesitas un ajuste?</p><p className="mt-1 text-sm text-muted">Solicita una revisión y explica el cambio en el canal privado.</p></div><Button variant="outline" size="sm" onClick={requestRevision}><RotateCcw className="mr-2 h-4 w-4" />Solicitar revisión</Button></div>
                    </> : <div className="rounded-xl border border-dashed border-white/15 p-6 text-center"><FileArchive className="mx-auto mb-3 h-7 w-7 text-muted" /><p className="font-medium">Aún no hay archivos de entrega</p><p className="mt-1 text-sm text-muted">Aparecerán aquí cuando el especialista termine el trabajo.</p></div>}
                  </CardContent>
                </Card>

                <Card className="border-white/10"><CardHeader><CardTitle className="text-xl">Actividad reciente</CardTitle><CardDescription>Historial privado de actualizaciones del pedido.</CardDescription></CardHeader><CardContent><div className="space-y-4">
                  {events.length > 0 ? events.slice(0, 6).map(event => <div key={event.id} className="flex gap-3 border-b border-white/10 pb-4 last:border-0"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" /><div><p className="text-sm font-medium">{event.description || STATUS_LABELS[event.new_status || '']?.label || 'Pedido actualizado'}</p><p className="mt-1 text-xs text-muted">{formatDate(event.created_at)}</p></div></div>) : <div className="flex items-center gap-3 text-sm text-muted"><Paperclip className="h-4 w-4" />El historial aparecerá cuando el equipo actualice tu pedido.</div>}
                </div></CardContent></Card>
              </div>}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
