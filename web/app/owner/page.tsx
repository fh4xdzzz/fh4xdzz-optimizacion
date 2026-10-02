'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, BadgeDollarSign, Headphones, MessageSquareText, RefreshCw, Search, ShieldCheck, ShoppingBag, Users } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'

type ActivityItem = {
  id: string
  type: 'user' | 'order' | 'support' | 'message'
  action: string
  title: string
  description: string
  actorId: string | null
  actorName: string
  actorRole: string
  reference: string | null
  createdAt: string
}

type OwnerData = {
  generatedAt: string
  metrics: { users: number; clients: number; team: number; orders: number; activeOrders: number; revenue: number; openChats: number; closedChats: number }
  activities: ActivityItem[]
}

const TYPE_LABELS = { all: 'Todo', user: 'Usuarios', order: 'Pedidos', support: 'Soporte', message: 'Mensajes' } as const
const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Administrador', staff: 'Staff', client: 'Cliente', assistant: 'Dulcan AI', system: 'Sistema' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function TypeIcon({ type }: { type: ActivityItem['type'] }) {
  if (type === 'user') return <Users className="h-4 w-4" />
  if (type === 'order') return <ShoppingBag className="h-4 w-4" />
  if (type === 'support') return <Headphones className="h-4 w-4" />
  return <MessageSquareText className="h-4 w-4" />
}

async function fetchOwnerData(): Promise<OwnerData> {
  const response = await fetch('/api/owner/activity', { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el centro del owner')
  return payload
}

export default function OwnerPage() {
  const [data, setData] = useState<OwnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState<keyof typeof TYPE_LABELS>('all')
  const [role, setRole] = useState('all')
  const [query, setQuery] = useState('')

  const loadActivity = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await fetchOwnerData())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchOwnerData()
      .then(payload => { if (active) setData(payload) })
      .catch(loadError => { if (active) setError(loadError instanceof Error ? loadError.message : 'Error inesperado') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (data?.activities || []).filter(item => {
      if (type !== 'all' && item.type !== type) return false
      if (role !== 'all' && item.actorRole !== role) return false
      return !needle || `${item.title} ${item.description} ${item.actorName} ${item.reference || ''}`.toLowerCase().includes(needle)
    })
  }, [data, query, role, type])

  const cards = data ? [
    { label: 'Usuarios', value: data.metrics.users, detail: `${data.metrics.clients} clientes`, icon: Users, color: 'text-cyan-300' },
    { label: 'Equipo', value: data.metrics.team, detail: 'Admin y staff', icon: ShieldCheck, color: 'text-violet-300' },
    { label: 'Pedidos', value: data.metrics.orders, detail: `${data.metrics.activeOrders} activos`, icon: ShoppingBag, color: 'text-blue-300' },
    { label: 'Ingresos', value: `$${data.metrics.revenue.toFixed(2)}`, detail: 'Pagos confirmados', icon: BadgeDollarSign, color: 'text-emerald-300' },
    { label: 'Soportes abiertos', value: data.metrics.openChats, detail: `${data.metrics.closedChats} cerrados`, icon: Headphones, color: 'text-amber-300' },
  ] : []

  return <div className="min-h-screen bg-background">
    <Navbar />
    <main className="px-4 pb-20 pt-28">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[.2em] text-violet-300"><ShieldCheck className="h-4 w-4" /> Acceso exclusivo</div>
            <h1 className="text-4xl font-black tracking-tight md:text-5xl">Centro del Owner</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted">Visibilidad general de usuarios, equipo, pedidos, soporte y actividad operativa.</p>
          </div>
          <div className="flex items-center gap-3">
            {data && <p className="hidden text-xs text-muted sm:block">Actualizado {formatDate(data.generatedAt)}</p>}
            <Button variant="outline" onClick={loadActivity} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button>
          </div>
        </div>

        {error && <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumen del negocio">
          {cards.map(card => <div key={card.label} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[.055] to-white/[.02] p-5 shadow-xl shadow-black/10">
            <div className="flex items-start justify-between"><p className="text-sm text-muted">{card.label}</p><card.icon className={`h-5 w-5 ${card.color}`} /></div>
            <p className="mt-4 text-3xl font-black">{card.value}</p><p className="mt-1 text-xs text-muted">{card.detail}</p>
          </div>)}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-card/75 shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 p-5 md:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/15 p-2 text-primary"><Activity className="h-5 w-5" /></span><div><h2 className="text-xl font-bold">Actividad del sistema</h2><p className="text-sm text-muted">{filtered.length} eventos visibles</p></div></div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4"><Search className="h-4 w-4 text-muted" /><span className="sr-only">Buscar actividad</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, pedido, chat o acción..." className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted" /></label>
              <select value={type} onChange={event => setType(event.target.value as keyof typeof TYPE_LABELS)} className="h-11 rounded-xl border border-white/10 bg-background px-4 text-sm">{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select value={role} onChange={event => setRole(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-background px-4 text-sm"><option value="all">Todos los roles</option><option value="admin">Administradores</option><option value="staff">Staff</option><option value="client">Clientes</option><option value="assistant">Dulcan AI</option><option value="system">Sistema</option></select>
            </div>
          </div>

          <div className="divide-y divide-white/[.07]">
            {loading && !data ? <div className="p-12 text-center text-muted"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />Cargando actividad...</div> : filtered.length ? filtered.map(item => <article key={item.id} className="grid gap-4 p-5 transition hover:bg-white/[.025] md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${item.type === 'order' ? 'border-blue-400/20 bg-blue-400/10 text-blue-300' : item.type === 'support' ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : item.type === 'message' ? 'border-violet-400/20 bg-violet-400/10 text-violet-300' : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'}`}><TypeIcon type={item.type} /></div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-0.5 text-[11px] text-muted">{ROLE_LABELS[item.actorRole] || item.actorRole}</span>{item.reference && <span className="font-mono text-xs text-primary">{item.reference}</span>}</div><p className="mt-1 break-words text-sm text-muted">{item.description}</p><p className="mt-2 text-xs text-foreground/70">{item.actorName}</p></div>
              <time className="whitespace-nowrap text-xs text-muted md:text-right" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            </article>) : <div className="p-12 text-center text-muted">No hay eventos que coincidan con estos filtros.</div>}
          </div>
        </section>
      </div>
    </main>
    <Footer />
  </div>
}
