import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

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
      const { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('client_id')
        .eq('id', sessionId)
        .single()

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
      console.error('Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error)
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
    const { session_id, message, message_type } = body

    if (!session_id || !message) {
      return NextResponse.json({ error: 'Session ID and message are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const userRole = session.user.role

    // Verificar permisos
    if (userRole === 'client') {
      const { data: chatSession } = await supabase
        .from('chat_sessions')
        .select('client_id, status')
        .eq('id', session_id)
        .single()

      if (!chatSession || chatSession.client_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Si la sesión está cerrada, reabrirla
      if (chatSession.status === 'closed') {
        await supabase
          .from('chat_sessions')
          .update({ status: 'waiting' })
          .eq('id', session_id)

        await supabase.from('chat_audit_logs').insert({
          actor_id: session.user.id,
          action: 'CHAT_REOPENED',
          session_id
        })
      }
    }

    // Insertar mensaje
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        sender_id: session.user.id,
        sender_role: userRole,
        message,
        message_type: message_type || 'text'
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
