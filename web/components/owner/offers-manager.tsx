'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgePercent, Check, PackagePlus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'

type Service = { id: string; name: string; price: number }
type Offer = { id: string; name: string; description: string; discount_percent: number; is_active: boolean; service_package_items: Array<{ services: Service | Service[] }> }
type Coupon = { id: string; code: string; description: string | null; discount_type: 'percent' | 'fixed'; discount_value: number; minimum_amount: number; max_redemptions: number | null; redemption_count: number; expires_at: string | null; is_active: boolean }
type Data = { packages: Offer[]; coupons: Coupon[]; services: Service[] }

export default function OffersManager() {
  const [data, setData] = useState<Data>({ packages: [], coupons: [], services: [] })
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [couponCode, setCouponCode] = useState('DULCAN-NUEVO')
  const [couponKind, setCouponKind] = useState<'automatic' | 'creator'>('automatic')
  const [creatorName, setCreatorName] = useState('')
  const [creatorEmail, setCreatorEmail] = useState('')
  const [commissionRate, setCommissionRate] = useState('10')
  const [discount, setDiscount] = useState('10')
  const [maxUses, setMaxUses] = useState('25')
  const [expiresAt, setExpiresAt] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'coupon' | 'package'; id: string; title: string } | null>(null)
  const load = useCallback(async () => { setLoading(true); const response = await fetch('/api/owner/offers', { cache: 'no-store' }); const body = await response.json(); if (response.ok) setData(body); else setError(body.error); setLoading(false) }, [])
  useEffect(() => {
    let active = true
    fetch('/api/owner/offers', { cache: 'no-store' }).then(async response => ({ response, body: await response.json() })).then(({ response, body }) => {
      if (!active) return
      if (response.ok) setData(body); else setError(body.error)
    }).catch(() => { if (active) setError('No se pudieron cargar las ofertas.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const send = async (body: object, method: 'POST' | 'PATCH' | 'DELETE' = 'POST') => { setError(''); setMessage(''); const response = await fetch('/api/owner/offers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) { setError(payload.error || 'No se pudo guardar.'); return false } setMessage(method === 'DELETE' ? 'Oferta eliminada correctamente.' : 'Oferta guardada correctamente.'); await load(); return true }
  const generateCode = () => setCouponCode(`DULCAN-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 6).padEnd(6, 'X')}`)
  const couponDescription = `${couponKind === 'creator' ? `Cupón del creador de contenido ${creatorName || 'sin nombre'}` : 'Cupón promocional TheDulcanDesign'}: ${discount}% de descuento, válido para un máximo de ${maxUses} usos${expiresAt ? ` hasta el ${new Date(`${expiresAt}T12:00:00`).toLocaleDateString('es-DO')}` : ', sin fecha de vencimiento'}.`
  const createCoupon = async () => {
    const saved = await send({ action: 'create_coupon', couponKind, creatorName: creatorName || undefined, creatorEmail, commissionRate: Number(commissionRate), code: couponCode, description: couponDescription, discountType: 'percent', discountValue: Number(discount), minimumAmount: 0, maxRedemptions: Number(maxUses), expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null })
    if (saved) {
      if (couponKind === 'creator') { setCreatorName(''); setCreatorEmail(''); setCouponCode('') } else generateCode()
    }
  }
  const createPackage = async (form: FormData) => { if (selected.length < 2) return setError('Selecciona al menos dos servicios.'); const saved = await send({ action: 'create_package', name: form.get('name'), description: form.get('description'), discountPercent: Number(form.get('discountPercent')), serviceIds: selected }); if (saved) setSelected([]) }
  const field = 'h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus:border-primary'

  return <div className="space-y-7">
    {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
    <div className="flex justify-between"><div><h2 className="text-2xl font-bold">Paquetes y cupones</h2><p className="text-sm text-muted">El descuento se valida en el servidor antes de abrir Stripe.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div>
    <form action={createCoupon} className="overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-white/[.03] to-violet-500/10">
      <div className="border-b border-white/10 p-5 md:p-6"><h3 className="flex items-center gap-2 text-2xl font-bold"><BadgePercent className="text-primary" />Generador de cupones</h3><p className="mt-1 text-sm text-muted">Configura todo desde este panel. El código y la descripción se generan automáticamente.</p><div className="mt-5 grid max-w-xl grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5"><button type="button" onClick={() => { setCouponKind('automatic'); setCreatorName(''); generateCode() }} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${couponKind === 'automatic' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>Cupón automático</button><button type="button" onClick={() => { setCouponKind('creator'); setCouponCode('') }} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${couponKind === 'creator' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>Creador de contenido</button></div></div>
      <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-2">
        <div className="space-y-5">
          {couponKind === 'automatic' ? <div><label className="mb-2 block text-sm font-semibold">Código automático</label><div className="flex gap-2"><input value={couponCode} readOnly className={`${field} font-mono font-bold tracking-wide text-primary`} /><Button type="button" variant="outline" onClick={generateCode}><Sparkles className="mr-2 h-4 w-4" />Generar</Button></div><p className="mt-2 text-xs text-muted">Los códigos automáticos comienzan por DULCAN-.</p></div> : <div className="space-y-3"><div><label className="mb-2 block text-sm font-semibold">Nombre del creador de contenido</label><input value={creatorName} onChange={event => { const clean = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20); setCreatorName(clean); setCouponCode(clean) }} placeholder="Content Creator" minLength={3} required className={`${field} font-mono font-bold uppercase tracking-wide text-primary`} /><p className="mt-2 text-xs text-muted">El nombre se convierte directamente en el código y el enlace de afiliado.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Correo del creador <span className="text-muted">(opcional)</span><input value={creatorEmail} onChange={event => setCreatorEmail(event.target.value)} type="email" placeholder="creador@correo.com" className={`${field} mt-2 font-normal`} /></label><label className="text-sm font-semibold">Comisión por venta<select value={commissionRate} onChange={event => setCommissionRate(event.target.value)} className={`${field} mt-2 font-normal`}>{[5, 10, 15, 20, 25, 30].map(value => <option key={value} value={value}>{value}%</option>)}</select></label></div></div>}
          <div><label className="mb-2 block text-sm font-semibold">Porcentaje de descuento</label><div className="grid grid-cols-4 gap-2">{[5, 10, 15, 20, 25, 30, 40, 50].map(value => <button key={value} type="button" onClick={() => setDiscount(String(value))} className={`rounded-xl border px-3 py-3 font-bold transition ${discount === String(value) ? 'border-primary bg-primary text-white' : 'border-white/10 bg-black/20 hover:border-primary/50'}`}>{value}%</button>)}</div></div>
          <div><label className="mb-2 block text-sm font-semibold">Máximo de usos</label><select value={maxUses} onChange={event => setMaxUses(event.target.value)} className={field}>{[1, 5, 10, 25, 50, 100, 250, 500].map(value => <option key={value} value={value}>{value} {value === 1 ? 'uso' : 'usos'}</option>)}</select></div>
        </div>
        <div className="space-y-5">
          <div><label className="mb-2 block text-sm font-semibold">Fecha de vencimiento</label><DatePicker value={expiresAt} onChange={setExpiresAt} min={new Date().toISOString().slice(0, 10)} placeholder="Elegir fecha de vencimiento" /><p className="mt-2 text-xs text-muted">El calendario bloquea las fechas anteriores. Déjalo vacío si no vence.</p></div>
          <div><label className="mb-2 block text-sm font-semibold">Descripción interna generada</label><div className="min-h-28 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-muted">{couponDescription}</div></div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Vista previa</p><p className="mt-2 font-mono text-xl font-black">{couponCode}</p><p className="mt-1 text-sm">{discount}% de descuento · {maxUses} usos{expiresAt ? ` · vence ${new Date(`${expiresAt}T12:00:00`).toLocaleDateString('es-DO')}` : ''}</p>{couponKind === 'creator' && couponCode && <><p className="mt-3 break-all font-mono text-xs text-cyan-200">thedulcandesign.com/?ref={couponCode}</p><p className="mt-1 text-xs text-muted">Comisión configurada: {commissionRate}% por venta real.</p></>}</div>
        </div>
      </div>
      <div className="border-t border-white/10 p-5 md:px-6"><Button className="h-12 w-full text-base" type="submit" disabled={couponCode.length < 3}><BadgePercent className="mr-2 h-5 w-5" />Crear cupón {couponCode || 'del creador'}</Button></div>
    </form>
    <form action={createPackage} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="mb-4 flex items-center gap-2 text-xl font-bold"><PackagePlus className="text-primary" />Nuevo paquete</h3><div className="grid gap-3 lg:grid-cols-2"><div className="space-y-3"><input name="name" required minLength={3} placeholder="Nombre del paquete" className={field} /><textarea name="description" required minLength={10} placeholder="Descripción" className={`${field} h-24 py-3`} /><input name="discountPercent" required type="number" min="1" max="80" step="0.01" placeholder="Descuento %" className={field} /></div><div className="grid gap-2 sm:grid-cols-2">{data.services.map(service => { const active = selected.includes(service.id); return <button key={service.id} type="button" aria-pressed={active} onClick={() => setSelected(current => active ? current.filter(id => id !== service.id) : [...current, service.id])} className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left text-sm transition ${active ? 'border-primary bg-primary/15 shadow-lg shadow-primary/10' : 'border-white/10 bg-black/15 hover:border-primary/40 hover:bg-white/[.04]'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${active ? 'border-primary bg-primary text-white' : 'border-white/15 text-transparent'}`}><Check className="h-4 w-4" /></span><span><b className="block">{service.name}</b><span className="text-xs text-muted">${Number(service.price).toFixed(2)}</span></span></button> })}</div><Button className="lg:col-span-2" type="submit">Crear paquete</Button></div></form>
    <section className="grid gap-5 lg:grid-cols-2"><div><h3 className="mb-3 text-lg font-bold">Paquetes activos</h3>{data.packages.map(offer => <OfferRow key={offer.id} title={`${offer.name} · ${offer.discount_percent}%`} detail={offer.description} active={offer.is_active} onToggle={() => void send({ action: 'toggle', kind: 'package', id: offer.id, isActive: !offer.is_active }, 'PATCH')} onDelete={() => setDeleteTarget({ kind: 'package', id: offer.id, title: offer.name })} />)}</div><div><h3 className="mb-3 text-lg font-bold">Cupones</h3>{data.coupons.length ? data.coupons.map(coupon => <OfferRow key={coupon.id} title={`${coupon.code} · ${coupon.discount_value}${coupon.discount_type === 'percent' ? '%' : ' USD'}`} detail={`${coupon.redemption_count}${coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''} usos${coupon.expires_at ? ` · vence ${new Date(coupon.expires_at).toLocaleDateString()}` : ''}`} active={coupon.is_active} onToggle={() => void send({ action: 'toggle', kind: 'coupon', id: coupon.id, isActive: !coupon.is_active }, 'PATCH')} onDelete={() => setDeleteTarget({ kind: 'coupon', id: coupon.id, title: coupon.code })} />) : <p className="text-sm text-muted">Aún no hay cupones.</p>}</div></section>
    <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) void send({ kind: deleteTarget.kind, id: deleteTarget.id }, 'DELETE') }} title={`Eliminar ${deleteTarget?.kind === 'coupon' ? 'cupón' : 'paquete'}`} description={`Se eliminará “${deleteTarget?.title || ''}” de forma permanente. Esta acción no afecta pedidos ya pagados.`} confirmText="Sí, eliminar" variant="destructive" />
  </div>
}

function OfferRow({ title, detail, active, onToggle, onDelete }: { title: string; detail: string; active: boolean; onToggle: () => void; onDelete: () => void }) { return <div className="mb-3 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><b>{title}</b><p className="mt-1 text-sm text-muted">{detail}</p></div><div className="flex gap-2"><Button variant="outline" onClick={onToggle}>{active ? 'Desactivar' : 'Activar'}</Button><Button variant="destructive" onClick={onDelete} aria-label={`Eliminar ${title}`}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button></div></div> }
