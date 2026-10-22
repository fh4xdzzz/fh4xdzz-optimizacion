// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getStripe: vi.fn(), fulfill: vi.fn(), revoke: vi.fn(), notify: vi.fn(), email: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/stripe-server', () => ({ getStripe: mocks.getStripe }))
vi.mock('@/lib/dulcan-license-service', () => ({ fulfillSoftwareCheckout: mocks.fulfill, revokeRefundedSoftware: mocks.revoke }))
vi.mock('@/lib/discord-integration', () => ({ getDiscordService: () => ({ notifyOrderPaid: mocks.notify }) }))
vi.mock('@/lib/order-notifications', () => ({ sendOrderNotificationEmail: mocks.email }))
import { POST } from '@/app/api/stripe/webhook/route'

const secret = 'whsec_local_fixture_only'
const stripe = new Stripe('sk_test_local_fixture_only')
const purchase = { payment_intent_id: 'pi_fixture', user_id: 'buyer', amount_cents: 1499, currency: 'usd' }
type Row = Record<string, unknown>
let events: Map<string, string>, payments: Row[], from: ReturnType<typeof vi.fn>, rpc: ReturnType<typeof vi.fn>
let insertFailure: boolean, completionFailure: boolean
let orders: Row[], cart: Row | null
function checkout(metadata: Row = { checkout_flow: 'dulcan_license_v1', user_id: 'buyer' }, paymentStatus = 'paid') {
 return { id: 'cs_fixture', payment_status: paymentStatus, metadata, payment_intent: 'pi_fixture', amount_total: 1499, currency: 'usd' }
}
function event(id = 'evt_fixture', object: Row = checkout(), type = 'checkout.session.completed') {
 return { id, object: 'event', type, livemode: true, created: 1800000000, data: { object } }
}
function request(payload: unknown, signature?: string) {
 const body = JSON.stringify(payload)
 const header = signature ?? stripe.webhooks.generateTestHeaderString({ payload: body, secret })
 return new NextRequest('https://example.invalid/api/stripe/webhook', { method: 'POST', body, headers: { 'stripe-signature': header } })
}
function query(table: string) {
 let inserted: Row | Row[] | undefined, updated: Row | undefined
 const filters: Row = {}
 const matches = (row: Row) => Object.entries(filters).every(([key, value]) => row[key] === value)
 function result() {
  if (updated) {
   if (table === 'checkout_carts' && cart && matches(cart)) { Object.assign(cart, updated); return { data: null, error: null } }
   if (table !== 'stripe_webhook_events') throw new Error('Unexpected update: ' + table)
   if (completionFailure && updated.status === 'completed') { completionFailure = false; return { error: { message: 'fixture temporary failure' } } }
   events.set(String(filters.event_id), String(updated.status)); return { error: null }
  }
  if (table === 'checkout_carts') return { data: cart && matches(cart) ? cart : null, error: null }
  if (table === 'orders') {
   if (inserted) {
    const rows = (Array.isArray(inserted) ? inserted : [inserted]).map(row => ({ ...row, id: 'order-' + (orders.length + 1) }))
    orders.push(...rows); return { data: rows, error: null }
   }
   return { data: orders.filter(matches), error: null }
  }
  if (table === 'services') return { data: { name: 'Servicio fixture' }, error: null }
  if (table === 'users') return { data: { discord_id: 'discord-fixture' }, error: null }
  if (table !== 'payment_transactions') throw new Error('Unexpected select: ' + table)
  if (inserted && !Array.isArray(inserted)) {
   if (insertFailure) { insertFailure = false; return { data: null, error: { code: 'fixture', message: 'temporary DB failure' } } }
   const values = inserted
   if (payments.some(row => row.stripe_event_id === values.stripe_event_id || row.stripe_session_id === values.stripe_session_id)) return { data: null, error: { code: '23505' } }
   const saved = { ...values, id: 'payment-' + (payments.length + 1) }; payments.push(saved); return { data: { id: saved.id }, error: null }
  }
  const found = payments.find(matches)
  return { data: found ? { id: found.id } : null, error: null }
 }
 const builder = {
  insert(values: Row | Row[]) { inserted = values; return builder },
  update(values: Row) { updated = values; return builder },
  select() { return builder },
  eq(column: string, value: unknown) { filters[column] = value; return builder },
  neq() { return builder },
  order() { return builder },
  async maybeSingle() {
   const response = result()
   return table === 'orders' && Array.isArray(response.data) ? { ...response, data: response.data[0] || null } : response
  },
  then(resolve: (value: unknown) => unknown, reject?: (cause: unknown) => unknown) { return Promise.resolve().then(result).then(resolve, reject) },
 }
 return builder
}

