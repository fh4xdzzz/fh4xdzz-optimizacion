// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))
vi.mock('@/lib/stripe-server', () => ({ getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }) }))
import { encryptLicenseKey, generateLicenseKey } from '@/lib/dulcan-license-crypto'
import { fulfillSoftwareCheckout, revokeRefundedSoftware } from '@/lib/dulcan-license-service'
const purchase = { id: 'purchase', user_id: 'buyer', product_id: 'dulcan-optimizer', email: 'buyer@example.invalid', customer_name: '<Buyer>', stripe_session_id: 'cs_fixture', payment_intent_id: null, amount_cents: 1499, currency: 'usd', livemode: true, status: 'pending' }
let checkout: Record<string, unknown>
let rpc: ReturnType<typeof vi.fn>, update: ReturnType<typeof vi.fn>, fetcher: ReturnType<typeof vi.fn>, storedKey: string
function db() {
 return { from: (table: string) => table === 'software_purchases' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: purchase, error: null }) }) }) } : { update }, rpc } as unknown as SupabaseClient
}
beforeEach(() => {
 vi.clearAllMocks()
 process.env.DULCAN_LICENSE_MODE = 'live'
 process.env.DULCAN_LICENSE_ENCRYPTION_KEY = randomBytes(32).toString('base64')
 process.env.RESEND_API_KEY = 'fixture'
 process.env.NEXT_PUBLIC_SITE_URL = 'https://www.thedulcandesign.com'
 storedKey = generateLicenseKey()
 checkout = { id: 'cs_fixture', metadata: { checkout_flow: 'dulcan_license_v1', purchase_id: 'purchase', user_id: 'buyer' }, mode: 'payment', payment_status: 'paid', livemode: true, amount_total: 1499, currency: 'usd', payment_intent: { id: 'pi_fixture', status: 'succeeded', latest_charge: { refunded: false } } }
 mocks.retrieve.mockImplementation(async () => checkout)
 rpc = vi.fn(async (name: string) => ({ data: name === 'issue_dulcan_license' ? [{ id: 'license', status: 'active', key_ciphertext: encryptLicenseKey(storedKey), email_sent_at: null }] : null, error: null }))
 update = vi.fn(() => ({ eq: async () => ({ error: null }) }))
 fetcher = vi.fn(async () => new Response('{}', { status: 200 }))
 vi.stubGlobal('fetch', fetcher)
})
function fulfill() { return fulfillSoftwareCheckout(db(), { id: 'cs_fixture' } as Stripe.Checkout.Session, true) }
describe('paid software fulfillment', () => {
 it('re-reads Stripe and delivers the stored key to the authenticated purchase email', async () => {
  expect((await fulfill())?.payment_intent_id).toBe('pi_fixture')
  expect(mocks.retrieve).toHaveBeenCalledWith('cs_fixture', { expand: ['payment_intent.latest_charge'] })
  const email = JSON.parse(fetcher.mock.calls[0][1].body)
  expect(email.to).toEqual(['buyer@example.invalid'])
  expect(email.text).toContain(storedKey)
  expect(email.html).toContain('&lt;Buyer&gt;')
  expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe('dulcan-license-license')
  expect(update).toHaveBeenCalledOnce()
 })
 it.each([{ amount_total: 1 }, { currency: 'eur' }, { livemode: false }, { metadata: { checkout_flow: 'dulcan_license_v1', purchase_id: 'purchase', user_id: 'other' } }])('rejects payment mismatch %j', async (patch) => {
  Object.assign(checkout, patch)
  await expect(fulfill()).rejects.toThrow()
  expect(rpc).not.toHaveBeenCalled()
  expect(fetcher).not.toHaveBeenCalled()
 })
 it('does not issue for an unpaid checkout', async () => {
  checkout.payment_status = 'unpaid'
  expect(await fulfill()).toBeNull()
  expect(rpc).not.toHaveBeenCalled()
 })
 it('requires a succeeded expanded payment intent', async () => {
  checkout.payment_intent = { id: 'pi_fixture', status: 'processing' }
  await expect(fulfill()).rejects.toThrow()
  expect(rpc).not.toHaveBeenCalled()
 })
 it('persists refund revocation before trying an old completion', async () => {
  checkout.payment_intent = { id: 'pi_fixture', status: 'succeeded', latest_charge: { refunded: true } }
  rpc.mockImplementation(async () => ({ data: [], error: null }))
  expect(await fulfill()).toBeNull()
  expect(rpc.mock.calls.map(call => call[0])).toEqual(['revoke_dulcan_payment', 'issue_dulcan_license'])
  expect(fetcher).not.toHaveBeenCalled()
 })
 it('keeps failed email delivery retryable without marking delivered', async () => {
  fetcher.mockResolvedValue(new Response('{}', { status: 503 }))
  await expect(fulfill()).rejects.toThrow('correo')
  expect(update).not.toHaveBeenCalled()
 })
 it('does not send another email for an already delivered license', async () => {
  rpc.mockResolvedValue({ data: [{ status: 'active', email_sent_at: new Date().toISOString() }], error: null })
  await fulfill()
  expect(fetcher).not.toHaveBeenCalled()
 })
 it('only revokes full refunds and never initiates a financial refund', async () => {
  await revokeRefundedSoftware(db(), { refunded: false, amount: 1499, amount_refunded: 100, payment_intent: 'pi_fixture' } as Stripe.Charge)
  expect(rpc).not.toHaveBeenCalled()
  await revokeRefundedSoftware(db(), { refunded: true, amount: 1499, amount_refunded: 1499, payment_intent: 'pi_fixture' } as Stripe.Charge)
  expect(rpc).toHaveBeenCalledWith('revoke_dulcan_payment', { p_payment_intent: 'pi_fixture' })
 })
})
