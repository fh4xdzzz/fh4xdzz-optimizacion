'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Clapperboard, Layers3, LoaderCircle, Minus, Package, Plus, ShieldCheck, ShoppingBag, Sparkles, Trash2, WandSparkles } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { addStoreProduct, getStoreCart, subscribeStoreCart, updateStoreQuantity } from '@/lib/store-cart'
import type { StoreCartItem, StoreProduct } from '@/lib/store-types'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const upcomingPacks = [
  { title: 'Packs de overlays', description: 'Diseños completos para darle una identidad visual profesional a tu transmisión.', icon: Layers3 },
  { title: 'Alertas animadas', description: 'Recursos visuales para seguidores, suscripciones, donaciones y momentos especiales.', icon: WandSparkles },
  { title: 'Escenas para streaming', description: 'Pantallas de inicio, pausa, directo y cierre preparadas para OBS.', icon: Clapperboard },
]

export default function StorePage() {
  const router = useRouter()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [cart, setCart] = useState<StoreCartItem[]>([])
  const [category, setCategory] = useState('Todos')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payingLicense, setPayingLicense] = useState(false)
  const [licenseError, setLicenseError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const refresh = () => setCart(getStoreCart())
    const frame = requestAnimationFrame(refresh)
    const unsubscribe = subscribeStoreCart(refresh)
    return () => { cancelAnimationFrame(frame); unsubscribe() }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/public/products', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la tienda.')
        if (active) setProducts(payload.products || [])
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la tienda.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const categories = useMemo(() => ['Todos', ...new Set(products.map((product) => product.category))], [products])
  const visibleProducts = category === 'Todos' ? products : products.filter((product) => product.category === category)
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const showCart = cart.length > 0 || products.some(product => product.purchase_flow !== 'dulcan_license')

  const add = (product: StoreProduct) => {
    if (product.purchase_flow === 'dulcan_license') return
    addStoreProduct(product)
    setError('')
  }

  const buyLicense = async () => {
    setPayingLicense(true)
    setLicenseError('')
    try {
      const response = await fetch('/api/dulcan/checkout', { method: 'POST' })
      if (response.status === 401) {
        router.push('/auth/login?redirect=%2Ftienda')
        setPayingLicense(false)
        return
      }
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error(payload.error || 'No se pudo preparar la compra.')
      const destination = new URL(payload.url)
      if (destination.protocol !== 'https:' || destination.hostname !== 'checkout.stripe.com') throw new Error('Enlace de pago no válido.')
      window.location.assign(destination.href)
    } catch (cause) {
      setLicenseError(cause instanceof Error ? cause.message : 'No se pudo iniciar la compra.')
      setPayingLicense(false)
    }
  }

  const checkout = async () => {
    setError('')
    if (name.trim().length < 2) return setError('Escribe tu nombre completo.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Escribe un correo válido.')
    if (!cart.length) return setError('Agrega al menos un producto.')
    setPaying(true)
    try {
      const response = await fetch('/api/stripe/create-store-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, website: '', items: cart.map((item) => ({ id: item.id, quantity: item.quantity })) }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error(payload.error || 'No se pudo abrir el pago seguro.')
      window.location.assign(payload.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el pago.')
      setPaying(false)
    }
  }

  return <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pb-24 pt-28">
      <section className="relative overflow-hidden border-b border-white/10 px-4 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,.16),transparent_35%)]" />
        <div className="relative mx-auto w-full max-w-7xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-primary"><Sparkles className="h-4 w-4" /> Tienda TheDulcanDesign</span>
          <h1 className="mt-6 max-w-4xl text-4xl font-black sm:text-6xl">Tu equipo. Tu mejor versión.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Software y recursos para llevar tu setup al siguiente nivel. Descubre Dulcan Optimizer y nuestros productos para creadores.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-muted"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Pago protegido por Stripe</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> Productos digitales</span></div>
        </div>
      </section>

      <section className={`mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 ${showCart ? 'xl:grid-cols-[minmax(0,1fr)_390px]' : ''}`}>
        <div>
          <div className="mb-7 flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item ? 'border-primary bg-primary text-white' : 'border-white/10 bg-white/[.03] text-muted hover:border-primary/40 hover:text-white'}`}>{item}</button>)}</div>
          {loading ? <div className="flex min-h-72 items-center justify-center"><LoaderCircle className="h-9 w-9 animate-spin text-primary" /></div> : visibleProducts.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product) => {
            if (product.purchase_flow === 'dulcan_license') return <article key={product.id} id="dulcan-optimizer" className="relative overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-[#10132b] via-[#090d1d] to-[#17102b] shadow-2xl shadow-violet-600/10 sm:col-span-2 lg:col-span-3">
              <div className="grid items-center md:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)]">
                <div className="relative p-5 sm:p-8"><div className="absolute inset-10 rounded-full bg-blue-600/15 blur-3xl" /><Image src={product.image_url || '/dulcan-optimizer/caja.png'} alt="Caja de Dulcan Optimizer Neon" width={1024} height={1536} sizes="(max-width: 768px) 85vw, 420px" className="relative mx-auto h-auto max-h-[570px] w-auto max-w-full rounded-xl object-contain" /></div>
                <div className="px-6 pb-8 sm:px-8 md:py-8">
                  <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Software · Windows</span>
                  <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Dulcan <span className="text-violet-400">Optimizer</span></h2>
                  <p className="mt-4 text-sm leading-7 text-slate-300">{product.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-200">{['Licencia permanente para 1 PC', 'Un solo pago, sin suscripción', 'Key en tu cuenta y por correo', 'Diagnóstico, perfiles y mantenimiento'].map(feature => <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-cyan-300" />{feature}</li>)}</ul>
                  <div className="mt-7 border-t border-white/10 pt-6"><div className="flex items-baseline gap-2"><strong className="text-4xl font-black">{money(Number(product.price))}</strong><span className="text-sm text-slate-400">USD · pago único</span></div>
                    <Button size="lg" className="mt-5 w-full" disabled={payingLicense || !product.purchase_available} onClick={() => void buyLicense()}>{payingLicense ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Preparando compra…</> : product.purchase_available ? 'Comprar licencia' : 'Próximamente'}</Button>
                    <Link href="/dulcan-optimizer" className="mt-4 block text-center text-sm font-semibold text-violet-300 hover:text-white">Ver detalles del programa →</Link>
                    <p className="mt-4 text-xs leading-5 text-slate-400">Inicia sesión para guardar tu licencia. Requiere conexión para activarse y verificarla al menos cada 30 días.</p>
                    {licenseError && <p role="alert" className="mt-3 text-sm text-red-300">{licenseError}</p>}
                  </div>
                </div>
              </div>
            </article>
            const soldOut = product.inventory_count === 0
            return <article key={product.id} className="group overflow-hidden rounded-3xl border border-white/10 bg-card/80 transition hover:-translate-y-1 hover:border-primary/35">
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-violet-500/5">
                {product.image_url ? <Image src={product.image_url} alt={product.name} fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-primary/50" /></div>}
                {product.is_featured && <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">Destacado</span>}
                <span className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{product.product_type === 'digital' ? 'Digital' : 'Físico'}</span>
              </div>
              <div className="p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{product.category}</p><h2 className="mt-2 text-xl font-bold">{product.name}</h2><p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted">{product.description}</p><div className="mt-5 flex items-center justify-between gap-3"><span className="text-2xl font-black">{money(Number(product.price))}</span><Button disabled={soldOut} onClick={() => add(product)}>{soldOut ? 'Agotado' : 'Agregar'}</Button></div>{product.inventory_count != null && product.inventory_count > 0 && product.inventory_count <= 5 && <p className="mt-3 text-xs text-amber-300">Solo quedan {product.inventory_count}</p>}</div>
            </article>
          })}</div> : <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-6 sm:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-primary"><Sparkles className="h-4 w-4" /> Próximamente</span>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">Estamos preparando nuevos packs para creadores</h2>
              <p className="mt-3 leading-7 text-muted">Overlays, alertas y escenas diseñadas para que tu canal tenga una presencia única. Los productos aparecerán aquí cuando estén listos.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {upcomingPacks.map(({ title, description, icon: Icon }) => <article key={title} className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 min-h-20 text-sm leading-6 text-muted">{description}</p>
                <span className="mt-4 inline-flex rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-bold uppercase tracking-[.12em] text-muted">En preparación</span>
              </article>)}
            </div>
          </div>}
        </div>

        {showCart && <aside className="h-fit rounded-3xl border border-primary/25 bg-card/90 p-5 shadow-2xl shadow-primary/10 xl:sticky xl:top-24">
          <div className="flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[.14em] text-primary">Compra como invitado</p><h2 className="mt-1 text-2xl font-black">Tu carrito</h2></div><ShoppingBag className="h-7 w-7 text-primary" /></div>
          <div className="mt-5 space-y-3">{cart.length ? cart.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><div><b>{item.name}</b><p className="mt-1 text-sm text-muted">{money(Number(item.price))} cada uno</p></div><button onClick={() => updateStoreQuantity(item.id, 0)} aria-label={`Quitar ${item.name}`} className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-xl border border-white/10"><button onClick={() => updateStoreQuantity(item.id, item.quantity - 1)} className="p-2" aria-label="Reducir cantidad"><Minus className="h-4 w-4" /></button><span className="min-w-9 text-center font-bold">{item.quantity}</span><button onClick={() => updateStoreQuantity(item.id, item.quantity + 1)} className="p-2" aria-label="Aumentar cantidad"><Plus className="h-4 w-4" /></button></div><b>{money(Number(item.price) * item.quantity)}</b></div></div>) : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted">Agrega productos para comenzar.</div>}</div>
          <div className="mt-5 border-t border-white/10 pt-5"><div className="flex items-center justify-between"><span className="text-muted">Total</span><strong className="text-3xl">{money(total)}</strong></div><div className="mt-5 space-y-3"><label className="block text-sm font-semibold">Nombre completo<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 font-normal outline-none focus:border-primary" placeholder="Nombre y apellido" /></label><label className="block text-sm font-semibold">Correo electrónico<input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" type="email" maxLength={320} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 font-normal outline-none focus:border-primary" placeholder="tu@email.com" /></label></div>{error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<Button size="lg" className="mt-5 w-full" disabled={paying || !cart.length} onClick={() => void checkout()}>{paying ? <><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Preparando pago…</> : 'Pagar con Stripe →'}</Button><p className="mt-3 text-center text-xs leading-5 text-muted">No necesitas iniciar sesión. Stripe procesa la tarjeta de forma segura.</p></div>
        </aside>}
      </section>
    </main>
    <Footer />
  </div>
}
