import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// POST /api/chat/close - Cerrar conversación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Only staff can close chats' }, { status: 403 })
    }

    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Cerrar la sesión
    const { data: chatSession, error: closeError } = await supabase
      .from('chat_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: session.user.id
      })
      .eq('id', session_id)
      .select()
      .single()

    if (closeError) {
      console.error('Error closing chat:', closeError)
      return NextResponse.json({ error: 'Failed to close chat' }, { status: 500 })
    }

    // Registrar en auditoría
    await supabase.from('chat_audit_logs').insert({
      actor_id: session.user.id,
      action: 'CHAT_CLOSED',
      session_id,
      metadata: { closed_by: session.user.id }
    })

    return NextResponse.json({ session: chatSession })
  } catch (error) {
    console.error('Error in POST /api/chat/close:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
