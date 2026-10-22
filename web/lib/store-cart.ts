'use client'

import type { StoreCartItem, StoreProduct } from '@/lib/store-types'

const KEY = 'tdd-store-cart-v1'
const EVENT = 'tdd-store-cart-change'

export function isLicenseProduct(product: Pick<StoreProduct, 'slug' | 'purchase_flow'>) {
  return product.purchase_flow === 'dulcan_license' || product.slug === 'dulcan-optimizer'
}

export function getStoreCart(): StoreCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value.slice(0, 20).map(item => isLicenseProduct(item) ? { ...item, quantity: 1 } : item) : []
  } catch {
    return []
  }
}

export function setStoreCart(items: StoreCartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 20)))
  window.dispatchEvent(new Event(EVENT))
}

export function addStoreProduct(product: StoreProduct) {
  const items = getStoreCart()
  const existing = items.find((item) => item.id === product.id)
  const maximum = isLicenseProduct(product) ? 1 : product.inventory_count ?? 10
  if (existing) {
    setStoreCart(items.map((item) => item.id === product.id
      ? { ...item, quantity: Math.min(item.quantity + 1, maximum) }
      : item))
    return
  }
  setStoreCart([...items, { ...product, quantity: 1 }])
}

export function updateStoreQuantity(id: number, quantity: number) {
  const items = getStoreCart()
  setStoreCart(items.flatMap((item) => {
    if (item.id !== id) return [item]
    if (quantity <= 0) return []
    return [{ ...item, quantity: Math.min(quantity, isLicenseProduct(item) ? 1 : item.inventory_count ?? 10) }]
  }))
}

export function clearStoreCart(flow?: 'guest' | 'license') {
  setStoreCart(flow ? getStoreCart().filter(item => flow === 'license' ? !isLicenseProduct(item) : isLicenseProduct(item)) : [])
}

export function subscribeStoreCart(listener: () => void) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}
