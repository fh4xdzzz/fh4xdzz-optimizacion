'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BadgeDollarSign, Check, Copy, ExternalLink, MousePointerClick, Pause, Play, RefreshCw, ShoppingBag, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

type Conversion = { id: string; gross_revenue: number; commission_amount: number; status: 'pending' | 'paid' | 'cancelled'; created_at: string }
type Affiliate = {
  id: string
  display_name: string
  slug: string
  contact_email: string | null
  commission_rate: number
  status: 'active' | 'paused'
  visits: number
  sales: number
  revenue: number
  pendingCommission: number
  paidCommission: number
  conversions: Conversion[]
  coupon: { code: string; discount_value: number; is_active: boolean; max_redemptions: number | null; redemption_count: number; expires_at: string | null } | null
}
type Data = { generatedAt: string; summary: { creators: number; active: number; visits: number; sales: number; revenue: number; pendingCommission: number }; creators: Affiliate[] }

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const field = 'h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 outline-none focus:border-primary'

export default function AffiliateManager() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Affiliate | null>(null)
  const [payout, setPayout] = useState<Affiliate | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [commissionRate, setCommissionRate] = useState('10')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/owner/affiliates', { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los afiliados.')
      setData(body)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error inesperado') } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/owner/affiliates', { cache: 'no-store' })
      .then(async response => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!active) return
        if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los afiliados.')
        setData(body)
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Error inesperado') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openEditor = (creator: Affiliate) => {
    setEditing(creator); setDisplayName(creator.display_name); setContactEmail(creator.contact_email || ''); setCommissionRate(String(creator.commission_rate))
  }
  const updateCreator = async (creator: Affiliate, status = creator.status) => {
    setSaving(creator.id); setError(''); setMessage('')
    try {
      const response = await fetch('/api/owner/affiliates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: creator.id, displayName: editing?.id === creator.id ? displayName : creator.display_name, contactEmail: editing?.id === creator.id ? contactEmail : creator.contact_email || '', commissionRate: editing?.id === creator.id ? Number(commissionRate) : Number(creator.commission_rate), status }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo actualizar el afiliado.')
      setEditing(null); setMessage('Afiliado actualizado correctamente.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el afiliado.') } finally { setSaving('') }
  }
  const markPaid = async () => {
    if (!payout) return
    setSaving(payout.id); setError(''); setMessage('')
    try {
      const response = await fetch('/api/owner/affiliates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_paid', creatorId: payout.id, payoutCutoff: data?.generatedAt }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo registrar el pago.')
      setPayout(null); setMessage(`${body.updated} comisiones marcadas como pagadas.`); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar el pago.') } finally { setSaving('') }
  }
  const copyLink = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/?ref=${code}`)
    setMessage(`Enlace de ${code} copiado.`)
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold">Programa de creadores</h2><p className="mt-1 text-sm text-muted">Enlaces, visitas, ventas reales y comisiones desde un solo lugar.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div>
    {error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
    {message ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p> : null}
    {data ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Summary label="Creadores" value={String(data.summary.creators)} detail={`${data.summary.active} activos`} icon={<Users />} />
      <Summary label="Visitas únicas" value={String(data.summary.visits)} detail="Desde enlaces ?ref=" icon={<MousePointerClick />} />
      <Summary label="Ventas" value={String(data.summary.sales)} detail="Pagos reales" icon={<ShoppingBag />} />
      <Summary label="Ingresos" value={money(data.summary.revenue)} detail="Ventas atribuidas" icon={<BadgeDollarSign />} />
      <Summary label="Por pagar" value={money(data.summary.pendingCommission)} detail="Comisiones pendientes" icon={<BadgeDollarSign />} />
    </section> : null}
    <div className="space-y-4">
      {data?.creators.length ? data.creators.map(creator => {
        const link = `https://www.thedulcandesign.com/?ref=${creator.slug}`
        return <article key={creator.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black">{creator.display_name}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${creator.status === 'active' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{creator.status === 'active' ? 'Activo' : 'Pausado'}</span></div><p className="mt-1 font-mono text-primary">{creator.slug} · {creator.coupon?.discount_value || 0}% de descuento</p><div className="mt-3 flex max-w-2xl items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2"><span className="min-w-0 flex-1 truncate px-2 font-mono text-xs text-cyan-200">{link}</span><Button size="sm" variant="outline" onClick={() => void copyLink(creator.slug)}><Copy className="mr-2 h-4 w-4" />Copiar</Button><a href={link} target="_blank" rel="noreferrer" aria-label={`Abrir enlace de ${creator.display_name}`} className="rounded-lg border border-white/10 p-2"><ExternalLink className="h-4 w-4" /></a></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openEditor(creator)}>Editar</Button><Button variant="outline" disabled={saving === creator.id} onClick={() => void updateCreator(creator, creator.status === 'active' ? 'paused' : 'active')}>{creator.status === 'active' ? <><Pause className="mr-2 h-4 w-4" />Pausar</> : <><Play className="mr-2 h-4 w-4" />Activar</>}</Button><Button disabled={!creator.pendingCommission || saving === creator.id} onClick={() => setPayout(creator)}><Check className="mr-2 h-4 w-4" />Marcar pagado</Button></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Mini label="Visitas" value={String(creator.visits)} /><Mini label="Ventas" value={String(creator.sales)} /><Mini label="Conversión" value={creator.visits ? `${(creator.sales / creator.visits * 100).toFixed(1)}%` : '0%'} /><Mini label="Ingresos" value={money(creator.revenue)} /><Mini label="Pendiente" value={money(creator.pendingCommission)} accent /><Mini label="Pagado" value={money(creator.paidCommission)} /></div>
        </article>
      }) : !loading ? <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center"><Users className="mx-auto h-10 w-10 text-muted" /><h3 className="mt-4 text-lg font-bold">Aún no hay creadores afiliados</h3><p className="mt-2 text-sm text-muted">Créalo desde Ofertas → Creador de contenido y aparecerá automáticamente aquí.</p></div> : null}
    </div>
    <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} onConfirm={() => editing && void updateCreator(editing)} title="Editar afiliado" description="Actualiza sus datos y la comisión para las próximas ventas." confirmText={saving ? 'Guardando…' : 'Guardar cambios'}><div className="space-y-4"><label className="block text-sm font-semibold">Nombre<input value={displayName} onChange={event => setDisplayName(event.target.value)} className={`${field} mt-2 font-normal`} /></label><label className="block text-sm font-semibold">Correo<input value={contactEmail} onChange={event => setContactEmail(event.target.value)} type="email" className={`${field} mt-2 font-normal`} /></label><label className="block text-sm font-semibold">Comisión por venta<input value={commissionRate} onChange={event => setCommissionRate(event.target.value)} type="number" min="0" max="50" step="0.5" className={`${field} mt-2 font-normal`} /></label></div></Modal>
    <Modal isOpen={Boolean(payout)} onClose={() => setPayout(null)} onConfirm={() => void markPaid()} title="Confirmar pago de comisiones" description={`Se marcarán como pagadas todas las comisiones pendientes de ${payout?.display_name || 'este creador'} por ${money(payout?.pendingCommission || 0)}. Usa este botón después de realizar el pago por fuera de la página.`} confirmText="Sí, ya fueron pagadas" />
  </div>
}

function Summary({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) { return <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center justify-between text-sm text-muted"><span>{label}</span><span className="text-primary">{icon}</span></div><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></div> }
function Mini({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><p className="text-xs text-muted">{label}</p><p className={`mt-1 font-bold ${accent ? 'text-amber-300' : ''}`}>{value}</p></div> }
