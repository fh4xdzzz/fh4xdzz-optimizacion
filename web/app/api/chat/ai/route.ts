import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth-server'
import { getDiscordService } from '@/lib/discord-integration'

export const maxDuration = 30

const intakeSchema = z.object({
  reply: z.string().min(1).max(900),
  readyForHuman: z.boolean(),
  summary: z.string().max(1200),
  category: z.enum(['obs_streaming', 'pc_performance', 'payment_order', 'technical', 'other']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  collected: z.object({
    goal: z.string().nullable(),
    equipment: z.string().nullable(),
    platform: z.string().nullable(),
    symptoms: z.string().nullable(),
    attempts: z.string().nullable(),
    urgency: z.string().nullable(),
  }),
})

type Intake = z.infer<typeof intakeSchema>

function fallbackIntake(clientMessages: string[]): Intake {
  const combined = clientMessages.join(' ').slice(0, 900)
  const count = clientMessages.length
  const questions = [
    '¡Hola! Soy Dulcan AI. Antes de pasarte con un especialista, cuéntame exactamente qué quieres lograr o qué problema estás viendo.',
    'Gracias. ¿Qué equipo usas? Incluye Windows, procesador, tarjeta gráfica y memoria RAM si los conoces.',
    '¿En qué programa o plataforma sucede y cuál es el mensaje de error o síntoma exacto?',
    '¿Qué intentaste hasta ahora y para cuándo necesitas resolverlo?',
  ]
  const ready = count >= 4

  return {
    reply: ready
      ? 'Gracias, ya tengo la información necesaria. Preparé el contexto para el equipo. Un agente de soporte continuará contigo aquí; por favor espera su respuesta.'
      : questions[Math.min(count - 1, questions.length - 1)],
    readyForHuman: ready,
    summary: ready ? `Solicitud del cliente: ${combined}` : '',
    category: /obs|stream|twitch|kick/i.test(combined) ? 'obs_streaming' : /pago|pedido|stripe/i.test(combined) ? 'payment_order' : 'technical',
    priority: /urgente|hoy|ahora|no funciona|ca[ií]do/i.test(combined) ? 'high' : 'normal',
    collected: {
      goal: clientMessages[0] || null,
      equipment: count > 1 ? clientMessages[1] : null,
      platform: count > 2 ? clientMessages[2] : null,
      symptoms: clientMessages[0] || null,
      attempts: count > 3 ? clientMessages[3] : null,
      urgency: count > 3 ? clientMessages[3] : null,
    },
  }
}

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

    const supabase = createServiceClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: chat } = await supabase
      .from('chat_sessions')
      .select('id, client_id, status, assigned_agent_id, ai_handoff_ready, conversation_number, users!chat_sessions_client_id_fkey(full_name, email)')
      .eq('id', sessionId)
      .maybeSingle()

    if (!chat || chat.client_id !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (chat.status === 'closed' || chat.assigned_agent_id || chat.ai_handoff_ready) {
      return NextResponse.json({ skipped: true })
    }

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('sender_role, message, created_at')
      .eq('session_id', sessionId)
      .eq('message_type', 'text')
      .order('created_at', { ascending: true })
      .limit(30)

    const conversation = messages || []
    if (!conversation.length || conversation.at(-1)?.sender_role !== 'client') {
      return NextResponse.json({ skipped: true })
    }

    const clientMessages = conversation.filter(item => item.sender_role === 'client').map(item => item.message)
    let intake: Intake
    let messageType = 'text'

    const client = Array.isArray(chat.users) ? chat.users[0] : chat.users
    const clientName = client?.full_name?.trim().split(/\s+/)[0]
      || client?.email?.split('@')[0]
      || 'Cliente'

    if (clientMessages.length === 1) {
      intake = {
        reply: `¡Hola, ${clientName}! 👋 Bienvenido al soporte de TheDulcanDesign. Para ayudarte mejor, completa el siguiente cuadro con los detalles de tu problema.`,
        readyForHuman: false,
        summary: '',
        category: 'other',
        priority: 'normal',
        collected: {
          goal: null,
          equipment: null,
          platform: null,
          symptoms: null,
          attempts: null,
          urgency: null,
        },
      }
      messageType = 'intake_prompt'
    } else {
      try {
        const result = await generateText({
          model: 'openai/gpt-6-luna',
          output: Output.object({ schema: intakeSchema }),
          system: `Eres Dulcan AI, asistente privado de soporte de TheDulcanDesign. Conversas en español claro y amable. Tu única misión es recopilar contexto para un agente humano. Pregunta una sola cosa por turno y evita repetir datos ya dados. Reúne: objetivo, equipo o hardware, sistema operativo, programa/plataforma, síntoma o error exacto, intentos realizados y urgencia. Cuando haya contexto suficiente, readyForHuman debe ser true y la respuesta debe confirmar que preparaste el resumen y que un agente continuará en este mismo chat. Nunca pidas contraseñas, tokens, claves API, números completos de tarjeta ni datos bancarios. No inventes diagnósticos, precios ni promesas. Usa texto plano, sin Markdown. Marca urgent solo ante riesgo de seguridad, cobro no reconocido o servicio crítico caído.`,
          prompt: `Conversación:\n${conversation.map(item => `${item.sender_role}: ${item.message}`).join('\n')}\n\nGenera el siguiente turno y el resumen interno.`,
        })
        intake = result.output
      } catch (error) {
        console.error('AI support intake failed; using safe fallback:', error)
        intake = fallbackIntake(clientMessages)
      }
    }

    const { data: assistantMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        id: crypto.randomUUID(),
        session_id: sessionId,
        sender_id: null,
        sender_role: 'assistant',
        message: intake.reply,
        message_type: messageType,
      })
      .select()
      .single()

    if (insertError) throw insertError

    await supabase.from('chat_sessions').update({
      ai_intake: { ...intake.collected, category: intake.category, priority: intake.priority },
      ai_handoff_ready: intake.readyForHuman,
      ai_summary: intake.summary || null,
      ai_last_response_at: new Date().toISOString(),
      priority: intake.priority,
    }).eq('id', sessionId)

    if (intake.readyForHuman) {
      await getDiscordService().notifyTicketMessage({
        ticket_id: chat.conversation_number,
        customer_name: client?.full_name || client?.email || 'Cliente',
        message: `Triaje de Dulcan AI completado: ${intake.summary}`.slice(0, 1500),
        sender: 'customer',
      })
    }

    return NextResponse.json({ message: assistantMessage, intake })
  } catch (error) {
    console.error('Chat AI error:', error)
    return NextResponse.json({ error: 'No se pudo procesar la asistencia automática' }, { status: 500 })
  }
}
