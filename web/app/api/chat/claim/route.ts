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
      .single()

    if (claimError) {
      console.error('Error claiming chat:', claimError)
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

    return NextResponse.json({ session: chatSession })
  } catch (error) {
    console.error('Error in POST /api/chat/claim:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
