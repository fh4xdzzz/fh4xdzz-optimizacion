import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/auth-server'

const ALLOWED_ROLES = new Set(['staff', 'admin', 'owner'])

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!session.user.role || !ALLOWED_ROLES.has(session.user.role)) {
    return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
  }

  const path = request.nextUrl.searchParams.get('path')?.trim()
  if (!path || path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: message } = await supabase
    .from('chat_messages')
    .select('id')
    .eq('attachment_path', path)
    .maybeSingle()

  if (!message) return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 300)

  if (error || !data?.signedUrl) {
    console.error('[chat-attachments] No se pudo firmar el archivo', error)
    return NextResponse.json({ error: 'No se pudo abrir el archivo' }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
