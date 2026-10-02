import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 60

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ alerts: [] }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('orders')
    .select('client_name, created_at, status, services(name)')
    .gte('created_at', since)
    .not('status', 'in', '(pending,cancelled)')
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    console.error('[recent-activity] No se pudieron cargar las alertas', error)
    return NextResponse.json({ alerts: [] }, { headers: { 'Cache-Control': 'public, s-maxage=60' } })
  }

  const alerts = (data || []).map((order, index) => {
    const service = Array.isArray(order.services) ? order.services[0] : order.services
    const name = String(order.client_name || 'Cliente').trim().split(/\s+/)[0] || 'Cliente'
    const minutes = Math.max(1, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000))
    return { id: `${order.created_at}-${index}`, name: name.slice(0, 24), service: service?.name || 'un servicio personalizado', minutes }
  })

  return NextResponse.json({ alerts }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
