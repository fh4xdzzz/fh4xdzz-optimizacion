import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'
import { getDiscordService } from '@/lib/discord-integration'

// POST /api/chat/transfer - Transferir conversación a otro agente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Only staff can transfer chats' }, { status: 403 })
    }

    const body = await request.json()
    const { session_id, target_agent_id } = body

    if (!session_id || !target_agent_id) {
      return NextResponse.json({ error: 'Session ID and target agent ID are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: currentChat } = await supabase
      .from('chat_sessions')
      .select('id, conversation_number, status, assigned_agent_id, client_id')
      .eq('id', session_id)
      .maybeSingle()

    if (!currentChat) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (currentChat.status === 'closed' || currentChat.assigned_agent_id !== session.user.id) {
      return NextResponse.json({ error: 'Solo puedes transferir el chat activo que reclamaste.' }, { status: 403 })
    }

    if (target_agent_id === session.user.id) {
      return NextResponse.json({ error: 'El chat ya está asignado a este agente.' }, { status: 409 })
    }

    // Los roles de soporte son suficientes; la marca is_support_agent puede
    // no existir todavía en cuentas creadas antes del sistema de chat.
    const { data: targetAgent, error: targetAgentError } = await supabase
      .from('users')
      .select('id, role, full_name, email, discord_id')
      .eq('id', target_agent_id)
      .maybeSingle()

    if (targetAgentError) {
      return NextResponse.json({ error: 'No se pudo verificar el agente de destino.' }, { status: 500 })
    }

    if (!targetAgent || !['staff', 'admin', 'owner'].includes(targetAgent.role)) {
      return NextResponse.json({ error: 'El usuario seleccionado no es un agente autorizado.' }, { status: 404 })
    }

    const { data: targetActiveChat } = await supabase
      .from('chat_sessions')
      .select('id, conversation_number')
      .eq('assigned_agent_id', target_agent_id)
      .neq('status', 'closed')
      .limit(1)
      .maybeSingle()

    if (targetActiveChat) {
      return NextResponse.json({
        error: `El agente de destino está ocupado con ${targetActiveChat.conversation_number}. Debe cerrar o transferir ese chat primero.`,
      }, { status: 409 })
    }

    // Transferir la sesión
    const { data: chatSession, error: transferError } = await supabase
      .from('chat_sessions')
      .update({
        assigned_agent_id: target_agent_id,
        status: 'active',
        claimed_at: new Date().toISOString()
      })
      .eq('id', session_id)
      .eq('assigned_agent_id', session.user.id)
      .neq('status', 'closed')
      .select()
      .single()

    if (transferError) {
      console.error('Error transferring chat:', transferError)
      return NextResponse.json({ error: 'Failed to transfer chat' }, { status: 500 })
    }

    // Registrar en auditoría
    await supabase.from('chat_audit_logs').insert({
      actor_id: session.user.id,
      action: 'CHAT_TRANSFERRED',
      session_id,
      metadata: {
        from_agent: currentChat.assigned_agent_id,
        to_agent: target_agent_id
      }
    })

    const targetName = targetAgent.full_name || targetAgent.email?.split('@')[0] || 'otro agente'
    await supabase.from('chat_messages').insert({
      id: crypto.randomUUID(),
      session_id,
      sender_id: session.user.id,
      sender_role: userRole,
      message: `Tu conversación fue transferida a ${targetName}. Continuaremos atendiéndote aquí.`,
      message_type: 'text'
    })

    if (targetAgent.discord_id) {
      const [{ data: customer }, { data: sourceAgent }] = await Promise.all([
        supabase.from('users').select('full_name, email').eq('id', currentChat.client_id).maybeSingle(),
        supabase.from('users').select('full_name, email').eq('id', session.user.id).maybeSingle(),
      ])

      await getDiscordService().notifyTicketTransferred({
        ticket_id: currentChat.conversation_number,
        customer_name: customer?.full_name || customer?.email || 'Cliente',
        from_agent_name: sourceAgent?.full_name || sourceAgent?.email || 'Otro agente',
        target_agent_name: targetName,
        target_discord_user_id: targetAgent.discord_id,
      })
    }

    return NextResponse.json({ session: chatSession })
  } catch (error) {
    console.error('Error in POST /api/chat/transfer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
