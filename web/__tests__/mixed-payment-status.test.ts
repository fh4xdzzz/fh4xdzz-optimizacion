// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ session: vi.fn(), retrieve: vi.fn(), userClient: vi.fn(), admin: vi.fn(), userFrom: vi.fn(), adminFrom: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/stripe-server', () => ({ getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.userClient }))
vi.mock('@/lib/dulcan-license-service', () => ({ licenseAdmin: mocks.admin }))
vi.mock('@/components/navbar', () => ({ default: () => null }))
vi.mock('@/components/footer', () => ({ default: () => null }))
import { GET } from '@/app/api/stripe/session-status/route'
import PaymentSuccessClient from '@/app/pago/exito/payment-success-client'
import { getCart, setCart } from '@/lib/cart'
import { getStoreCart, setStoreCart } from '@/lib/store-cart'
import type { StoreCartItem } from '@/lib/store-types'

type Row = Record<string, unknown>
let cart: Row | null, order: Row | null, license: Row | null, checkout: Row
let filters: { table: string; column: string; value: unknown }[]
function query(table: string) {
 const equals: Row = {}
 const chain = {
  select() { return chain }, is() { return chain }, ilike() { return chain }, limit() { return chain },
  eq(column: string, value: unknown) { equals[column] = value; filters.push({ table, column, value }); return chain },
  async maybeSingle() {
   const row = table === 'checkout_carts' ? cart : table === 'software_licenses' ? license : order
   const matches = row && Object.entries(equals).every(([key, value]) => row[key] === value)
   return { data: matches ? row : null, error: null }
  },
 }
 return chain
}
function request() { return new NextRequest('https://www.thedulcandesign.com/api/stripe/session-status?session_id=cs_fixture') }
beforeEach(() => {
 vi.clearAllMocks(); localStorage.clear(); filters = []
 mocks.session.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.invalid' } })
 checkout = { id: 'cs_fixture', metadata: { checkout_flow: 'cart_v1', cart_id: 'cart-fixture', purchase_id: 'purchase-fixture', user_id: 'buyer' }, payment_status: 'paid', amount_total: 5499, currency: 'usd' }
 cart = { id: 'cart-fixture', user_id: 'buyer', stripe_session_id: 'cs_fixture', status: 'paid', items: [{ id: 'paid-service', name: 'Fixture service', kind: 'service' }, { id: 'dulcan-optimizer', name: 'Dulcan', kind: 'license' }] }
 order = { id: 'order-fixture', user_id: 'buyer', order_number: 'FIXTURE', status: 'reviewing', services: { name: 'Fixture service' } }
 license = { id: 'license-fixture', purchase_id: 'purchase-fixture', user_id: 'buyer', status: 'active' }
 mocks.retrieve.mockImplementation(async () => checkout)
 mocks.userFrom.mockImplementation(query); mocks.adminFrom.mockImplementation(query)
 mocks.userClient.mockResolvedValue({ from: mocks.userFrom }); mocks.admin.mockReturnValue({ from: mocks.adminFrom })
 vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear() })

