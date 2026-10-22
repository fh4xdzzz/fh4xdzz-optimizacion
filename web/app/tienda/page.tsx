'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import StoreCartPanel from '@/components/store-cart-panel'
import { Check, Clapperboard, Layers3, LoaderCircle, Package, ShieldCheck, ShoppingBag, Sparkles, WandSparkles } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { addStoreProduct, getStoreCart, isLicenseProduct, subscribeStoreCart } from '@/lib/store-cart'
import type { StoreCartItem, StoreProduct } from '@/lib/store-types'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

const upcomingPacks = [
  { title: 'Packs de overlays', description: 'Diseños completos para darle una identidad visual profesional a tu transmisión.', icon: Layers3 },
  { title: 'Alertas animadas', description: 'Recursos visuales para seguidores, suscripciones, donaciones y momentos especiales.', icon: WandSparkles },
  { title: 'Escenas para streaming', description: 'Pantallas de inicio, pausa, directo y cierre preparadas para OBS.', icon: Clapperboard },
]

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [cart, setCart] = useState<StoreCartItem[]>([])
  const [category, setCategory] = useState('Todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
  const currentCart = cart.map(item => {
    const current = products.find(product => product.slug === item.slug)
    return current ? { ...current, quantity: isLicenseProduct(current) ? 1 : item.quantity } : item
  })
  const add = (product: StoreProduct) => {
    addStoreProduct(product)
    setError('')
    setNotice(`${product.name} agregado al carrito.`)
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

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="mb-7 flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item ? 'border-primary bg-primary text-white' : 'border-white/10 bg-white/[.03] text-muted hover:border-primary/40 hover:text-white'}`}>{item}</button>)}</div>
          {notice && <p role="status" className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">{notice}<a href="/carrito" className="font-semibold underline underline-offset-4">Ver carrito</a></p>}
          {error && <p role="alert" className="mb-5 text-sm text-red-300">{error}</p>}
          {loading ? <div className="flex min-h-72 items-center justify-center"><LoaderCircle className="h-9 w-9 animate-spin text-primary" /></div> : visibleProducts.length ? <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">{visibleProducts.map((product) => {
            const licensed = isLicenseProduct(product)
            const soldOut = product.inventory_count === 0
            const inCart = currentCart.some(item => item.slug === product.slug)
            const unavailable = licensed ? !product.purchase_available : soldOut
            return <article key={product.id} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/80 transition hover:border-primary/40">
              <div className="relative h-80 shrink-0 overflow-hidden bg-gradient-to-br from-[#14172e] via-[#0a0c17] to-primary/10 sm:h-[360px]">
                {product.image_url ? <Image src={product.image_url} alt={licensed ? 'Caja de Dulcan Optimizer Neon' : product.name} fill unoptimized sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-contain p-4 transition duration-500 group-hover:scale-[1.025]" /> : <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-primary/50" /></div>}
                {product.is_featured && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">Destacado</span>}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{product.category}{licensed ? ' · Windows' : ''}</p>
                <h2 className="mt-2 text-xl font-bold">{product.name}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{product.description}</p>
                {licensed && <div className="mt-4 space-y-2 text-xs text-slate-300"><p className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" />Permanente para 1 PC</p><p className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" />Key automática · sin suscripción</p></div>}
                <div className="mt-auto pt-5"><div className="flex flex-wrap items-baseline gap-2"><strong className="text-3xl font-black">{money(Number(product.price))}</strong><span className="text-xs text-muted">USD{licensed ? ' · pago único' : ''}</span></div>
                  <Button className="mt-4 w-full" disabled={unavailable || (licensed && inCart)} onClick={() => add(product)}>{unavailable ? licensed ? 'Próximamente' : 'Agotado' : licensed && inCart ? <><Check className="mr-2 h-4 w-4" />En el carrito</> : <><ShoppingBag className="mr-2 h-4 w-4" />Agregar al carrito</>}</Button>
                  {licensed && <Link href="/dulcan-optimizer" className="mt-3 block text-center text-sm font-semibold text-violet-300 hover:text-white">Ver detalles →</Link>}
                  {product.inventory_count != null && product.inventory_count > 0 && product.inventory_count <= 5 && <p className="mt-3 text-xs text-amber-300">Solo quedan {product.inventory_count}</p>}
                </div>
              </div>
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

        <StoreCartPanel products={products} />
      </section>
    </main>
    <Footer />
  </div>
}
