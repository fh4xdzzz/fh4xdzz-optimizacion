import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// POST /api/chat/claim - Reclamar una conversación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Only staff can claim chats' }, { status: 403 })
    }

    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Reclamar la sesión de forma atómica
    const { data: chatSession, error: claimError } = await supabase
      .from('chat_sessions')
      .update({
        assigned_agent_id: session.user.id,
        status: 'active',
        claimed_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .is('assigned_agent_id', null) // Solo si no está asignada
      .select()
      .maybeSingle()

    if (claimError) {
      return NextResponse.json({ error: 'Failed to claim chat' }, { status: 500 })
    }

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat already claimed or not found' }, { status: 409 })
    }

    // Actualizar estado del agente
    await supabase
      .from('users')
      .update({
        online: true,
        last_assigned_at: new Date().toISOString()
      })
      .eq('id', session.user.id)

    // Registrar en auditoría
    await supabase.from('chat_audit_logs').insert({
      actor_id: session.user.id,
      action: 'CHAT_CLAIMED',
      session_id,
      metadata: { assigned_to: session.user.id }
    })

    // Obtener información del admin para el mensaje automático
    const { data: adminData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', session.user.id)
      .single()

    // Priorizar full_name, si no existe usar email, si no existe usar nombre genérico
    const adminName = adminData?.full_name || adminData?.email?.split('@')[0] || 'Un agente de soporte'

    // Enviar mensaje automático al cliente
    await supabase
      .from('chat_messages')
      .insert({
        id: crypto.randomUUID(),
        session_id,
        sender_id: session.user.id,
        sender_role: userRole,
        message: `¡Hola! 👋 Soy ${adminName}. He tomado tu caso y estoy aquí para ayudarte. ¿En qué puedo asistirte?`,
        message_type: 'text'
      })

    return NextResponse.json({ session: chatSession })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
