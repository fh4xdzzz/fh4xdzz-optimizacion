import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/admin-api'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/json',
  'video/mp4',
])

function safeFileName(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-120)
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await context.params
  const { data, error } = await auth.supabase
    .from('order_deliverables')
    .select('id, file_name, content_type, file_size, note, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las entregas.' }, { status: 500 })
  return NextResponse.json({ deliverables: data || [] })
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await context.params
  const form = await request.formData()
  const file = form.get('file')
  const note = String(form.get('note') || '').trim().slice(0, 500)
  if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona un archivo.' }, { status: 400 })
  if (!file.size || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'El archivo debe pesar 4 MB o menos.' }, { status: 400 })
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'Este tipo de archivo no está permitido.' }, { status: 400 })

  const { data: order } = await auth.supabase
    .from('orders')
    .select('id, user_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

  const cleanName = safeFileName(file.name) || 'entrega'
  const path = `${order.user_id}/${order.id}/${crypto.randomUUID()}-${cleanName}`
  const { error: uploadError } = await auth.supabase.storage
    .from('order-deliverables')
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[order-deliverables] Error de almacenamiento', uploadError)
    return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 })
  }

  const { data: deliverable, error: insertError } = await auth.supabase
    .from('order_deliverables')
    .insert({
      order_id: order.id,
      file_name: file.name.slice(0, 255),
      file_path: path,
      content_type: file.type,
      file_size: file.size,
      note: note || null,
      uploaded_by: auth.session.user.id,
    })
    .select('id, file_name, content_type, file_size, note, created_at')
    .single()
  if (insertError || !deliverable) {
    await auth.supabase.storage.from('order-deliverables').remove([path])
    return NextResponse.json({ error: 'No se pudo registrar la entrega.' }, { status: 500 })
  }

  await auth.supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'note_added',
    description: `Archivo entregado: ${file.name.slice(0, 180)}`,
    created_by: auth.session.user.id,
  })

  return NextResponse.json({ deliverable }, { status: 201 })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await context.params
  const body = await request.json().catch(() => ({})) as { fileId?: string }
  if (!body.fileId) return NextResponse.json({ error: 'Archivo inválido.' }, { status: 400 })

  const { data: deliverable } = await auth.supabase
    .from('order_deliverables')
    .select('id, file_path')
    .eq('id', body.fileId)
    .eq('order_id', id)
    .maybeSingle()
  if (!deliverable) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 })

  const { error: storageError } = await auth.supabase.storage.from('order-deliverables').remove([deliverable.file_path])
  if (storageError) return NextResponse.json({ error: 'No se pudo eliminar el archivo.' }, { status: 500 })
  const { error } = await auth.supabase.from('order_deliverables').delete().eq('id', deliverable.id)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar el registro.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
