// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ session: vi.fn(), from: vi.fn(), create: vi.fn(), ready: vi.fn(), rpc: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }))
vi.mock('@/lib/auth-server', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/stripe-server', () => ({ getStripe: () => ({ checkout: { sessions: { create: mocks.create } } }) }))
vi.mock('@/lib/dulcan-license-crypto', async original => ({ ...await original<typeof import('@/lib/dulcan-license-crypto')>(), licenseConfigurationReady: mocks.ready }))
import { POST } from '@/app/api/stripe/create-cart-checkout/route'

const serviceId = '11111111-1111-4111-8111-111111111111'
type Row = Record<string, unknown>
let services: Row[], software: Row | null, coupon: Row | null, inserted: Record<string, Row[]>, updates: Record<string, Row[]>
function query(table: string) {
 let row: Row | undefined
 const values = () => table === 'services' ? services : table === 'software_products' ? software : table === 'service_packages' ? [] : table === 'discount_coupons' ? coupon : null
 const chain = {
  select() { return chain }, in() { return chain }, eq() { return chain }, is() { return chain },
  insert(value: Row) { row = value; (inserted[table] ??= []).push(value); return chain },
  update(value: Row) { (updates[table] ??= []).push(value); return chain },
  async single() { return { data: row ? { id: table === 'checkout_carts' ? 'cart-fixture' : row.id ?? 'purchase-fixture' } : values(), error: null } },
  async maybeSingle() { return { data: values(), error: null } },
  then(resolve: (value: { data: unknown; error: null }) => unknown) { return Promise.resolve({ data: values(), error: null }).then(resolve) },
 }
 return chain
}
function request(patch: Row = {}) {
 return new NextRequest('https://www.thedulcandesign.com/api/stripe/create-cart-checkout', { method: 'POST', headers: { origin: 'https://www.thedulcandesign.com', 'content-type': 'application/json' }, body: JSON.stringify({ serviceIds: [serviceId], includeLicense: true, name: 'Fixture buyer', description: 'Fixture service request description', ...patch }) })
}
beforeEach(() => {
 vi.clearAllMocks()
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.invalid')
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-never-real')
 vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.thedulcandesign.com')
 vi.stubEnv('DULCAN_LICENSE_MODE', 'live')
 vi.stubEnv('DULCAN_LICENSE_RATE_SALT', 'x'.repeat(64))
 vi.stubEnv('STRIPE_SECRET_KEY', 'sk_live_fixture')
 mocks.session.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.invalid', full_name: 'Fixture buyer', discord_username: 'fixture-discord' } })
 mocks.ready.mockReturnValue(true)
 mocks.rpc.mockResolvedValue({ data: true, error: null })
 mocks.create.mockResolvedValue({ id: 'cs_fixture', url: 'https://checkout.stripe.com/fixture' })
 services = [{ id: serviceId, name: 'Fixture service', slug: 'fixture-service', price: 40, billing_type: 'one_time' }]
 software = { id: 'dulcan-optimizer', name: 'Dulcan Optimizer', amount_cents: 1499, currency: 'usd', active: true }
 coupon = null; inserted = {}; updates = {}
 mocks.from.mockImplementation(query)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('one Stripe checkout for services and a Dulcan license', () => {
 it('charges one canonical combined amount and links service cart and license purchase to the same session', async () => {
  expect((await POST(request({ amount: 1, total: 1, licenseAmount: 1, email: 'other@example.invalid' }))).status).toBe(200)
  expect(mocks.create).toHaveBeenCalledOnce()
  const payment = mocks.create.mock.calls[0][0]
  expect(payment.line_items.reduce((sum: number, item: { quantity: number; price_data: { unit_amount: number } }) => sum + item.quantity * item.price_data.unit_amount, 0)).toBe(5499)
  expect(payment.metadata).toEqual(expect.objectContaining({ checkout_flow: 'cart_v1', cart_id: 'cart-fixture', user_id: 'buyer', purchase_id: expect.any(String) }))
  expect(payment.customer_email).toBe('buyer@example.invalid')
  expect(inserted.software_purchases).toEqual([expect.objectContaining({ user_id: 'buyer', amount_cents: 1499, currency: 'usd', email: 'buyer@example.invalid' })])
  expect(inserted.checkout_carts[0]).toEqual(expect.objectContaining({ total: '54.99', items: [expect.objectContaining({ id: serviceId, kind: 'service', price: 40 }), expect.objectContaining({ id: 'dulcan-optimizer', kind: 'license', price: 14.99 })] }))
  expect(updates.checkout_carts).toContainEqual(expect.objectContaining({ stripe_session_id: 'cs_fixture' }))
  expect(updates.software_purchases).toContainEqual(expect.objectContaining({ stripe_session_id: 'cs_fixture' }))
 })
 it('supports a license-only cart with one stored license item and no service form requirement', async () => {
  mocks.session.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.invalid', full_name: 'Fixture buyer' } })
  services = []
  expect((await POST(request({ serviceIds: [], name: undefined, description: undefined }))).status).toBe(200)
  expect(inserted.checkout_carts[0].items).toEqual([expect.objectContaining({ id: 'dulcan-optimizer', kind: 'license', price: 14.99 })])
  expect(inserted.checkout_carts[0].total).toBe('14.99')
  expect(mocks.create).toHaveBeenCalledOnce()
 })
 it('rejects an eleventh stored item when ten services also request a license', async () => {
  const ids = Array.from({ length: 10 }, (_, index) => `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`)
  expect((await POST(request({ serviceIds: ids }))).status).toBe(400)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('uses a changed canonical software price rather than an embedded or client price', async () => {
  software!.amount_cents = 1799
  expect((await POST(request({ licenseAmount: 1 }))).status).toBe(200)
  expect(inserted.software_purchases[0].amount_cents).toBe(1799)
  expect(inserted.checkout_carts[0].total).toBe('57.99')
 })
 it('applies a service coupon without discounting the license portion', async () => {
  coupon = { id: 'coupon-fixture', code: 'FIXTURE', is_active: true, discount_type: 'fixed', discount_value: 100, minimum_amount: 0, max_redemptions: null }
  expect((await POST(request({ coupon: 'FIXTURE' }))).status).toBe(200)
  expect(inserted.software_purchases[0].amount_cents).toBe(1499)
  expect(inserted.checkout_carts[0].total).toBe('15.49')
 })
 it('keeps a services-only checkout working without creating a software purchase', async () => {
  expect((await POST(request({ includeLicense: false }))).status).toBe(200)
  expect(inserted.software_purchases).toBeUndefined()
  expect(inserted.checkout_carts[0].total).toBe('40.00')
  expect(mocks.create.mock.calls[0][0].metadata.purchase_id).toBeFalsy()
 })
 it.each(['missing', 'inactive', 'backend-unavailable'])('does not collect a mixed payment when the license is %s', async condition => {
  if (condition === 'missing') software = null
  if (condition === 'inactive') software!.active = false
  if (condition === 'backend-unavailable') mocks.ready.mockReturnValue(false)
  const response = await POST(request())
  expect(response.status).toBeGreaterThanOrEqual(400)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('requires the authenticated buyer even when a client supplies another user id', async () => {
  mocks.session.mockResolvedValue(null)
  expect((await POST(request({ userId: 'buyer' }))).status).toBe(401)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('retains Discord validation for service requests with a license', async () => {
  mocks.session.mockResolvedValue({ user: { id: 'buyer', email: 'buyer@example.invalid' } })
  expect((await POST(request())).status).toBe(400)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it.each([{ name: '' }, { description: 'short' }])('retains required service details: %j', async patch => {
  expect((await POST(request(patch))).status).toBe(400)
  expect(mocks.create).not.toHaveBeenCalled()
 })
 it('continues to reject subscriptions in the one-time service cart', async () => {
  services[0].billing_type = 'subscription'
  expect((await POST(request())).status).toBe(400)
  expect(mocks.create).not.toHaveBeenCalled()
 })
})