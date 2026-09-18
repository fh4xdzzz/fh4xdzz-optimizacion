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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, service_type, language } = body

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar si ya existe una sesión activa del cliente
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('client_id', session.user.id)
      .in('status', ['waiting', 'active', 'pending'])
      .single()

    if (existingSession) {
      return NextResponse.json({ session: existingSession, existing: true })
    }

    // Crear nueva sesión
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({
        client_id: session.user.id,
        subject: subject || 'Soporte',
        service_type: service_type || 'general',
        language: language || 'es',
        status: 'waiting',
        priority: 'normal'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chat session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Registrar en auditoría
    await supabase.from('chat_audit_logs').insert({
      actor_id: session.user.id,
      action: 'CHAT_CREATED',
      session_id: newSession.id,
      metadata: { subject, service_type, language }
    })

    return NextResponse.json({ session: newSession, existing: false })
  } catch (error) {
    console.error('Error in POST /api/chat/sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