beforeEach(() => {
 vi.clearAllMocks()
 vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret)
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.invalid')
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'local-fixture-never-a-real-credential')
 vi.spyOn(console, 'error').mockImplementation(() => {})
 events = new Map(); payments = []; orders = []; cart = null; insertFailure = false; completionFailure = false
 from = vi.fn(query)
 rpc = vi.fn(async (name: string, args: Row) => {
  if (name === 'claim_stripe_webhook_event') {
   const status = events.get(String(args.p_event_id))
   if (status === 'completed' || status === 'processing') return { data: false, error: null }
   events.set(String(args.p_event_id), 'processing'); return { data: true, error: null }
  }
  if (name === 'finalize_payment_attribution') return { data: null, error: null }
  if (name === 'finalize_store_order') return { data: null, error: null }
  throw new Error('Unexpected RPC: ' + name)
 })
 mocks.createClient.mockReturnValue({ from, rpc })
 mocks.getStripe.mockReturnValue(stripe)
 mocks.fulfill.mockResolvedValue(purchase)
 mocks.revoke.mockResolvedValue(undefined)
 mocks.email.mockResolvedValue(true)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('signed Stripe webhook license integration', () => {
 it('rejects an invalid signature before creating a database client or fulfilling anything', async () => {
  const response = await POST(request(event(), 't=1,v1=invalid'))
  expect(response.status).toBe(400)
  expect(mocks.createClient).not.toHaveBeenCalled()
  expect(mocks.fulfill).not.toHaveBeenCalled()
  expect(mocks.revoke).not.toHaveBeenCalled()
 })
 it('rejects a body altered after its signature was generated', async () => {
  const original = event()
  const signature = stripe.webhooks.generateTestHeaderString({ payload: JSON.stringify(original), secret })
  const response = await POST(request({ ...original, livemode: false }, signature))
  expect(response.status).toBe(400)
  expect(mocks.createClient).not.toHaveBeenCalled()
 })
 it('records a paid license without creating service orders, attribution or notifications', async () => {
  const response = await POST(request(event()))
  expect(response.status).toBe(200)
  expect(mocks.fulfill).toHaveBeenCalledWith(expect.anything(), checkout(), true)
  expect(payments).toEqual([expect.objectContaining({ stripe_event_id: 'evt_fixture', stripe_session_id: 'cs_fixture', amount: 14.99, user_id: 'buyer', service_id: null, order_id: null, livemode: true })])
  expect(from.mock.calls.every(([table]) => ['payment_transactions', 'stripe_webhook_events'].includes(table))).toBe(true)
  expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled()
  expect(events.get('evt_fixture')).toBe('completed')
 })
 it('acknowledges an already completed event without fulfilling or recording twice', async () => {
  await POST(request(event()))
  const response = await POST(request(event()))
  expect(await response.json()).toEqual({ received: true, duplicate: true })
  expect(mocks.fulfill).toHaveBeenCalledOnce(); expect(payments).toHaveLength(1)
 })
 it('does not process a concurrently claimed event', async () => {
  events.set('evt_fixture', 'processing')
  expect(await (await POST(request(event()))).json()).toEqual({ received: true, duplicate: true })
  expect(mocks.fulfill).not.toHaveBeenCalled(); expect(payments).toHaveLength(0)
 })
 it('retries after a payment record failure instead of acknowledging it as completed', async () => {
  insertFailure = true
  expect((await POST(request(event()))).status).toBe(500)
  expect(events.get('evt_fixture')).toBe('failed')
  expect((await POST(request(event()))).status).toBe(200)
  expect(events.get('evt_fixture')).toBe('completed'); expect(payments).toHaveLength(1)
  expect(mocks.fulfill).toHaveBeenCalledTimes(2)
 })
 it('reuses the event payment when the completion write failed on the previous delivery', async () => {
  completionFailure = true
  expect((await POST(request(event()))).status).toBe(500)
  expect(payments).toHaveLength(1)
  expect((await POST(request(event()))).status).toBe(200)
  expect(payments).toHaveLength(1); expect(events.get('evt_fixture')).toBe('completed')
 })
 it('handles completed and async success events for one session with one payment transaction', async () => {
  expect((await POST(request(event()))).status).toBe(200)
  expect((await POST(request(event('evt_async', checkout(), 'checkout.session.async_payment_succeeded')))).status).toBe(200)
  expect(payments).toHaveLength(1)
  expect(events.get('evt_async')).toBe('completed')
  expect(mocks.fulfill).toHaveBeenCalledTimes(2)
 })
 it('returns a retryable failure when fulfillment fails and can complete on redelivery', async () => {
  mocks.fulfill.mockRejectedValueOnce(new Error('fixture delivery unavailable'))
  expect((await POST(request(event()))).status).toBe(500)
  expect(events.get('evt_fixture')).toBe('failed'); expect(payments).toHaveLength(0)
  expect((await POST(request(event()))).status).toBe(200)
  expect(payments).toHaveLength(1)
 })
 it('does not issue or record an unpaid software checkout', async () => {
  expect((await POST(request(event('evt_unpaid', checkout(undefined, 'unpaid'))))).status).toBe(200)
  expect(mocks.fulfill).not.toHaveBeenCalled(); expect(payments).toHaveLength(0)
 })
 it('does not record payment when the software fulfillment declines issuance', async () => {
  mocks.fulfill.mockResolvedValueOnce(null)
  expect((await POST(request(event()))).status).toBe(200)
  expect(payments).toHaveLength(0)
 })
 it('keeps guest_store_v1 without user_id isolated from software and service processing', async () => {
  const response = await POST(request(event('evt_store', checkout({ checkout_flow: 'guest_store_v1', store_order_id: 'store-fixture' }))))
  expect(response.status).toBe(200)
  expect(rpc).toHaveBeenCalledWith('finalize_store_order', expect.objectContaining({ p_order_id: 'store-fixture', p_stripe_session_id: 'cs_fixture', p_payment_intent_id: 'pi_fixture', p_livemode: true }))
  expect(mocks.fulfill).not.toHaveBeenCalled(); expect(payments).toHaveLength(0)
  expect(from.mock.calls.every(([table]) => table === 'stripe_webhook_events')).toBe(true)
 })
 it('keeps guest store isolation even if software-looking user metadata is present', async () => {
  await POST(request(event('evt_store', checkout({ checkout_flow: 'guest_store_v1', store_order_id: 'store-fixture', user_id: 'buyer', purchase_id: 'purchase-fixture' }))))
  expect(mocks.fulfill).not.toHaveBeenCalled(); expect(payments).toHaveLength(0)
  expect(mocks.notify).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled()
 })
 it('fails a guest store finalization error without falling through to licenses', async () => {
  rpc.mockImplementation(async (name: string) => name === 'claim_stripe_webhook_event' ? { data: true, error: null } : { data: null, error: { message: 'fixture store failure' } })
  expect((await POST(request(event('evt_store', checkout({ checkout_flow: 'guest_store_v1', store_order_id: 'store-fixture', user_id: 'buyer' }))))).status).toBe(500)
  expect(mocks.fulfill).not.toHaveBeenCalled(); expect(payments).toHaveLength(0)
 })
 it('routes a signed refund to revocation without issuing another license', async () => {
  const charge = { id: 'ch_fixture', payment_intent: 'pi_fixture', refunded: true }
  expect((await POST(request(event('evt_refund', charge, 'charge.refunded')))).status).toBe(200)
  expect(mocks.revoke).toHaveBeenCalledWith(expect.anything(), charge)
  expect(mocks.fulfill).not.toHaveBeenCalled(); expect(payments).toHaveLength(0)
 })
})
function mixedCheckout(licenseOnly = false) {
 const total = licenseOnly ? 14.99 : 64.98
 cart = {
  id: 'cart-fixture', user_id: 'buyer', stripe_session_id: 'cs_fixture', total, status: 'pending',
  customer_name: 'Cliente fixture', customer_email: 'fixture@example.invalid', description: 'Solicitud fixture',
  items: [
   ...(!licenseOnly ? [{ id: 'service-fixture', name: 'Servicio fixture', price: 49.99, kind: 'service' }] : []),
   { id: 'dulcan-optimizer', name: 'Dulcan Optimizer', price: 14.99, kind: 'license' },
  ],
 }
 return { ...checkout({ checkout_flow: 'cart_v1', cart_id: 'cart-fixture', user_id: 'buyer', purchase_id: 'purchase-fixture' }), amount_total: Math.round(total * 100) }
}

