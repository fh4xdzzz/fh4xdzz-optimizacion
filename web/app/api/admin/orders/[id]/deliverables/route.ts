import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/admin-api'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024

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
  const body = await request.json().catch(() => null) as {
    action?: 'prepare' | 'complete'
    fileName?: string
    fileSize?: number
    contentType?: string
    note?: string
    path?: string
  } | null
  if (!body) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })

  const fileName = String(body.fileName || '').trim().slice(0, 255)
  const fileSize = Number(body.fileSize || 0)
  const contentType = String(body.contentType || 'application/octet-stream').slice(0, 200)
  const note = String(body.note || '').trim().slice(0, 500)
  if (!fileName) return NextResponse.json({ error: 'Selecciona un archivo.' }, { status: 400 })
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'El archivo debe pesar 2 GB o menos.' }, { status: 400 })
  }

  const { data: order } = await auth.supabase
    .from('orders')
    .select('id, user_id')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

  if (body.action === 'prepare') {
    const cleanName = safeFileName(fileName) || 'entrega'
    const path = `${order.user_id}/${order.id}/${crypto.randomUUID()}-${cleanName}`
    const { data, error } = await auth.supabase.storage
      .from('order-deliverables')
      .createSignedUploadUrl(path, { upsert: false })
    if (error || !data?.token) {
      console.error('[order-deliverables] No se pudo preparar la carga', error)
      return NextResponse.json({ error: 'No se pudo preparar la subida privada.' }, { status: 500 })
    }
    return NextResponse.json({ path, token: data.token })
  }

  if (body.action !== 'complete' || !body.path) {
    return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 })
  }

  const expectedPrefix = `${order.user_id}/${order.id}/`
  if (!body.path.startsWith(expectedPrefix) || body.path.includes('..')) {
    return NextResponse.json({ error: 'Ruta de entrega inválida.' }, { status: 400 })
  }

  const slash = body.path.lastIndexOf('/')
  const directory = body.path.slice(0, slash)
  const objectName = body.path.slice(slash + 1)
  const { data: objects, error: listError } = await auth.supabase.storage
    .from('order-deliverables')
    .list(directory, { limit: 10, search: objectName })
  const uploadedObject = objects?.find(item => item.name === objectName)
  const storedSize = Number(uploadedObject?.metadata?.size || 0)
  if (listError || !uploadedObject || storedSize !== fileSize) {
    return NextResponse.json({ error: 'La carga no se completó correctamente. Reinténtala.' }, { status: 409 })
  }

  const { data: deliverable, error: insertError } = await auth.supabase
    .from('order_deliverables')
    .insert({
      order_id: order.id,
      file_name: fileName,
      file_path: body.path,
      content_type: contentType,
      file_size: storedSize,
      note: note || null,
      uploaded_by: auth.session.user.id,
    })
    .select('id, file_name, content_type, file_size, note, created_at')
    .single()
  if (insertError || !deliverable) {
    await auth.supabase.storage.from('order-deliverables').remove([body.path])
    return NextResponse.json({ error: 'No se pudo registrar la entrega.' }, { status: 500 })
  }

  await auth.supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'note_added',
    description: `Archivo entregado: ${fileName.slice(0, 180)}`,
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
