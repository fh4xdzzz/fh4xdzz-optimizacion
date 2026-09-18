import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/cron/cleanup-chats - Limpiar chats cerrados antiguos
// Este endpoint debe ser llamado por Vercel cron jobs cada hora
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del cron job (usando un header secreto)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Eliminar mensajes de chats cerrados hace más de 24 horas
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .in('session_id', supabase
        .from('chat_sessions')
        .select('id')
        .eq('status', 'closed')
        .lt('closed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      )

    if (messagesError) {
      console.error('Error deleting old messages:', messagesError)
    }

    // Eliminar chats cerrados hace más de 24 horas
    const { error: sessionsError, count } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('status', 'closed')
      .lt('closed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (sessionsError) {
      console.error('Error deleting old sessions:', sessionsError)
      return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 })
    }

    // Eliminar registros de auditoría antiguos (30 días)
    await supabase
      .from('chat_audit_logs')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    console.log(`Cleanup completed: ${count || 0} sessions deleted`)

    return NextResponse.json({
      success: true,
      deletedSessions: count || 0,
      message: 'Cleanup completed successfully'
    })
  } catch (error) {
    console.error('Error in cleanup cron job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