describe('private mixed-payment session status', () => {
 it('rejects another buyer before constructing either user or privileged database clients', async () => {
  checkout.metadata = { user_id: 'another-buyer', checkout_flow: 'cart_v1' }
  expect((await GET(request())).status).toBe(403)
  expect(mocks.userClient).not.toHaveBeenCalled(); expect(mocks.admin).not.toHaveBeenCalled()
 })
 it('reports fulfillment ready for a paid cart, service order and active owner license', async () => {
  const response = await GET(request())
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(expect.objectContaining({ paymentStatus: 'paid', hasLicense: true, hasServices: true, licenseReady: true, fulfillmentReady: true, serviceIds: ['paid-service'] }))
  expect(filters).toEqual(expect.arrayContaining([
   { table: 'checkout_carts', column: 'id', value: 'cart-fixture' },
   { table: 'checkout_carts', column: 'user_id', value: 'buyer' },
   { table: 'checkout_carts', column: 'stripe_session_id', value: 'cs_fixture' },
   { table: 'software_licenses', column: 'purchase_id', value: 'purchase-fixture' },
   { table: 'software_licenses', column: 'user_id', value: 'buyer' },
   { table: 'software_licenses', column: 'status', value: 'active' },
  ]))
 })
 it.each(['missing', 'revoked', 'another-owner', 'another-purchase'])('does not report a %s license as ready', async condition => {
  if (condition === 'missing') license = null
  if (condition === 'revoked') license!.status = 'revoked'
  if (condition === 'another-owner') license!.user_id = 'another-buyer'
  if (condition === 'another-purchase') license!.purchase_id = 'other-purchase'
  expect(await (await GET(request())).json()).toEqual(expect.objectContaining({ licenseReady: false, fulfillmentReady: false }))
 })
 it('waits for the paid-cart state even when its license and service order already exist', async () => {
  cart!.status = 'pending'
  expect(await (await GET(request())).json()).toEqual(expect.objectContaining({ licenseReady: true, fulfillmentReady: false }))
 })
 it('waits for a service order for a mixed purchase', async () => {
  order = null
  expect(await (await GET(request())).json()).toEqual(expect.objectContaining({ hasServices: true, licenseReady: true, fulfillmentReady: false }))
 })
 it('accepts a license-only paid cart without requiring a service order', async () => {
  cart!.items = [{ id: 'dulcan-optimizer', kind: 'license', name: 'Dulcan' }]; order = null
  expect(await (await GET(request())).json()).toEqual(expect.objectContaining({ hasLicense: true, hasServices: false, licenseReady: true, fulfillmentReady: true, serviceIds: [], order: null }))
 })
 it.each([{ user_id: 'another-buyer' }, { stripe_session_id: 'cs_other' }, { id: 'other-cart' }])('does not read a cart outside the user/session/cart binding: %j', async patch => {
  Object.assign(cart!, patch)
  expect((await GET(request())).status).toBe(500)
  expect(mocks.admin).not.toHaveBeenCalled()
 })
})

const service = (id: string) => ({ id, name: id, slug: id, price: 40 })
function seedCarts() {
 setCart([service('paid-service'), service('unpaid-service')])
 setStoreCart([
  { id: -1, name: 'Dulcan', slug: 'dulcan-optimizer', price: 14.99, purchase_flow: 'dulcan_license', quantity: 1 },
  { id: 10, name: 'Other product', slug: 'other-product', price: 7, quantity: 1 },
 ] as StoreCartItem[])
}
function summary(patch: Row = {}) {
 return { paymentStatus: 'paid', customerEmail: 'buyer@example.invalid', amount: 54.99, currency: 'USD', serviceName: 'Mixed fixture', hasLicense: true, hasServices: true, licenseReady: true, fulfillmentReady: true, serviceIds: ['paid-service'], order: { id: 'order-fixture', orderNumber: 'FIXTURE', status: 'reviewing' }, ...patch }
}
function respond(payload: Row) { vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }))) }
describe('payment-success cart cleanup', () => {
 it('removes only purchased services and the fulfilled license, preserving other cart entries', async () => {
  seedCarts(); respond(summary())
  render(createElement(PaymentSuccessClient, { sessionId: 'cs_fixture', isCart: true }))
  await waitFor(() => expect(getCart().map(item => item.id)).toEqual(['unpaid-service']))
  expect(getStoreCart().map(item => item.slug)).toEqual(['other-product'])
 })
 it.each([
  { label: 'pending fulfillment', patch: { fulfillmentReady: false } },
  { label: 'unpaid Stripe payment', patch: { paymentStatus: 'unpaid' } },
 ])('does not clear carts for $label', async ({ patch }) => {
  seedCarts(); respond(summary(patch))
  render(createElement(PaymentSuccessClient, { sessionId: 'cs_fixture', isCart: true }))
  await screen.findByRole('heading', { name: 'Mixed fixture' })
  expect(getCart().map(item => item.id)).toEqual(['paid-service', 'unpaid-service'])
  expect(getStoreCart().map(item => item.slug)).toEqual(['dulcan-optimizer', 'other-product'])
 })
 it('does not clear a ready purchase on a non-cart success page', async () => {
  seedCarts(); respond(summary())
  render(createElement(PaymentSuccessClient, { sessionId: 'cs_fixture', isCart: false }))
  await screen.findByRole('heading', { name: 'Mixed fixture' })
  expect(getCart()).toHaveLength(2); expect(getStoreCart()).toHaveLength(2)
 })
 it('preserves all services when only the license was purchased', async () => {
  seedCarts(); respond(summary({ hasServices: false, serviceIds: [], order: null }))
  render(createElement(PaymentSuccessClient, { sessionId: 'cs_fixture', isCart: true }))
  await waitFor(() => expect(getStoreCart().map(item => item.slug)).toEqual(['other-product']))
  expect(getCart().map(item => item.id)).toEqual(['paid-service', 'unpaid-service'])
 })
})