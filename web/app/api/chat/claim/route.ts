import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'
import { getDiscordService } from '@/lib/discord-integration'

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

    // La función SQL serializa los reclamos del agente y bloquea la conversación.
    let { data: chatSession, error: claimError } = await supabase
      .rpc('claim_chat_session', { p_session_id: session_id })

    // Compatibilidad mientras la migración SQL todavía no se ha aplicado.
    const rpcMissing = claimError && (
      claimError.code === 'PGRST202' ||
      claimError.code === '42883' ||
      claimError.message?.includes('claim_chat_session')
    )

    if (rpcMissing) {
      const { data: activeChat, error: activeChatError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('assigned_agent_id', session.user.id)
        .neq('status', 'closed')
        .limit(1)
        .maybeSingle()

      if (activeChatError) {
        return NextResponse.json({ error: 'No se pudo verificar tu disponibilidad.' }, { status: 500 })
      }
      if (activeChat) {
        return NextResponse.json({ error: 'Ya tienes un chat activo. Ciérralo o transfiérelo antes de reclamar otro.' }, { status: 409 })
      }

      const fallbackResult = await supabase
        .from('chat_sessions')
        .update({
          assigned_agent_id: session.user.id,
          status: 'active',
          claimed_at: new Date().toISOString(),
        })
        .eq('id', session_id)
        .eq('status', 'waiting')
        .is('assigned_agent_id', null)
        .select()
        .maybeSingle()

      chatSession = fallbackResult.data
      claimError = fallbackResult.error
      if (!claimError && !chatSession) {
        return NextResponse.json({ error: 'Otro agente ya reclamó este chat.' }, { status: 409 })
      }
    }

    if (claimError) {
      const message = claimError.message || ''
      if (message.includes('AGENT_ALREADY_BUSY')) {
        return NextResponse.json({ error: 'Ya tienes un chat activo. Ciérralo o transfiérelo antes de reclamar otro.' }, { status: 409 })
      }
      if (message.includes('CHAT_ALREADY_CLAIMED')) {
        return NextResponse.json({ error: 'Otro agente ya reclamó este chat.' }, { status: 409 })
      }
      if (message.includes('CHAT_NOT_FOUND')) {
        return NextResponse.json({ error: 'Conversación no encontrada.' }, { status: 404 })
      }
      return NextResponse.json({ error: 'No se pudo reclamar el chat.' }, { status: 500 })
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

    const { data: clientData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', chatSession.client_id)
      .maybeSingle()

    // Aviso interno: sólo informa que el caso fue tomado; no replica mensajes.
    await getDiscordService().notifyTicketClaimed({
      session_id,
      ticket_id: chatSession.conversation_number,
      customer_name: clientData?.full_name || clientData?.email || 'Cliente',
      agent_name: adminName,
    })

    return NextResponse.json({ session: chatSession })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
