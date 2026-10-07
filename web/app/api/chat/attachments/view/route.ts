import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/auth-server'

const SUPPORT_ROLES = new Set(['staff', 'admin', 'owner'])

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Debes iniciar sesión para abrir este archivo.' }, { status: 401 })
  }

  const path = request.nextUrl.searchParams.get('path')?.trim()
  if (!path || path.length > 500 || path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'Archivo inválido.' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 })
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: messages, error: messageError } = await supabase
    .from('chat_messages')
    .select('id, session_id, sender_id, attachment_name')
    .eq('attachment_path', path)
    .limit(20)

  if (messageError) {
    console.error('[chat-attachments] No se pudo comprobar el archivo', messageError)
    return NextResponse.json({ error: 'No se pudo comprobar el archivo.' }, { status: 500 })
  }
  const uploaderId = path.split('/')[0]
  const usesScopedPath = path.split('/').length >= 4
  const message = usesScopedPath
    ? messages?.find(item => item.sender_id === uploaderId)
    : messages?.length === 1 ? messages[0] : null

  // Las rutas nuevas incluyen el usuario que realmente subió el archivo. Así,
  // un mensaje manipulado no puede "adoptar" la ruta privada de otro usuario.
  if (!message) {
    return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 })
  }

  const { data: chatSession, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('client_id')
    .eq('id', message.session_id)
    .maybeSingle()

  if (sessionError) {
    console.error('[chat-attachments] No se pudo comprobar el propietario', sessionError)
    return NextResponse.json({ error: 'No se pudo comprobar el acceso.' }, { status: 500 })
  }

  const role = session.user.role || 'client'
  const ownsSession = chatSession?.client_id === session.user.id
  if (!ownsSession && !SUPPORT_ROLES.has(role)) {
    return NextResponse.json({ error: 'No tienes acceso a este archivo.' }, { status: 403 })
  }

  const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
  const options = shouldDownload && message.attachment_name
    ? { download: message.attachment_name.replace(/[\r\n"]/g, '').slice(0, 150) }
    : undefined
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 300, options)

  if (error || !data?.signedUrl) {
    console.error('[chat-attachments] No se pudo firmar el archivo', error)
    return NextResponse.json({ error: 'No se pudo abrir el archivo.' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
