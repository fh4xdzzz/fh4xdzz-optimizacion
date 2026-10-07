import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const SUPPORT_ROLES = new Set(['staff', 'admin', 'owner'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_FILE_TYPES: Record<string, ReadonlySet<string>> = {
  '.jpg': new Set(['image/jpeg', 'image/jpg']),
  '.jpeg': new Set(['image/jpeg', 'image/jpg']),
  '.png': new Set(['image/png']),
  '.gif': new Set(['image/gif']),
  '.webp': new Set(['image/webp']),
  '.pdf': new Set(['application/pdf']),
  '.doc': new Set(['application/msword']),
  '.docx': new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
}

function getExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ''
}

function sanitizeFileName(fileName: string) {
  const extension = getExtension(fileName)
  const baseName = fileName.slice(0, Math.max(0, fileName.length - extension.length))
  const safeBaseName = baseName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo'

  return `${safeBaseName}${extension}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión para adjuntar archivos.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const sessionId = String(formData.get('session_id') || '').trim()

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })
    }
    if (!UUID_PATTERN.test(sessionId)) {
      return NextResponse.json({ error: 'La conversación indicada no es válida.' }, { status: 400 })
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo debe pesar entre 1 byte y 4 MB.' }, { status: 413 })
    }

    const extension = getExtension(file.name)
    const mimeType = file.type.toLowerCase()
    if (!ALLOWED_FILE_TYPES[extension]?.has(mimeType)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa JPG, PNG, GIF, WEBP, PDF, DOC o DOCX.' },
        { status: 415 }
      )
    }

    const supabase = await createClient()
    const { data: chatSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, client_id, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError) {
      console.error('[chat-attachments] No se pudo comprobar la conversación', sessionError)
      return NextResponse.json({ error: 'No se pudo comprobar la conversación.' }, { status: 500 })
    }
    if (!chatSession) {
      return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 })
    }
    if (chatSession.status === 'closed') {
      return NextResponse.json({ error: 'No puedes adjuntar archivos a una conversación cerrada.' }, { status: 409 })
    }

    const role = session.user.role || 'client'
    const ownsSession = chatSession.client_id === session.user.id
    if (!ownsSession && !SUPPORT_ROLES.has(role)) {
      return NextResponse.json({ error: 'No tienes acceso a esta conversación.' }, { status: 403 })
    }

    const safeFileName = sanitizeFileName(file.name)
    const path = `${session.user.id}/${sessionId}/${randomUUID()}-${safeFileName}`
    const bytes = await file.arrayBuffer()
    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      console.error('[chat-attachments] Error al guardar el archivo', error)
      return NextResponse.json({ error: 'No se pudo guardar el archivo.' }, { status: 500 })
    }

    return NextResponse.json({
      path: data.path,
      file_name: file.name,
      content_type: mimeType,
      file_size: file.size,
    })
  } catch (error) {
    console.error('[chat-attachments] Error inesperado al subir', error)
    return NextResponse.json({ error: 'No se pudo procesar el archivo.' }, { status: 500 })
  }
}
