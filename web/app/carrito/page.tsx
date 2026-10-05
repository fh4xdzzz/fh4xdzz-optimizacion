'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck, ShoppingCart, Trash2 } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { clearCart, getCart, removeFromCart, setCart, subscribeCart, type CartItem } from '@/lib/cart'

type Offer = { id: string; name: string; description: string; discount_percent: number; service_package_items: Array<{ services: CartItem | CartItem[] }> }
type CouponPreview = { valid: boolean; couponDiscount?: number; total?: number; label?: string; error?: string }

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { const update = () => setItems(getCart()); update(); return subscribeCart(update) }, [])
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
  useEffect(() => {
    if (!coupon || !items.length || !/^(DULCAN-[A-Z0-9]{4,16}|[A-Z0-9]{3,20})$/.test(coupon)) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setCheckingCoupon(true)
      try {
        const response = await fetch('/api/store/validate-coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: coupon, serviceIds: items.map(item => item.id) }), signal: controller.signal })
        const body = await response.json()
        setCouponPreview(response.ok ? body : { valid: false, error: body.error || 'No pudimos validar el cupón.' })
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) setCouponPreview({ valid: false, error: 'No pudimos validar el cupón.' })
      } finally { if (!controller.signal.aborted) setCheckingCoupon(false) }
    }, 450)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [coupon, items])

  const addPackage = (offer: Offer) => {
    const services = offer.service_package_items.flatMap((entry) => Array.isArray(entry.services) ? entry.services : [entry.services]).filter(Boolean)
    const merged = [...items]
    for (const service of services) if (!merged.some((item) => item.id === service.id)) merged.push({ id: service.id, name: service.name, slug: service.slug, price: Number(service.price) })
    setCart(merged)
  }
  const checkout = async () => {
    setError('')
    if (!items.length) return setError('Agrega al menos un servicio.')
    if (name.trim().length < 2 || description.trim().length < 10) return setError('Escribe tu nombre y una descripción de al menos 10 caracteres.')
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-cart-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceIds: items.map((item) => item.id), name, description, coupon }) })
      const body = await response.json()
      if (response.status === 401) { router.push(`/auth/login?redirect=${encodeURIComponent('/carrito')}`); return }
      if (!response.ok) throw new Error(body.error || 'No se pudo preparar el pago.')
      window.location.href = body.url
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo preparar el pago.') } finally { setLoading(false) }
  }

  return <div className="min-h-screen bg-background"><Navbar /><main className="container mx-auto max-w-6xl px-4 pb-20 pt-32">
    <div className="mb-10"><p className="text-sm font-bold uppercase tracking-[.2em] text-primary">Compra segura</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Tu carrito</h1><p className="mt-3 text-muted">Combina servicios, recibe descuentos automáticos y paga todo en Stripe.</p></div>
    {offers.map((offer) => <section key={offer.id} className="mb-8 grid gap-5 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/15 to-violet-500/10 p-6 md:grid-cols-[1fr_auto] md:items-center"><div><div className="mb-2 flex items-center gap-2 text-primary"><PackageCheck className="h-5 w-5" /><b>Paquete recomendado · {Number(offer.discount_percent)}% menos</b></div><h2 className="text-2xl font-bold">{offer.name}</h2><p className="mt-2 text-muted">{offer.description}</p></div><Button variant="primary" onClick={() => addPackage(offer)}>Agregar paquete</Button></section>)}
    <div className="grid gap-8 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-3xl border border-white/10 bg-card/80 p-5 md:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-2xl font-bold"><ShoppingCart className="h-5 w-5 text-primary" />Servicios</h2>{items.length > 0 && <button onClick={() => clearCart()} className="text-sm text-muted hover:text-red-300">Vaciar</button>}</div>
      {!items.length ? <div className="rounded-2xl border border-dashed border-white/15 py-14 text-center"><p className="text-muted">Tu carrito está vacío.</p><Button variant="outline" href="/servicios" className="mt-5">Explorar servicios</Button></div> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div><b>{item.name}</b><p className="mt-1 text-sm text-muted">Pago único</p></div><div className="flex items-center gap-4"><b className="text-lg">${Number(item.price).toFixed(2)}</b><button onClick={() => removeFromCart(item.id)} aria-label={`Quitar ${item.name}`} className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
    </section><aside className="h-fit rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/10 to-card p-6 lg:sticky lg:top-28"><h2 className="text-2xl font-bold">Finalizar compra</h2>{error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Nombre completo<input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 outline-none focus:border-primary" /></label><label className="block text-sm font-semibold">¿Qué necesitas?<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 p-3 outline-none focus:border-primary" /></label><label className="block text-sm font-semibold">Cupón (opcional)<input value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setCouponPreview(null) }} placeholder="DULCAN-XXXXXX o CREADOR" className={`mt-2 h-11 w-full rounded-xl border bg-black/25 px-3 font-mono uppercase outline-none ${couponPreview?.valid ? 'border-emerald-400' : couponPreview?.error ? 'border-red-400' : 'border-white/10 focus:border-primary'}`} />{checkingCoupon && <span className="mt-2 block text-xs text-primary">Validando cupón…</span>}{couponPreview?.valid && <span className="mt-2 block text-xs font-semibold text-emerald-300">✓ {couponPreview.label}</span>}{couponPreview?.error && <span className="mt-2 block text-xs text-red-300">{couponPreview.error}</span>}</label></div><div className="mt-5 space-y-2 border-t border-white/10 pt-5"><div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>{packageDiscount > 0 && <div className="flex justify-between text-sm text-emerald-300"><span>Descuento de paquete</span><span>−${packageDiscount.toFixed(2)}</span></div>}{couponPreview?.valid && <div className="flex justify-between text-sm font-semibold text-emerald-300"><span>Descuento del cupón</span><span>−${Number(couponPreview.couponDiscount).toFixed(2)}</span></div>}<div className="flex items-end justify-between pt-2"><b>Total estimado</b><b className="text-3xl">${(couponPreview?.valid && couponPreview.total != null ? couponPreview.total : subtotal - packageDiscount).toFixed(2)}</b></div></div><Button variant="primary" className="mt-5 h-12 w-full" disabled={loading || checkingCoupon || !items.length} onClick={() => void checkout()}>{loading ? 'Preparando…' : checkingCoupon ? 'Validando cupón…' : 'Pagar con Stripe →'}</Button><p className="mt-3 text-center text-xs text-muted">El cupón y los descuentos se verifican antes de abrir Stripe.</p></aside></div>
  </main><Footer /></div>
}
