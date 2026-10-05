import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ alerts: [] }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  const { data, error } = await supabase
    .from('orders')
    .select('id, client_name, created_at, status, services(name)')
    .is('deleted_at', null)
    .gte('created_at', monthAgo.toISOString())
    .not('status', 'in', '(pending,cancelled)')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[recent-activity] No se pudieron cargar las alertas', error)
    return NextResponse.json({ alerts: [] }, { headers: { 'Cache-Control': 'public, s-maxage=60' } })
  }

  const alerts = (data || []).map((order, index) => {
    const service = Array.isArray(order.services) ? order.services[0] : order.services
    const name = String(order.client_name || 'Cliente').trim().split(/\s+/)[0] || 'Cliente'
    return { id: order.id || `${order.created_at}-${index}`, name: name.slice(0, 24), service: service?.name || 'un servicio personalizado', createdAt: order.created_at }
  })

  return NextResponse.json({ alerts }, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=15' } })
}
