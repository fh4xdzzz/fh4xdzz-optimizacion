import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createServiceClient, generateOptimizerCode, hashOptimizerCode, OPTIMIZER_ALLOWED_ORDER_STATUSES } from '@/lib/optimizer-server'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 })
  const { id } = await context.params

  let orderQuery = supabase.from('orders').select('id, status').eq('id', id).is('deleted_at', null)
  if (!['staff', 'admin', 'owner'].includes(session.user.role || 'client')) orderQuery = orderQuery.eq('user_id', session.user.id)
  const { data: order } = await orderQuery.maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
  if (!OPTIMIZER_ALLOWED_ORDER_STATUSES.includes(order.status)) return NextResponse.json({ error: 'Este pedido todavía no permite diagnósticos.' }, { status: 409 })

  const { data, error } = await supabase
    .from('optimizer_reports')
    .select('id, app_version, device_name, report, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar los diagnósticos.' }, { status: 500 })
  const { data: release } = await supabase.from('optimizer_releases').select('version, file_name, file_path, file_size, sha256, release_notes, created_at').eq('is_active', true).maybeSingle()
  let downloadUrl: string | null = null
  if (release) {
    const { data: signed } = await supabase.storage.from('optimizer-releases').createSignedUrl(release.file_path, 600, { download: release.file_name })
    downloadUrl = signed?.signedUrl || null
  }
  return NextResponse.json({ reports: data || [], release: release ? { version: release.version, fileName: release.file_name, fileSize: release.file_size, sha256: release.sha256, releaseNotes: release.release_notes, createdAt: release.created_at, downloadUrl } : null })
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 })
  const { id } = await context.params

  const { data: order } = await supabase.from('orders').select('id, status').eq('id', id).eq('user_id', session.user.id).is('deleted_at', null).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
  if (!OPTIMIZER_ALLOWED_ORDER_STATUSES.includes(order.status)) return NextResponse.json({ error: 'Disponible únicamente para pedidos pagados.' }, { status: 409 })

  await supabase.from('optimizer_access_codes').delete().eq('order_id', id).eq('user_id', session.user.id).is('used_at', null)
  const code = generateOptimizerCode()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const { error } = await supabase.from('optimizer_access_codes').insert({
    order_id: id,
    user_id: session.user.id,
    code_hash: hashOptimizerCode(code),
    expires_at: expiresAt,
  })
  if (error) return NextResponse.json({ error: 'No se pudo generar el código.' }, { status: 500 })
  return NextResponse.json({ code, expiresAt }, { status: 201 })
}
