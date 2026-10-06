import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// GET /api/chat/messages?session_id=xxx - Obtener mensajes de una sesión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const userRole = session.user.role || 'client'

    // Verificar permisos. El cliente solo puede leer su conversación y los
    // mensajes internos quedan reservados a los roles de soporte.
    if (userRole === 'client') {
      const { data: chatSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('client_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionError) {
        return NextResponse.json({ error: 'Unable to verify the conversation' }, { status: 500 })
      }

      if (!chatSession || chatSession.client_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (!['staff', 'admin', 'owner'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const messageClient = serviceUrl && serviceKey
      ? createServiceClient(serviceUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : supabase

    const { data: messages, error } = await messageClient
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const senderIds = [...new Set((messages || []).map(item => item.sender_id).filter(Boolean))]
    const { data: senders } = senderIds.length
      ? await messageClient.from('users').select('id, full_name, email, avatar_url, discord_avatar, role, online').in('id', senderIds)
      : { data: [] }
    const senderMap = new Map((senders || []).map(sender => [sender.id, sender]))
    const enrichedMessages = (messages || []).map(message => ({
      ...message,
      sender: message.sender_role === 'assistant'
        ? { id: null, full_name: 'Dulcan AI', email: null, avatar_url: null, discord_avatar: null, role: 'assistant', online: true }
        : senderMap.get(message.sender_id) || null,
    }))

    return NextResponse.json({ messages: enrichedMessages })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/chat/messages - Marcar como vistos los mensajes enviados por el cliente
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (!['staff', 'admin', 'owner'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const sessionId = body.session_id
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: chatSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id, status, assigned_agent_id')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError) {
      return NextResponse.json({ error: 'Unable to verify the conversation' }, { status: 500 })
    }
    if (!chatSession) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (chatSession.status === 'closed' || chatSession.assigned_agent_id !== session.user.id) {
      return NextResponse.json({ error: 'Solo el agente que atiende este soporte puede marcar mensajes como vistos.' }, { status: 403 })
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const messageClient = serviceUrl && serviceKey
      ? createServiceClient(serviceUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : supabase

    const readAt = new Date().toISOString()
    const { data: updatedMessages, error: updateError } = await messageClient
      .from('chat_messages')
      .update({ read_at: readAt })
      .eq('session_id', sessionId)
      .eq('sender_role', 'client')
      .is('read_at', null)
      .select('id')

    if (updateError) {
      return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
    }

    return NextResponse.json({ marked_read: updatedMessages?.length || 0, read_at: readAt })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/messages - Enviar mensaje
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, message, message_type, attachment_path, attachment_name, as_client } = body

    if (!session_id || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Session ID and message are required' }, { status: 400 })
    }

    if (message.trim().length > 5000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
    }

    const supabase = await createClient()
    const userRole = session.user.role || 'client'
    const effectiveSenderRole = userRole
    const writeClient = supabase

    if (['staff', 'admin', 'owner'].includes(userRole) && as_client === true) {
      return NextResponse.json({ error: 'Las cuentas del equipo no pueden enviar mensajes como clientes.' }, { status: 403 })
    }

    // Verificar permisos
    if (userRole === 'client') {
      const { data: chatSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('client_id, status')
        .eq('id', session_id)
        .maybeSingle()

      if (sessionError) {
        console.error('Error checking session ownership:', sessionError)
        return NextResponse.json({ error: 'Session not found', details: sessionError.message }, { status: 404 })
      }

      if (!chatSession || chatSession.client_id !== session.user.id) {
        console.error('Forbidden: User does not own this session')
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      console.log('Session ownership verified:', chatSession.client_id)

      // Si la sesión está cerrada, bloquear el envío de mensajes
      if (chatSession.status === 'closed') {
        console.log('Attempt to send message to closed session - blocked')
        return NextResponse.json({ 
          error: 'Cannot send message to closed session',
          message: 'Este chat ha sido cerrado. Por favor, inicia un nuevo chat.'
        }, { status: 403 })
      }
    } else if (userRole === 'admin' || userRole === 'staff' || userRole === 'owner') {
      // Admin/staff también deben verificar que el chat no esté cerrado
      const { data: chatSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('status, assigned_agent_id, client_id')
        .eq('id', session_id)
        .maybeSingle()

      if (sessionError) {
        console.error('Error checking session status:', sessionError)
        return NextResponse.json({ error: 'Session not found', details: sessionError.message }, { status: 404 })
      }

      if (!chatSession) {
        console.error('Session not found')
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      // Un agente solo puede responder la conversación que reclamó.
      if (chatSession.status === 'closed') {
        console.log('Attempt to send message to closed session by admin - blocked')
        return NextResponse.json({ 
          error: 'Cannot send message to closed session',
          message: 'Este chat ha sido cerrado y está en el historial. No se pueden enviar mensajes.'
        }, { status: 403 })
      }

      if (chatSession.assigned_agent_id !== session.user.id) {
        return NextResponse.json({
          error: 'Debes reclamar esta conversación antes de responder.'
        }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insertar mensaje - estructura correcta con session_id y sender_id
    const insertData: Record<string, string> = {
      id: crypto.randomUUID(),
      session_id,
      sender_id: session.user.id,
      sender_role: effectiveSenderRole,
      message: message.trim(),
      message_type: message_type || 'text'
    }

    // Agregar campos de attachment si existen
    if (attachment_path) {
      insertData.attachment_path = attachment_path
    }
    if (attachment_name) {
      insertData.attachment_name = attachment_name
    }

    const { data: newMessage, error: insertError } = await writeClient
      .from('chat_messages')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // El formulario finaliza el trabajo del bot. Guardamos su contenido como
    // detalle del soporte, sin generar más preguntas automáticas.
    if (effectiveSenderRole === 'client' && message.trim().startsWith('Descripción del problema:')) {
      const summary = message.trim().replace(/^Descripción del problema:\s*/i, '').slice(0, 1200)
      const farewell = 'Gracias, ya recibimos tu solicitud. Un agente te responderá en breve. Normalmente respondemos en menos de 5 minutos.'
      const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceUrl && serviceKey) {
        const serviceSupabase = createServiceClient(serviceUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        await serviceSupabase.from('chat_sessions').update({
          ai_handoff_ready: true,
          ai_summary: summary,
          ai_intake: { problem: summary },
        }).eq('id', session_id).eq('client_id', session.user.id)

        const { data: existingFarewell } = await serviceSupabase
          .from('chat_messages')
          .select('id')
          .eq('session_id', session_id)
          .eq('sender_role', 'assistant')
          .eq('message', farewell)
          .limit(1)
          .maybeSingle()

        if (!existingFarewell) {
          await serviceSupabase.from('chat_messages').insert({
            id: crypto.randomUUID(),
            session_id,
            sender_id: null,
            sender_role: 'assistant',
            message: farewell,
            message_type: 'text',
          })
        }
      }
    }

    return NextResponse.json({ message: newMessage })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
