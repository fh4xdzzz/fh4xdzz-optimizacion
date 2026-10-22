'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getStoreCart, isLicenseProduct, subscribeStoreCart, updateStoreQuantity } from '@/lib/store-cart'
import type { StoreCartItem, StoreProduct } from '@/lib/store-types'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

export default function StoreCartPanel({ products, sticky = true }: { products: StoreProduct[]; sticky?: boolean }) {
  const router = useRouter()
  const [cart, setCart] = useState<StoreCartItem[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
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
  const currentCart = cart.map(item => {
    const current = products.find(product => product.slug === item.slug)
    return current ? { ...current, quantity: isLicenseProduct(current) ? 1 : item.quantity } : item
  })
  const licenseItems = currentCart.filter(isLicenseProduct)
  const guestItems = currentCart.filter(item => !isLicenseProduct(item))
  const total = currentCart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const guestTotal = guestItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const licenseTotal = licenseItems.reduce((sum, item) => sum + Number(item.price), 0)
  const licenseAvailable = products.some(product => isLicenseProduct(product) && product.purchase_available)

  const buyLicense = async () => {
    if (!licenseItems.length || !licenseAvailable) return
    setPayingLicense(true)
    setLicenseError('')
    try {
      const response = await fetch('/api/dulcan/checkout', { method: 'POST' })
      if (response.status === 401) {
        router.push('/auth/login?redirect=%2Fcarrito')
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
    if (!guestItems.length) return setError('Agrega al menos un producto.')
    setPaying(true)
    try {
      const response = await fetch('/api/stripe/create-store-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, website: '', items: guestItems.map((item) => ({ id: item.id, quantity: item.quantity })) }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error(payload.error || 'No se pudo abrir el pago seguro.')
      window.location.assign(payload.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar el pago.')
      setPaying(false)
    }
  }

  return <aside id="carrito-tienda" aria-label="Carrito de la tienda" className={`h-fit scroll-mt-28 rounded-3xl border border-primary/25 bg-card/90 p-5 shadow-2xl shadow-primary/10 ${sticky ? 'xl:sticky xl:top-24' : ''}`}>
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-primary">Tienda</p><h2 className="mt-1 text-2xl font-black">Programas y productos</h2></div><ShoppingBag className="h-7 w-7 text-primary" /></div>
          <div className="mt-5 space-y-3">{currentCart.length ? currentCart.map(item => <div key={item.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <div className="flex items-start justify-between gap-2"><div><b className="text-sm">{item.name}</b><p className="mt-1 text-xs text-muted">{isLicenseProduct(item) ? 'Licencia permanente · 1 PC' : `${money(Number(item.price))} cada uno`}</p></div><button onClick={() => updateStoreQuantity(item.id, 0)} aria-label={`Quitar ${item.name}`} className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
            <div className="mt-3 flex items-center justify-between">{isLicenseProduct(item) ? <span className="text-xs text-muted">1 licencia</span> : <div className="flex items-center rounded-xl border border-white/10"><button onClick={() => updateStoreQuantity(item.id, item.quantity - 1)} className="p-2" aria-label="Reducir cantidad"><Minus className="h-4 w-4" /></button><span className="min-w-8 text-center font-bold">{item.quantity}</span><button onClick={() => updateStoreQuantity(item.id, item.quantity + 1)} className="p-2" aria-label="Aumentar cantidad"><Plus className="h-4 w-4" /></button></div>}<b>{money(Number(item.price) * item.quantity)}</b></div>
          </div>) : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted">Agrega productos para comenzar.</div>}</div>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5"><span className="text-muted">Subtotal de productos</span><strong className="text-3xl">{money(total)}</strong></div>
          {licenseItems.length > 0 && <div className="mt-5 border-t border-white/10 pt-5">
            {guestItems.length > 0 && <p className="mb-3 text-sm font-semibold">Licencia Dulcan · {money(licenseTotal)}</p>}
            <Button size="lg" className="w-full" disabled={payingLicense || !licenseAvailable} onClick={() => void buyLicense()}>{payingLicense ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Preparando pago…</> : 'Pagar licencia con Stripe →'}</Button>
            <p className="mt-3 text-xs leading-5 text-muted">Tu licencia se guarda en tu cuenta. Si aún no has iniciado sesión, te lo pediremos antes de pagar.</p>
            <p className="mt-2 text-xs leading-5 text-muted">Activa la key en 1 PC y verifica la licencia cada 30 días, sin cuotas adicionales.</p>
            {licenseError && <p role="alert" className="mt-3 text-sm text-red-300">{licenseError}</p>}
          </div>}
          {guestItems.length > 0 && <div className="mt-5 border-t border-white/10 pt-5">
            {licenseItems.length > 0 && <p className="mb-3 text-sm font-semibold">Otros productos · {money(guestTotal)}</p>}
            <div className="space-y-3"><label className="block text-sm font-semibold">Nombre completo<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 font-normal outline-none focus:border-primary" placeholder="Nombre y apellido" /></label><label className="block text-sm font-semibold">Correo electrónico<input value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" type="email" maxLength={320} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 font-normal outline-none focus:border-primary" placeholder="tu@email.com" /></label></div>
            <Button size="lg" className="mt-5 w-full" disabled={paying} onClick={() => void checkout()}>{paying ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Preparando pago…</> : licenseItems.length ? 'Pagar otros productos →' : 'Pagar con Stripe →'}</Button>
            <p className="mt-3 text-center text-xs leading-5 text-muted">Estos productos se pueden comprar como invitado.</p>
          </div>}
          {licenseItems.length > 0 && guestItems.length > 0 && <p className="mt-4 text-xs leading-5 text-muted">La licencia y los demás productos se pagan por separado. Los artículos pendientes permanecerán en tu carrito.</p>}
          {sticky && <Button href="/carrito" variant="outline" className="mt-5 w-full">Ver carrito completo →</Button>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        </aside>
}
