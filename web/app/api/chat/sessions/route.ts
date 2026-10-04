import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'
import { getDiscordService } from '@/lib/discord-integration'
import { z } from 'zod'

const createSessionSchema = z.object({
  subject: z.string().trim().min(2).max(120),
  service_type: z.string().trim().min(2).max(60).optional(),
  language: z.enum(['es', 'en']).optional(),
})

// GET /api/chat/sessions - Obtener sesiones del usuario actual
export async function GET() {
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
      return NextResponse.json({ error: 'Unauthorized - Please login first' }, { status: 401 })
    }

    const parsed = createSessionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Revisa los datos del soporte.' }, { status: 400 })
    }
    const { subject, service_type, language } = parsed.data

    const supabase = await createClient()

    // Verificar si el usuario existe en la tabla users
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role, full_name, email, discord_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userRecord) {
      console.error('User not found in users table:', userError)
      return NextResponse.json({ error: 'User not found in database' }, { status: 400 })
    }

    // Verificar si ya existe una sesión activa del cliente
    const { data: existingSession, error: existingError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('client_id', session.user.id)
      .in('status', ['waiting', 'active', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing session:', existingError)
    }

    if (existingSession) {
      return NextResponse.json({ session: existingSession, existing: true })
    }

    // Crear nueva sesión manualmente sin conversation_number trigger
    const conversationNumber = 'CHAT-' + Date.now().toString().slice(-6)

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
      return NextResponse.json({ error: 'No se pudo crear el soporte.' }, { status: 500 })
    }

    await getDiscordService().notifyNewTicket({
      session_id: newSession.id,
      ticket_id: newSession.conversation_number,
      customer_name: userRecord.full_name || userRecord.email || 'Cliente',
      category: service_type || 'general',
      subject: subject || 'Soporte web',
      description: 'El cliente abrió una conversación privada desde la web.',
      discord_user_id: userRecord.discord_id || undefined,
    })

    return NextResponse.json({ session: newSession, existing: false })
  } catch (error) {
    console.error('Error in POST /api/chat/sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
