'use client'

export type CartItem = {
  id: string
  name: string
  slug: string
  price: number
}

const KEY = 'tdd-cart-v1'
const EVENT = 'tdd-cart-change'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value.slice(0, 10) : []
  } catch {
    return []
  }
}

export function setCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 10)))
  window.dispatchEvent(new Event(EVENT))
}

export function addToCart(item: CartItem) {
  const items = getCart()
  if (!items.some((current) => current.id === item.id)) setCart([...items, item])
}

export function removeFromCart(id: string) {
  setCart(getCart().filter((item) => item.id !== id))
}

export function clearCart() {
  setCart([])
}

export function subscribeCart(listener: () => void) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
