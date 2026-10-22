// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
const mocks = vi.hoisted(() => ({ from: vi.fn(), createCheckout: vi.fn(), ready: vi.fn(), insertOrder: vi.fn(), addProduct: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/stripe-server', () => ({ getStripe: () => ({ checkout: { sessions: { create: mocks.createCheckout } } }) }))
vi.mock('@/lib/dulcan-license-crypto', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/dulcan-license-crypto')>(), licenseConfigurationReady: mocks.ready }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/navbar', () => ({ default: () => null }))
vi.mock('@/components/footer', () => ({ default: () => null }))
vi.mock('next/image', async () => { const { createElement } = await import('react'); return { default: (props: { src: string; alt: string }) => createElement('img', { src: props.src, alt: props.alt }) } })
vi.mock('@/lib/store-cart', () => ({ getStoreCart: () => [], subscribeStoreCart: () => () => {}, addStoreProduct: mocks.addProduct, updateStoreQuantity: vi.fn() }))
import { GET as catalog } from '@/app/api/public/products/route'
import { POST as guestCheckout } from '@/app/api/stripe/create-store-checkout/route'
import StorePage from '@/app/tienda/page'

type Product = Record<string, unknown>
const ordinary = { id: 10, name: 'Fixture overlay', slug: 'fixture-overlay', price: 7, product_type: 'digital', inventory_count: null, is_active: true, image_url: '/fixture.png' }
// The store price is deliberately wrong: licensing must use software_products as its authority.
const dulcan = { id: 11, name: 'Dulcan Optimizer', slug: 'dulcan-optimizer', price: 1, product_type: 'digital', inventory_count: null, is_active: true, image_url: '/dulcan-optimizer/caja.png' }
let products: Product[], software: Product | null, softwareError: { message: string } | null
function query(table: string) {
 let ids: number[] | undefined
 const result = () => ({ data: table === 'store_products' ? products.filter(product => !ids || ids.includes(Number(product.id))) : software, error: table === 'software_products' ? softwareError : null })
 const builder = {
  select() { return builder }, eq() { return builder }, order() { return builder },
  in(_column: string, value: number[]) { ids = value; return builder },
  maybeSingle: async () => result(),
  then(resolve: (value: ReturnType<typeof result>) => unknown) { return Promise.resolve(result()).then(resolve) },
 }
 if (table === 'store_orders') return {
  insert: mocks.insertOrder,
  update: () => ({ eq: async () => ({ error: null }) }),
 }
 return builder
}
function request(ids: number[]) {
 return new NextRequest('https://www.thedulcandesign.com/api/stripe/create-store-checkout', { method: 'POST', headers: { origin: 'https://www.thedulcandesign.com', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Fixture buyer', email: 'fixture@example.invalid', items: ids.map(id => ({ id, quantity: 1 })), purchase_flow: 'guest_store_v1' }) })
}
beforeEach(() => {
 vi.clearAllMocks()
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.invalid')
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-never-real')
 vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.thedulcandesign.com')
 products = [{ ...ordinary }, { ...dulcan }]
 software = { id: 'dulcan-optimizer', name: 'Dulcan Optimizer', amount_cents: 1499, currency: 'usd', active: true }
 softwareError = null
 mocks.ready.mockReturnValue(true)
 mocks.from.mockImplementation(query)
 mocks.insertOrder.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'order-fixture' }, error: null }) }) })
 mocks.createCheckout.mockResolvedValue({ id: 'cs_fixture', url: 'https://checkout.stripe.com/fixture' })
 vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('Dulcan inside the existing store catalog', () => {
 it('includes a virtual canonical software product without creating a guest-store row', async () => {
  products = [{ ...ordinary }]
  software!.amount_cents = 1799
  const response = await catalog()
  expect(response.status).toBe(200)
  const { products: listed } = await response.json()
  expect(listed).toHaveLength(2)
  expect(listed.filter((product: Product) => product.slug === 'dulcan-optimizer')).toEqual([expect.objectContaining({ id: -1, category: 'Software', price: 17.99, image_url: '/dulcan-optimizer/caja.png', purchase_flow: 'dulcan_license', purchase_available: true })])
  expect(listed.find((product: Product) => product.slug === 'fixture-overlay')).toEqual(ordinary)
  expect(mocks.insertOrder).not.toHaveBeenCalled()
 })
 it('retains only ordinary products when there is no canonical software row', async () => {
  products = [{ ...ordinary }]; software = null
  const response = await catalog()
  expect(response.status).toBe(200)
  expect((await response.json()).products).toEqual([ordinary])
 })
 it('does not synthesize an inactive software product when no guest-store row exists', async () => {
  products = [{ ...ordinary }]; software!.active = false
  const response = await catalog()
  expect(response.status).toBe(200)
  expect((await response.json()).products).toEqual([ordinary])
 })
 it('marks the canonical slug as a license purchase and replaces the stale store price', async () => {
  const response = await catalog()
  expect(response.status).toBe(200)
  const { products: listed } = await response.json()
  expect(listed.find((product: Product) => product.slug === 'dulcan-optimizer')).toEqual(expect.objectContaining({ purchase_flow: 'dulcan_license', price: 14.99, image_url: '/dulcan-optimizer/caja.png' }))
  expect(mocks.from).toHaveBeenCalledWith('software_products')
  expect(listed.find((product: Product) => product.slug === 'fixture-overlay')).toEqual(expect.objectContaining({ price: 7 }))
 })
 it('reads a changed canonical license amount instead of hard-coding 14.99', async () => {
  software!.amount_cents = 1799
  const { products: listed } = await (await catalog()).json()
  expect(listed.find((product: Product) => product.slug === 'dulcan-optimizer')?.price).toBe(17.99)
 })
 it('never exposes a stale purchasable license price if the canonical product lookup fails', async () => {
  software = null; softwareError = { message: 'fixture unavailable' }
  const response = await catalog()
  if (!response.ok) { expect(response.status).toBeGreaterThanOrEqual(500); return }
  const { products: listed } = await response.json()
  expect(listed.some((product: Product) => product.slug === 'dulcan-optimizer')).toBe(false)
  expect(listed.some((product: Product) => product.slug === 'fixture-overlay')).toBe(true)
 })
 it.each(['inactive', 'backend-unavailable'])('does not offer a license purchase when %s', async condition => {
  if (condition === 'inactive') software!.active = false
  else mocks.ready.mockReturnValue(false)
  const { products: listed } = await (await catalog()).json()
  const product = listed.find((item: Product) => item.slug === 'dulcan-optimizer')
  expect(product).toEqual(expect.objectContaining({ purchase_flow: 'dulcan_license', purchase_available: false }))
 })
 it('does not turn an ordinary digital product into a software license', async () => {
  const { products: listed } = await (await catalog()).json()
  expect(listed.find((product: Product) => product.slug === 'fixture-overlay')?.purchase_flow).not.toBe('dulcan_license')
 })
})

describe('guest checkout must never collect payment for Dulcan licenses', () => {
 it.each([{ ids: [11] }, { ids: [10, 11] }])('rejects canonical Dulcan IDs even in a mixed or stale client cart: %j', async ({ ids }) => {
  const response = await guestCheckout(request(ids))
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual(expect.objectContaining({ code: 'license_checkout_required' }))
  expect(mocks.insertOrder).not.toHaveBeenCalled()
  expect(mocks.createCheckout).not.toHaveBeenCalled()
 })
 it('keeps the ordinary guest store checkout working separately', async () => {
  const response = await guestCheckout(request([10]))
  expect(response.status).toBe(200)
  expect(mocks.createCheckout).toHaveBeenCalledOnce()
  const [payment] = mocks.createCheckout.mock.calls[0]
  expect(payment.metadata.checkout_flow).toBe('guest_store_v1')
  expect(payment.line_items[0].price_data.unit_amount).toBe(700)
 })
})
describe('license purchase in the existing store UI', () => {
 it('opens the license checkout endpoint instead of adding Dulcan to the guest cart', async () => {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input) === '/api/public/products'
   ? new Response(JSON.stringify({ products: [{ ...dulcan, price: 14.99, category: 'Software', description: 'Permanent license fixture', purchase_flow: 'dulcan_license', purchase_available: true }] }), { status: 200 })
   : new Response(JSON.stringify({ error: 'Fixture checkout unavailable' }), { status: 503 }))
  vi.stubGlobal('fetch', fetcher)
  render(createElement(StorePage))
  const title = await screen.findByRole('heading', { name: 'Dulcan Optimizer' })
  const card = title.closest('article')!
  expect(within(card).getByRole('img', { name: /Dulcan Optimizer/ }).getAttribute('src')).toBe('/dulcan-optimizer/caja.png')
  fireEvent.click(within(card).getByRole('button'))
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith('/api/dulcan/checkout', expect.objectContaining({ method: 'POST' })))
  expect(mocks.addProduct).not.toHaveBeenCalled()
  expect(fetcher.mock.calls.some(([input]) => String(input) === '/api/stripe/create-store-checkout')).toBe(false)
 })
 it('disables the license purchase when the server marks it unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ products: [{ ...dulcan, price: 14.99, category: 'Software', description: 'Permanent license fixture', purchase_flow: 'dulcan_license', purchase_available: false }] }), { status: 200 })))
  render(createElement(StorePage))
  const title = await screen.findByRole('heading', { name: 'Dulcan Optimizer' })
  expect((within(title.closest('article')!).getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  expect(mocks.addProduct).not.toHaveBeenCalled()
 })
})