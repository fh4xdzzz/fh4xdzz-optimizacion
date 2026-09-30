import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getDiscordService } from '@/lib/discord-integration'

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
    const userRole = session.user.role

    // Verificar permisos
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
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
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
    const { session_id, message, message_type, attachment_path, attachment_name } = body

    if (!session_id || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Session ID and message are required' }, { status: 400 })
    }

    if (message.trim().length > 5000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
    }

    const supabase = await createClient()
    const userRole = session.user.role

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
        .select('status, assigned_agent_id')
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
      sender_role: userRole,
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

    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceUrl && serviceKey) {
      const serviceSupabase = createServiceClient(serviceUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data: chat } = await serviceSupabase
        .from('chat_sessions')
        .select('conversation_number, client_id, users!chat_sessions_client_id_fkey(full_name, email, discord_id)')
        .eq('id', session_id)
        .maybeSingle()

      if (chat) {
        const client = Array.isArray(chat.users) ? chat.users[0] : chat.users
        const notificationMessage = message_type === 'attachment'
          ? `Archivo privado: ${attachment_name || 'adjunto'}`
          : message.trim().slice(0, 1500)
        await getDiscordService().notifyTicketMessage({
          ticket_id: chat.conversation_number,
          customer_name: client?.full_name || client?.email || 'Cliente',
          message: notificationMessage,
          sender: userRole === 'client' ? 'customer' : 'staff',
          discord_user_id: userRole === 'client' ? undefined : (client?.discord_id || undefined),
        })
      }
    }

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
