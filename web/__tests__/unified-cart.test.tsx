import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CartPage from '@/app/carrito/page'
import { CartLink } from '@/components/cart-link'
import { addToCart, getCart } from '@/lib/cart'
import { addStoreProduct, getStoreCart } from '@/lib/store-cart'
import type { StoreProduct } from '@/lib/store-types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/navbar', () => ({ default: () => null }))
vi.mock('@/components/footer', () => ({ default: () => null }))

const app: StoreProduct = { id: -1, slug: 'dulcan-optimizer', name: 'Dulcan Optimizer', price: 14.99, category: 'Software', description: 'Fixture license', image_url: null, product_type: 'digital', inventory_count: null, is_active: true, is_featured: true, sort_order: 0, purchase_flow: 'dulcan_license', purchase_available: true }
const service = { id: 'fixture-service', slug: 'streaming', name: 'Fixture streaming service', price: 49.99 }
let fetcher: ReturnType<typeof vi.fn>
beforeEach(() => {
  localStorage.clear()
  fetcher = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === '/api/public/products') return new Response(JSON.stringify({ products: [app] }), { status: 200 })
    if (String(input) === '/api/store/offers') return new Response(JSON.stringify({ packages: [] }), { status: 200 })
    return new Response(JSON.stringify({ error: 'Fixture payment unavailable' }), { status: 503 })
  })
  vi.stubGlobal('fetch', fetcher)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('one cart access for software and services', () => {
  it.each(['app-first', 'service-first'])('shows both items and the full total when added %s', async order => {
    if (order === 'app-first') { addStoreProduct(app); addToCart(service) }
    else { addToCart(service); addStoreProduct(app) }
    render(<><CartLink /><CartPage /></>)
    expect(await screen.findByRole('button', { name: 'Quitar Dulcan Optimizer' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Quitar Fixture streaming service' })).toBeTruthy()
    expect(await screen.findByText('$64.98')).toBeTruthy()
    const link = await screen.findByRole('link', { name: 'Carrito, 2 artículos' })
    expect(link.getAttribute('href')).toBe('/carrito')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Dulcan Optimizer' }))
    await waitFor(() => expect(getStoreCart()).toHaveLength(0))
    expect(getCart()).toEqual([service])
    expect(screen.getByRole('button', { name: 'Quitar Fixture streaming service' })).toBeTruthy()
  })
  it('allows paying the license without requiring the unrelated service form', async () => {
    addStoreProduct(app); addToCart(service)
    render(<CartPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Pagar licencia con Stripe →' }))
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/dulcan/checkout', { method: 'POST' }))
    expect(fetcher.mock.calls.some(([input]) => input === '/api/stripe/create-cart-checkout')).toBe(false)
    expect(getCart()).toEqual([service]); expect(getStoreCart()).toHaveLength(1)
  })
  it('sends only service IDs to the service checkout and keeps the app pending', async () => {
    addStoreProduct(app); addToCart(service)
    render(<CartPage />)
    fireEvent.change(await screen.findByRole('textbox', { name: 'Nombre completo' }), { target: { value: 'Fixture customer' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Plataforma, equipo y objetivo/ }), { target: { value: 'Fixture streaming setup details' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pagar servicios con Stripe →' }))
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/stripe/create-cart-checkout', expect.anything()))
    const call = fetcher.mock.calls.find(([input]) => input === '/api/stripe/create-cart-checkout')!
    expect(JSON.parse(call[1].body).serviceIds).toEqual(['fixture-service'])
    expect(getStoreCart()).toHaveLength(1)
  })
})
