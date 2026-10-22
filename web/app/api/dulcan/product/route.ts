import { NextResponse } from 'next/server'
import { DULCAN_PRODUCT, licenseConfigurationReady } from '@/lib/dulcan-license-crypto'
import { licenseAdmin } from '@/lib/dulcan-license-service'
export const runtime = 'nodejs'
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  const unavailable = () => NextResponse.json({ name: 'Dulcan Optimizer', amountCents: 1499, currency: 'usd', available: false }, { headers })
  if (!licenseConfigurationReady()) return unavailable()
  try {
    const { data, error } = await licenseAdmin().from('software_products').select('id,name,amount_cents,currency,active').eq('id', DULCAN_PRODUCT).maybeSingle()
    if (error || !data) return unavailable()
    return NextResponse.json({ name: data.name, amountCents: data.amount_cents, currency: data.currency, available: data.active }, { headers })
  } catch { return unavailable() }
}