describe('signed unified cart fulfillment', () => {
 it('issues the license first and creates only the service value while recording one combined payment', async () => {
  const session = mixedCheckout()
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(200)
  expect(mocks.fulfill).toHaveBeenCalledWith(expect.anything(), session, true)
  expect(mocks.fulfill.mock.invocationCallOrder[0]).toBeLessThan(from.mock.invocationCallOrder[0])
  expect(orders).toEqual([expect.objectContaining({ service_id: 'service-fixture', price: 49.99, stripe_session_id: 'cs_fixture' })])
  expect(payments).toEqual([expect.objectContaining({ amount: 64.98, checkout_cart_id: 'cart-fixture', order_id: 'order-1', service_id: 'service-fixture' })])
  expect(cart?.status).toBe('paid')
  expect(mocks.notify).toHaveBeenCalledOnce(); expect(mocks.email).toHaveBeenCalledOnce()
 })
 it('completes a license-only unified cart with zero service orders and one payment', async () => {
  const session = mixedCheckout(true)
  expect((await POST(request(event('evt_license_cart', session)))).status).toBe(200)
  expect(orders).toEqual([])
  expect(payments).toEqual([expect.objectContaining({ amount: 14.99, checkout_cart_id: 'cart-fixture', order_id: null, service_id: null })])
  expect(cart?.status).toBe('paid')
  expect(mocks.email).not.toHaveBeenCalled(); expect(mocks.notify).not.toHaveBeenCalled()
 })
 it('does not create orders or payment when refunded fulfillment declines issuance', async () => {
  const session = mixedCheckout()
  mocks.fulfill.mockResolvedValueOnce(null)
  expect((await POST(request(event('evt_refunded_cart', session)))).status).toBe(200)
  expect(orders).toEqual([]); expect(payments).toEqual([])
  expect(cart?.status).toBe('pending')
  expect(from.mock.calls.every(([table]) => table === 'stripe_webhook_events')).toBe(true)
 })
 it('does not duplicate license delivery calls, orders or payment for the same completed event', async () => {
  const session = mixedCheckout()
  await POST(request(event('evt_mixed', session)))
  expect(await (await POST(request(event('evt_mixed', session)))).json()).toEqual({ received: true, duplicate: true })
  expect(mocks.fulfill).toHaveBeenCalledOnce(); expect(orders).toHaveLength(1); expect(payments).toHaveLength(1)
 })
 it('reuses service orders and combined payment for async success on the same session', async () => {
  const session = mixedCheckout()
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(200)
  expect((await POST(request(event('evt_async_mixed', session, 'checkout.session.async_payment_succeeded')))).status).toBe(200)
  expect(orders).toHaveLength(1); expect(payments).toHaveLength(1)
  expect(payments[0].amount).toBe(64.98)
  expect(mocks.notify).toHaveBeenCalledOnce()
 })
 it('recovers after payment-record failure without duplicating an existing service order', async () => {
  const session = mixedCheckout()
  insertFailure = true
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(500)
  expect(orders).toHaveLength(1); expect(payments).toHaveLength(0)
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(200)
  expect(orders).toHaveLength(1); expect(payments).toHaveLength(1)
  expect(payments[0].amount).toBe(64.98)
 })
 it('recovers after completion-write failure without recording the license amount separately', async () => {
  const session = mixedCheckout()
  completionFailure = true
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(500)
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(200)
  expect(orders).toHaveLength(1); expect(payments).toHaveLength(1)
  expect(payments[0].amount).toBe(64.98)
 })
 it.each([
  ['Stripe session', { stripe_session_id: 'cs_another' }],
  ['paid amount', { total: 64.97 }],
  ['owner', { user_id: 'another-buyer' }],
 ])('rejects a mismatched cart %s before creating orders or recording money', async (_name, change) => {
  const session = mixedCheckout()
  Object.assign(cart!, change)
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(500)
  expect(orders).toEqual([]); expect(payments).toEqual([])
  expect(events.get('evt_mixed')).toBe('failed')
 })
 it('rejects a checkout currency that differs from USD', async () => {
  const session = { ...mixedCheckout(), currency: 'eur' }
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(500)
  expect(orders).toEqual([]); expect(payments).toEqual([])
 })
 it('rejects purchase metadata when the persisted cart has no license', async () => {
  const session = mixedCheckout()
  cart!.items = [{ id: 'service-fixture', price: 64.98, kind: 'service' }]
  expect((await POST(request(event('evt_mixed', session)))).status).toBe(500)
  expect(orders).toEqual([]); expect(payments).toEqual([])
 })
 it('preserves a service-only legacy cart without invoking license fulfillment', async () => {
  const mixed = mixedCheckout()
  cart!.items = [{ id: 'service-fixture', name: 'Servicio fixture', price: 49.99, kind: 'service' }]
  cart!.total = 49.99
  const session = { ...mixed, amount_total: 4999, metadata: { checkout_flow: 'cart_v1', cart_id: 'cart-fixture', user_id: 'buyer' } }
  expect((await POST(request(event('evt_service_cart', session)))).status).toBe(200)
  expect(mocks.fulfill).not.toHaveBeenCalled()
  expect(orders).toEqual([expect.objectContaining({ service_id: 'service-fixture', price: 49.99 })])
  expect(payments).toEqual([expect.objectContaining({ amount: 49.99, checkout_cart_id: 'cart-fixture' })])
 })
 it('rejects a persisted license cart when purchase metadata is absent', async () => {
  const mixed = mixedCheckout()
  const session = { ...mixed, metadata: { checkout_flow: 'cart_v1', cart_id: 'cart-fixture', user_id: 'buyer' } }
  expect((await POST(request(event('evt_missing_purchase', session)))).status).toBe(500)
  expect(mocks.fulfill).not.toHaveBeenCalled()
  expect(orders).toEqual([]); expect(payments).toEqual([])
 })

})
