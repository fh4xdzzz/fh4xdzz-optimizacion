// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(url) } }))
vi.mock('@/lib/auth-hybrid', () => ({ isDemoMode: () => false, isSupabaseMode: () => true }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getClaims: async () => ({ data: null, error: null }) } }) }))
import LegacyKeys from '@/app/mis-licencias/page'
import LegacyOrders from '@/app/pedidos/page'
import { proxy } from '@/proxy'

describe('existing purchase and desktop links after moving into Dashboard', () => {
  it('keeps the Stripe session reference when redirecting an old keys link', async () => {
    await expect(LegacyKeys({ searchParams: Promise.resolve({ session_id: 'cs_fixture', source: ['email', 'desktop'] }) }))
      .rejects.toThrow('/dashboard/keys?session_id=cs_fixture&source=email&source=desktop')
  })
  it('keeps the selected order when redirecting an existing order link', async () => {
    await expect(LegacyOrders({ searchParams: Promise.resolve({ order: 'order-fixture' }) }))
      .rejects.toThrow('/dashboard/pedidos?order=order-fixture')
  })
  it('requires login and preserves the purchase reference for the return to Dashboard', async () => {
    const response = await proxy(new NextRequest('https://www.thedulcandesign.com/dashboard/keys?session_id=cs_fixture'))
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe('/auth/login')
    expect(location.searchParams.get('redirect')).toBe('/dashboard/keys?session_id=cs_fixture')
  })
})
