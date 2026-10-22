// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ session: vi.fn(), from: vi.fn(), decrypt: vi.fn(), filters: [] as string[][] }))
vi.mock('@/lib/auth-server', () => ({ getServerSession: mock.session }))
vi.mock('@/lib/dulcan-license-service', () => ({ licenseAdmin: () => ({ from: mock.from }), displaySoftwareKey: mock.decrypt }))
import { GET } from '@/app/api/dulcan/licenses/route'
beforeEach(() => {
 vi.clearAllMocks(); mock.filters = []
 mock.session.mockResolvedValue({ user: { id: 'authenticated-owner' } })
 mock.decrypt.mockReturnValue('DULCAN-FIXTURE')
 mock.from.mockImplementation((table: string) => {
  const chain = { select: () => chain, eq: (column: string, value: string) => { mock.filters.push([table, column, value]); return chain }, order: async () => ({ data: [{ id: 'license', key_ciphertext: 'encrypted', device_hash: 'private-device-hash', status: 'active', created_at: 'date', purchase_id: 'purchase' }], error: null }), maybeSingle: async () => ({ data: { id: 'purchase', status: 'pending' }, error: null }) }
  return chain
 })
})
describe('private license retrieval', () => {
 it('requires authentication before accessing storage', async () => {
  mock.session.mockResolvedValue(null)
  expect((await GET(new NextRequest('https://example.invalid/api/dulcan/licenses'))).status).toBe(401)
  expect(mock.from).not.toHaveBeenCalled()
 })
 it('scopes both licenses and checkout lookup to the authenticated owner', async () => {
  const response = await GET(new NextRequest('https://example.invalid/api/dulcan/licenses?session_id=cs_another_session&user_id=attacker'))
  expect(response.status).toBe(200)
  expect(mock.filters).toContainEqual(['software_licenses', 'user_id', 'authenticated-owner'])
  expect(mock.filters).toContainEqual(['software_purchases', 'user_id', 'authenticated-owner'])
  expect(response.headers.get('cache-control')).toContain('no-store')
  const payload = await response.json()
  expect(payload.licenses[0].key).toBe('DULCAN-FIXTURE')
  expect(payload.licenses[0].activated).toBe(true)
  expect(JSON.stringify(payload)).not.toContain('private-device-hash')
  expect(JSON.stringify(payload)).not.toContain('encrypted')
 })
 it('fails closed if the license query fails', async () => {
  mock.from.mockReturnValue({ select: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'internal details' } }) }) }) })
  const response = await GET(new NextRequest('https://example.invalid/api/dulcan/licenses'))
  expect(response.status).toBe(503)
  expect(JSON.stringify(await response.json())).not.toContain('internal details')
 })
})
