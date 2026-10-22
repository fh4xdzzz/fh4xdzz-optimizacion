// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(url) } }))
import LegacyKeys from '@/app/mis-licencias/page'
import LegacyOrders from '@/app/pedidos/page'

describe('existing purchase and desktop links after moving into Dashboard', () => {
  it('keeps the Stripe session reference when redirecting an old keys link', async () => {
    await expect(LegacyKeys({ searchParams: Promise.resolve({ session_id: 'cs_fixture', source: ['email', 'desktop'] }) }))
      .rejects.toThrow('/dashboard/keys?session_id=cs_fixture&source=email&source=desktop')
  })
  it('keeps the selected order when redirecting an existing order link', async () => {
    await expect(LegacyOrders({ searchParams: Promise.resolve({ order: 'order-fixture' }) }))
      .rejects.toThrow('/dashboard/pedidos?order=order-fixture')
  })
})
