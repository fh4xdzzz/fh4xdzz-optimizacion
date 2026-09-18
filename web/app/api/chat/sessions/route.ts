import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// GET /api/chat/sessions - Obtener sesiones del usuario actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const userRole = session.user.role

    let query = supabase.from('chat_sessions').select('*')

    if (userRole === 'client') {
      // Clientes solo ven sus propias sesiones
      query = query.eq('client_id', session.user.id)
    } else if (userRole === 'staff') {
      // Staff ve todas las sesiones
      query = query.order('last_message_at', { ascending: false })
    } else if (userRole === 'admin' || userRole === 'owner') {
      // Admin/Owner ve todas las sesiones
      query = query.order('last_message_at', { ascending: false })
    }

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching chat sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error in GET /api/chat/sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/sessions - Crear nueva sesión de chat
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/chat/sessions - Starting')

    const session = await getServerSession()
    if (!session) {
      console.error('No session found - User not authenticated')
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 })
    }

    console.log('User authenticated:', session.user.id, session.user.role, session.user.email)

    const body = await request.json()
    const { subject, service_type, language } = body

    console.log('Request body:', { subject, service_type, language })

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar si el usuario existe en la tabla users
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', session.user.id)
      .single()

    if (userError || !userRecord) {
      console.error('User not found in users table:', userError)
      return NextResponse.json({ error: 'User not found in database' }, { status: 400 })
    }

    console.log('User record found:', userRecord.id, userRecord.role)

    // Verificar si ya existe una sesión activa del cliente
    const { data: existingSession, error: existingError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('client_id', session.user.id)
      .in('status', ['waiting', 'active', 'pending'])
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing session:', existingError)
    }

    if (existingSession) {
      console.log('Found existing session:', existingSession.id)
      return NextResponse.json({ session: existingSession, existing: true })
    }

    // Crear nueva sesión manualmente sin conversation_number trigger
    const conversationNumber = 'CHAT-' + Date.now().toString().slice(-6)

    console.log('Creating session with number:', conversationNumber)

    const { data: newSession, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        id: crypto.randomUUID(),
        conversation_number: conversationNumber,
        client_id: session.user.id,
        subject: subject || 'Soporte',
        service_type: service_type || 'general',
        language: language || 'es',
        status: 'waiting',
        priority: 'normal'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating chat session:', insertError)
      console.error('Error details:', JSON.stringify(insertError))
      return NextResponse.json({ 
        error: 'Failed to create session', 
        details: insertError.message,
        code: insertError.code 
      }, { status: 500 })
    }

    console.log('Created new session successfully:', newSession.id, newSession.conversation_number)

    return NextResponse.json({ session: newSession, existing: false })
  } catch (error) {
    console.error('Error in POST /api/chat/sessions:', error)
    console.error('Error stack:', (error as Error).stack)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 })
  }
}
