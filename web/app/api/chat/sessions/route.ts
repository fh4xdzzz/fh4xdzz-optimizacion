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
    const session = await getServerSession()
    if (!session) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User session:', session.user.id, session.user.role)

    const body = await request.json()
    const { subject, service_type, language } = body

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    const supabase = await createClient()

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

    // Crear nueva sesión sin trigger primero
    const { data: newSession, error: insertError } = await supabase
      .from('chat_sessions')
      .insert({
        client_id: session.user.id,
        conversation_number: null, // Dejar que el trigger lo asigne
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
      return NextResponse.json({ error: 'Failed to create session', details: insertError.message }, { status: 500 })
    }

    console.log('Created new session:', newSession.id)

    // Registrar en auditoría (sin requerir éxito)
    try {
      await supabase.from('chat_audit_logs').insert({
        actor_id: session.user.id,
        action: 'CHAT_CREATED',
        session_id: newSession.id,
        metadata: { subject, service_type, language }
      })
    } catch (auditError) {
      console.error('Error creating audit log:', auditError)
      // No fallar la petición si falla la auditoría
    }

    return NextResponse.json({ session: newSession, existing: false })
  } catch (error) {
    console.error('Error in POST /api/chat/sessions:', error)
    return NextResponse.json({ error: 'Internal server error', details: (error as Error).message }, { status: 500 })
  }
}
