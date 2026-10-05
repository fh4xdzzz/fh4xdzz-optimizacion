'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCart, subscribeCart } from '@/lib/cart'

export function CartLink({ mobile = false }: { mobile?: boolean }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => setCount(getCart().length)
    update()
    return subscribeCart(update)
  }, [])

  return (
    <Link href="/carrito" className={mobile ? 'flex h-12 items-center rounded-xl border border-white/10 px-4 font-semibold' : 'relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.06] text-white transition hover:border-primary/60 hover:bg-primary/15'} aria-label={`Carrito, ${count} servicios`}>
      <ShoppingCart className="h-5 w-5" />
      {mobile ? <span className="ml-3">Carrito</span> : null}
      {count > 0 && <span className={mobile ? 'ml-auto rounded-full bg-primary px-2 py-0.5 text-xs' : 'absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black'}>{count}</span>}
    </Link>
  )
}
