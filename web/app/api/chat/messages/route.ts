import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// GET /api/chat/messages?session_id=xxx - Obtener mensajes de una sesión
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/chat/messages - Starting')
    const session = await getServerSession()
    if (!session) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', session.user.id, session.user.role)

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    console.log('Fetching messages for session:', sessionId)

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
        console.error('Error checking session ownership:', sessionError)
      }

      if (!chatSession || chatSession.client_id !== session.user.id) {
        console.error('Forbidden: User does not own this session')
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
      return NextResponse.json({ error: 'Failed to fetch messages', details: error.message }, { status: 500 })
    }

    console.log('Messages fetched successfully:', messages?.length || 0)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error)
    return NextResponse.json({ error: 'Internal server error', details: (error as Error).message }, { status: 500 })
  }
}

// POST /api/chat/messages - Enviar mensaje
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/chat/messages - Starting')
    const session = await getServerSession()
    if (!session) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', session.user.id, session.user.role)

    const body = await request.json()
    const { session_id, message, message_type } = body

    if (!session_id || !message) {
      return NextResponse.json({ error: 'Session ID and message are required' }, { status: 400 })
    }

    console.log('Message data:', { session_id, message_type, message_length: message.length })

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

      // Si la sesión está cerrada, reabrirla
      if (chatSession.status === 'closed') {
        console.log('Reopening closed session')
        await supabase
          .from('chat_sessions')
          .update({ status: 'waiting' })
          .eq('id', session_id)

        // Auditoría opcional
        try {
          await supabase.from('chat_audit_logs').insert({
            actor_id: session.user.id,
            action: 'CHAT_REOPENED',
            session_id
          })
        } catch (auditError) {
          console.error('Error creating audit log:', auditError)
        }
      }
    }

    // Insertar mensaje
    console.log('Inserting message...')
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        id: crypto.randomUUID(),
        session_id,
        sender_id: session.user.id,
        sender_role: userRole,
        message,
        message_type: message_type || 'text'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error sending message:', insertError)
      console.error('Error details:', JSON.stringify(insertError))
      return NextResponse.json({ 
        error: 'Failed to send message', 
        details: insertError.message,
        code: insertError.code 
      }, { status: 500 })
    }

    console.log('Message sent successfully:', newMessage.id)
    return NextResponse.json({ message: newMessage })
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error)
    console.error('Error stack:', (error as Error).stack)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 })
  }
}
