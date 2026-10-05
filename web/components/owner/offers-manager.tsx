'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgePercent, PackagePlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const load = useCallback(async () => { setLoading(true); const response = await fetch('/api/owner/offers', { cache: 'no-store' }); const body = await response.json(); if (response.ok) setData(body); else setError(body.error); setLoading(false) }, [])
  useEffect(() => {
    let active = true
    fetch('/api/owner/offers', { cache: 'no-store' }).then(async response => ({ response, body: await response.json() })).then(({ response, body }) => {
      if (!active) return
      if (response.ok) setData(body); else setError(body.error)
    }).catch(() => { if (active) setError('No se pudieron cargar las ofertas.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const send = async (body: object, method: 'POST' | 'PATCH' = 'POST') => { setError(''); setMessage(''); const response = await fetch('/api/owner/offers', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) { setError(payload.error || 'No se pudo guardar.'); return false } setMessage('Oferta guardada correctamente.'); await load(); return true }
  const createCoupon = async (form: FormData) => void send({ action: 'create_coupon', code: String(form.get('code')).toUpperCase(), description: String(form.get('description')), discountType: form.get('discountType'), discountValue: Number(form.get('discountValue')), minimumAmount: Number(form.get('minimumAmount')), maxRedemptions: form.get('maxRedemptions') ? Number(form.get('maxRedemptions')) : null, expiresAt: form.get('expiresAt') ? new Date(String(form.get('expiresAt'))).toISOString() : null })
  const createPackage = async (form: FormData) => { if (selected.length < 2) return setError('Selecciona al menos dos servicios.'); const saved = await send({ action: 'create_package', name: form.get('name'), description: form.get('description'), discountPercent: Number(form.get('discountPercent')), serviceIds: selected }); if (saved) setSelected([]) }
  const field = 'h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus:border-primary'

  return <div className="space-y-7">
    {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{message && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
    <div className="flex justify-between"><div><h2 className="text-2xl font-bold">Paquetes y cupones</h2><p className="text-sm text-muted">El descuento se valida en el servidor antes de abrir Stripe.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</Button></div>
    <div className="grid gap-6 xl:grid-cols-2">
      <form action={createPackage} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="mb-4 flex items-center gap-2 text-xl font-bold"><PackagePlus className="text-primary" />Nuevo paquete</h3><div className="space-y-3"><input name="name" required minLength={3} placeholder="Nombre del paquete" className={field} /><textarea name="description" required minLength={10} placeholder="Descripción" className={`${field} h-24 py-3`} /><input name="discountPercent" required type="number" min="1" max="80" step="0.01" placeholder="Descuento %" className={field} /><div className="grid gap-2 sm:grid-cols-2">{data.services.map(service => <label key={service.id} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={selected.includes(service.id)} onChange={() => setSelected(current => current.includes(service.id) ? current.filter(id => id !== service.id) : [...current, service.id])} />{service.name}</label>)}</div><Button className="w-full" type="submit">Crear paquete</Button></div></form>
      <form action={createCoupon} className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h3 className="mb-4 flex items-center gap-2 text-xl font-bold"><BadgePercent className="text-primary" />Nuevo cupón</h3><div className="grid gap-3 sm:grid-cols-2"><input name="code" required minLength={3} placeholder="CODIGO" className={`${field} font-mono uppercase`} /><select name="discountType" className={field}><option value="percent">Porcentaje</option><option value="fixed">Monto fijo USD</option></select><input name="discountValue" required type="number" min="0.01" step="0.01" placeholder="Valor" className={field} /><input name="minimumAmount" type="number" min="0" step="0.01" placeholder="Compra mínima" className={field} /><input name="maxRedemptions" type="number" min="1" placeholder="Máximo de usos" className={field} /><input name="expiresAt" type="datetime-local" className={field} /><textarea name="description" placeholder="Descripción interna" className={`${field} h-24 py-3 sm:col-span-2`} /><Button className="sm:col-span-2" type="submit">Crear cupón</Button></div></form>
    </div>
    <section className="grid gap-5 lg:grid-cols-2"><div><h3 className="mb-3 text-lg font-bold">Paquetes activos</h3>{data.packages.map(offer => <OfferRow key={offer.id} title={`${offer.name} · ${offer.discount_percent}%`} detail={offer.description} active={offer.is_active} onToggle={() => void send({ action: 'toggle', kind: 'package', id: offer.id, isActive: !offer.is_active }, 'PATCH')} />)}</div><div><h3 className="mb-3 text-lg font-bold">Cupones</h3>{data.coupons.length ? data.coupons.map(coupon => <OfferRow key={coupon.id} title={`${coupon.code} · ${coupon.discount_value}${coupon.discount_type === 'percent' ? '%' : ' USD'}`} detail={`${coupon.redemption_count}${coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''} usos${coupon.expires_at ? ` · vence ${new Date(coupon.expires_at).toLocaleDateString()}` : ''}`} active={coupon.is_active} onToggle={() => void send({ action: 'toggle', kind: 'coupon', id: coupon.id, isActive: !coupon.is_active }, 'PATCH')} />) : <p className="text-sm text-muted">Aún no hay cupones.</p>}</div></section>
  </div>
}

function OfferRow({ title, detail, active, onToggle }: { title: string; detail: string; active: boolean; onToggle: () => void }) { return <div className="mb-3 flex items-center justify-between gap-4 rounded-2xl border border-white/10 p-4"><div><b>{title}</b><p className="mt-1 text-sm text-muted">{detail}</p></div><Button variant="outline" onClick={onToggle}>{active ? 'Desactivar' : 'Activar'}</Button></div> }
