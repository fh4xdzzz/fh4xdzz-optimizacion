import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

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

    // Verificar que el agente de destino existe y es staff
    const { data: targetAgent } = await supabase
      .from('users')
      .select('id, role, is_support_agent')
      .eq('id', target_agent_id)
      .single()

    if (!targetAgent || !targetAgent.is_support_agent) {
      return NextResponse.json({ error: 'Target agent not found or not a support agent' }, { status: 404 })
    }

    // Transferir la sesión
    const { data: chatSession, error: transferError } = await supabase
      .from('chat_sessions')
      .update({
        assigned_agent_id: target_agent_id,
        status: 'waiting', // Cambiar a waiting para que el nuevo agente pueda reclamarla
        claimed_at: null
      })
      .eq('id', session_id)
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
        from_agent: session.user.id,
        to_agent: target_agent_id
      }
    })

    return NextResponse.json({ session: chatSession })
  } catch (error) {
    console.error('Error in POST /api/chat/transfer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
