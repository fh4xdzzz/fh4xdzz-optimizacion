import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/auth-server'

export const maxDuration = 30
const INTAKE_PROMPT_PREFIX = '[DULCAN_INTAKE] '

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerSession()
    if (!auth || auth.user.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session_id: sessionId } = await request.json()
    if (!sessionId) return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'Support service is unavailable' }, { status: 503 })

    const supabase = createServiceClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: chat } = await supabase
      .from('chat_sessions')
      .select('id, client_id, status, assigned_agent_id, users!chat_sessions_client_id_fkey(full_name, email)')
      .eq('id', sessionId)
      .maybeSingle()

    if (!chat || chat.client_id !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (chat.status === 'closed' || chat.assigned_agent_id) return NextResponse.json({ skipped: true })

    const { data: existingAssistantMessage } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', sessionId)
      .eq('sender_role', 'assistant')
      .limit(1)
      .maybeSingle()

    // El bot participa una sola vez por soporte: bienvenida y formulario.
    // Después de esto, la conversación queda exclusivamente para una persona.
    if (existingAssistantMessage) return NextResponse.json({ skipped: true })

    const { data: firstClientMessage } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', sessionId)
      .eq('sender_role', 'client')
      .limit(1)
      .maybeSingle()

    if (!firstClientMessage) return NextResponse.json({ skipped: true })

    const client = Array.isArray(chat.users) ? chat.users[0] : chat.users
    const clientName = client?.full_name?.trim().split(/\s+/)[0]
      || client?.email?.split('@')[0]
      || 'Cliente'
    const welcome = `¡Hola, ${clientName}! 👋 Bienvenido al soporte de TheDulcanDesign. Completa el siguiente formulario para que un agente pueda ayudarte.`

    const { data: assistantMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        sender_id: null,
        sender_role: 'assistant',
        message: `${INTAKE_PROMPT_PREFIX}${welcome}`,
        message_type: 'text',
      })
      .select()
      .single()

    if (insertError) throw insertError

    await supabase.from('chat_sessions').update({
      ai_last_response_at: new Date().toISOString(),
    }).eq('id', sessionId)

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error('Chat welcome error:', error)
    return NextResponse.json({ error: 'No se pudo enviar la bienvenida automática' }, { status: 500 })
  }
}
