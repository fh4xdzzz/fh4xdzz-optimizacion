'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ClipboardList, PackageCheck, ShoppingCart, Trash2 } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { clearCart, getCart, removeFromCart, setCart, subscribeCart, type CartItem } from '@/lib/cart'

type Offer = { id: string; name: string; description: string; discount_percent: number; service_package_items: Array<{ services: CartItem | CartItem[] }> }
type CouponPreview = { valid: boolean; couponDiscount?: number; total?: number; label?: string; error?: string }

function getServicePrompt(item: CartItem) {
  const key = `${item.slug || ''} ${item.name}`.toLowerCase()
  if (key.includes('discord')) return { label: 'Cuéntanos sobre tu servidor', placeholder: 'Ej.: Comunidad gaming de 150 miembros. Quiero bienvenida, roles, tickets, verificación y canales privados.' }
  if (key.includes('stream')) return { label: 'Plataforma, equipo y objetivo', placeholder: 'Ej.: Transmito en Kick, uso una RTX 4060 y quiero escenas profesionales con alertas y cámara.' }
  if (key.includes('obs')) return { label: 'Equipo y problema actual de OBS', placeholder: 'Ej.: Ryzen 5 + RTX 3060. Tengo pérdida de FPS y quiero emitir a 1080p sin cortes.' }
  if (key.includes('gaming')) return { label: 'Juego, equipo y mejora deseada', placeholder: 'Ej.: Juego Warzone en Windows 11. Quiero más FPS, menos latencia y configuración competitiva.' }
  if (key.includes('overlay') || key.includes('alerta') || key.includes('diseño')) return { label: 'Estilo visual que buscas', placeholder: 'Ej.: Estilo futurista azul, para Twitch, con webcam, alertas, starting soon y pantalla final.' }
  if (key.includes('windows') || key.includes('pc')) return { label: 'Equipo y problema principal', placeholder: 'Ej.: Windows 11, Ryzen 7 y 16 GB RAM. El equipo tarda en iniciar y pierde rendimiento al jugar.' }
  if (key.includes('web') || key.includes('página')) return { label: 'Describe la página que necesitas', placeholder: 'Ej.: Página para mi marca con inicio, servicios, portafolio, contacto y diseño oscuro.' }
  if (key.includes('soporte')) return { label: 'Describe el problema', placeholder: 'Ej.: OBS no detecta el audio del juego. Ocurre desde la última actualización de Windows.' }
  return { label: '¿Qué resultado esperas?', placeholder: 'Explícanos brevemente qué necesitas, qué utilizas actualmente y cómo quieres que quede.' }
}

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [name, setName] = useState('')
  const [serviceDetails, setServiceDetails] = useState<Record<string, string>>({})
  const [coupon, setCoupon] = useState('')
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => { const update = () => { setItems(getCart()); setCouponPreview(null) }; update(); return subscribeCart(update) }, [])
  useEffect(() => { fetch('/api/store/offers').then((response) => response.json()).then((body) => setOffers(body.packages || [])).catch(() => undefined) }, [])
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price), 0), [items])
  const packageDiscount = useMemo(() => {
    const selected = new Set(items.map((item) => item.id))
    const discounts = offers.map((offer) => {
      const serviceIds = offer.service_package_items.flatMap((entry) => Array.isArray(entry.services) ? entry.services : [entry.services]).filter(Boolean).map((service) => service.id)
      return serviceIds.length > 1 && serviceIds.every((id) => selected.has(id)) ? Number(offer.discount_percent) : 0
    })
    return subtotal * Math.max(0, ...discounts) / 100
  }, [items, offers, subtotal])
  const detailsComplete = items.length > 0 && items.every(item => (serviceDetails[item.id] || '').trim().length >= 5)
  const orderDescription = useMemo(() => items.map(item => `[${item.name}] ${(serviceDetails[item.id] || '').trim()}`).join(' | ').slice(0, 500), [items, serviceDetails])
  const applyCoupon = async () => {
    setError('')
    setCouponPreview(null)
    if (!items.length) return setCouponPreview({ valid: false, error: 'Agrega al menos un servicio.' })
    if (!/^(DULCAN-[A-Z0-9]{4,16}|[A-Z0-9]{3,20})$/.test(coupon)) return setCouponPreview({ valid: false, error: 'Escribe un código de cupón válido.' })
    setCheckingCoupon(true)
    try {
      const response = await fetch('/api/store/validate-coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: coupon, serviceIds: items.map(item => item.id) }) })
      const body = await response.json()
      setCouponPreview(response.ok ? body : { valid: false, error: body.error || 'No pudimos validar el cupón.' })
    } catch {
      setCouponPreview({ valid: false, error: 'No pudimos validar el cupón.' })
    } finally {
      setCheckingCoupon(false)
    }
  }

  const addPackage = (offer: Offer) => {
    const services = offer.service_package_items.flatMap((entry) => Array.isArray(entry.services) ? entry.services : [entry.services]).filter(Boolean)
    const merged = [...items]
    for (const service of services) if (!merged.some((item) => item.id === service.id)) merged.push({ id: service.id, name: service.name, slug: service.slug, price: Number(service.price) })
    setCart(merged)
  }
  const checkout = async () => {
    setError('')
    if (!items.length) return setError('Agrega al menos un servicio.')
    if (name.trim().length < 2) return setError('Escribe tu nombre completo.')
    if (!detailsComplete) return setError('Completa los detalles de cada servicio para que podamos preparar tu pedido correctamente.')
    if (coupon.trim() && !couponPreview?.valid) return setError('Pulsa “Aplicar” para validar el cupón antes de pagar.')
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-cart-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceIds: items.map((item) => item.id), name, description: orderDescription, coupon: couponPreview?.valid ? coupon : '' }) })
      const body = await response.json()
      if (response.status === 401) { router.push(`/auth/login?redirect=${encodeURIComponent('/carrito')}`); return }
      if (!response.ok) throw new Error(body.error || 'No se pudo preparar el pago.')
      window.location.href = body.url
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar el pago.') } finally { setLoading(false) }
  }

  return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto max-w-6xl px-4 pb-20 pt-32">
    <div className="mb-10"><p className="text-sm font-bold uppercase tracking-[.2em] text-primary">Compra segura</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Tu carrito</h1><p className="mt-3 text-muted">Combina servicios, recibe descuentos automáticos y paga todo en Stripe.</p></div>
    {offers.map((offer) => <section key={offer.id} className="mb-8 grid gap-5 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/15 to-violet-500/10 p-6 md:grid-cols-[1fr_auto] md:items-center"><div><div className="mb-2 flex items-center gap-2 text-primary"><PackageCheck className="h-5 w-5" /><b>Paquete recomendado · {Number(offer.discount_percent)}% menos</b></div><h2 className="text-2xl font-bold">{offer.name}</h2><p className="mt-2 text-muted">{offer.description}</p></div><Button variant="primary" onClick={() => addPackage(offer)}>Agregar paquete</Button></section>)}
    <div className="grid gap-8 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-3xl border border-white/10 bg-card/80 p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-2xl font-bold"><ShoppingCart className="h-5 w-5 text-primary" />Servicios</h2>{items.length > 0 && <button onClick={() => setConfirmClear(true)} className="rounded-xl border border-red-400/20 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10">Vaciar</button>}</div>
      {!items.length ? <div className="rounded-2xl border border-dashed border-white/15 py-14 text-center"><p className="text-muted">Tu carrito está vacío.</p><Button variant="outline" href="/servicios" className="mt-5">Explorar servicios</Button></div> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div><b>{item.name}</b><p className="mt-1 text-sm text-muted">Pago único</p></div><div className="flex items-center gap-4"><b className="text-lg">${Number(item.price).toFixed(2)}</b><button onClick={() => removeFromCart(item.id)} aria-label={`Quitar ${item.name}`} className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
    </section><aside className="h-fit rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/10 to-card p-6 lg:sticky lg:top-28"><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Finalizar compra</h2><p className="mt-1 text-xs text-muted">Completa los datos para preparar cada servicio.</p></div><ClipboardList className="h-6 w-6 text-primary" /></div>{error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Nombre completo<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" autoComplete="name" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus:border-primary" /></label>{items.length > 0 && <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Detalles del pedido</p>{detailsComplete && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Completo</span>}</div>{items.map(item => { const prompt = getServicePrompt(item); const maxLength = Math.max(60, Math.floor(420 / Math.max(items.length, 1))); return <label key={item.id} className="block rounded-2xl border border-white/10 bg-black/15 p-3"><span className="block text-xs font-bold uppercase tracking-wide text-primary">{item.name}</span><span className="mt-1 block text-sm font-semibold">{prompt.label}</span><textarea value={serviceDetails[item.id] || ''} onChange={event => setServiceDetails(current => ({ ...current, [item.id]: event.target.value }))} placeholder={prompt.placeholder} maxLength={maxLength} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-sm outline-none focus:border-primary" /><span className="mt-1 block text-right text-[11px] text-muted">{(serviceDetails[item.id] || '').length}/{maxLength}</span></label>})}</div>}<div className="block text-sm font-semibold"><span>Cupón (opcional)</span><div className="mt-2 flex gap-2"><input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setCouponPreview(null) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void applyCoupon() } }} placeholder="DULCAN-XXXXXX o CREADOR" className={`h-11 min-w-0 flex-1 rounded-xl border bg-black/25 px-3 font-mono uppercase outline-none ${couponPreview?.valid ? 'border-emerald-400' : couponPreview?.error ? 'border-red-400' : 'border-white/10 focus:border-primary'}`} /><button type="button" onClick={() => void applyCoupon()} disabled={!coupon.trim() || checkingCoupon} className="h-11 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50">{checkingCoupon ? 'Validando…' : 'Aplicar'}</button></div>{couponPreview?.valid && <span className="mt-2 block text-xs font-semibold text-emerald-300">✓ {couponPreview.label}</span>}{couponPreview?.error && <span className="mt-2 block text-xs text-red-300">{couponPreview.error}</span>}</div></div><div className="mt-5 space-y-2 border-t border-white/10 pt-5"><div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>{packageDiscount > 0 && <div className="flex justify-between text-sm text-emerald-300"><span>Descuento de paquete</span><span>−${packageDiscount.toFixed(2)}</span></div>}{couponPreview?.valid && <div className="flex justify-between text-sm font-semibold text-emerald-300"><span>Descuento del cupón</span><span>−${Number(couponPreview.couponDiscount).toFixed(2)}</span></div>}<div className="flex items-end justify-between pt-2"><b>Total estimado</b><b className="text-3xl">${(couponPreview?.valid && couponPreview.total != null ? couponPreview.total : subtotal - packageDiscount).toFixed(2)}</b></div></div><Button variant="primary" className="mt-5 h-12 w-full" disabled={loading || checkingCoupon || !items.length} onClick={() => void checkout()}>{loading ? 'Preparando…' : checkingCoupon ? 'Validando cupón…' : 'Pagar con Stripe →'}</Button><p className="mt-3 text-center text-xs text-muted">El cupón se valida únicamente al pulsar Aplicar.</p></aside></div>
  </main><Footer /><Modal isOpen={confirmClear} onClose={() => setConfirmClear(false)} onConfirm={() => { clearCart(); setCouponPreview(null) }} title="Vaciar carrito" description={`Se quitarán los ${items.length} servicios del carrito. Esta acción no se puede deshacer.`} confirmText="Sí, vaciar carrito" variant="destructive" /></div>
}
