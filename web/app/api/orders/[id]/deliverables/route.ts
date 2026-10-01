import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/auth-server'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 })
  const supabase = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { id } = await context.params

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

  const { data, error } = await supabase
    .from('order_deliverables')
    .select('id, file_name, file_path, content_type, file_size, note, created_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las entregas.' }, { status: 500 })

  const deliverables = await Promise.all((data || []).map(async item => {
    const { data: signed } = await supabase.storage.from('order-deliverables').createSignedUrl(item.file_path, 600, {
      download: item.file_name,
    })
    return {
      id: item.id,
      fileName: item.file_name,
      contentType: item.content_type,
      fileSize: item.file_size,
      note: item.note,
      createdAt: item.created_at,
      downloadUrl: signed?.signedUrl || null,
    }
  }))

  return NextResponse.json({ deliverables })
}
