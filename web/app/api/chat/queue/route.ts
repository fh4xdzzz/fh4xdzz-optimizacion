import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// GET /api/chat/queue - Obtener cola de chats para el panel de soporte
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'waiting'
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = await createClient()

    let query = supabase
      .from('chat_sessions')
      .select(`
        *,
        client:client_id(id, email, full_name, avatar_url, vip_level),
        agent:assigned_agent_id(id, full_name, avatar_url)
      `)
      .eq('status', status)
      .order('last_message_at', { ascending: false })
      .limit(limit)

    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching chat queue:', error)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Contar mensajes no leídos para cada sesión
    const sessionsWithUnread = await Promise.all(
      sessions.map(async (session: any) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .is('read_at', null)
          .neq('sender_id', session.user.id)

        return {
          ...session,
          unread_count: count || 0
        }
      })
    )

    return NextResponse.json({ sessions: sessionsWithUnread })
  } catch (error) {
    console.error('Error in GET /api/chat/queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
