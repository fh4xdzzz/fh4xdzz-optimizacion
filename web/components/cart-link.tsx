'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getCart, subscribeCart } from '@/lib/cart'
import { getStoreCart, subscribeStoreCart } from '@/lib/store-cart'

export function CartLink({ mobile = false }: { mobile?: boolean }) {
  const [counts, setCounts] = useState({ services: 0, products: 0 })
  const pathname = usePathname()
  useEffect(() => {
    const update = () => setCounts({ services: getCart().length, products: getStoreCart().reduce((sum, item) => sum + item.quantity, 0) })
    const frame = requestAnimationFrame(update)
    const unsubscribeServices = subscribeCart(update)
    const unsubscribeProducts = subscribeStoreCart(update)
    return () => { cancelAnimationFrame(frame); unsubscribeServices(); unsubscribeProducts() }
  }, [])
  const storeCart = pathname.startsWith('/tienda') || (counts.products > 0 && counts.services === 0)
  const count = storeCart ? counts.products : counts.services

  return (
    <Link href={storeCart ? '/tienda#carrito-tienda' : '/carrito'} className={mobile ? 'flex h-12 items-center rounded-xl border border-white/10 px-4 font-semibold' : 'relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.06] text-white transition hover:border-primary/60 hover:bg-primary/15'} aria-label={`Carrito, ${count} ${storeCart ? 'productos' : 'servicios'}`}>
      <ShoppingCart className="h-5 w-5" />
      {mobile ? <span className="ml-3">Carrito</span> : null}
      {count > 0 && <span className={mobile ? 'ml-auto rounded-full bg-primary px-2 py-0.5 text-xs' : 'absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black'}>{count}</span>}
    </Link>
  )
}
