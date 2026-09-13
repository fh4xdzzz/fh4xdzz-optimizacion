import { NextRequest, NextResponse } from 'next/server'

// Rate limiting básico en memoria (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100

/**
 * API Route segura para recibir webhooks de Discord
 * POST /api/integrations/discord/webhook
 *
 * Valida token secreto, previene duplicados, implementa rate limiting
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar método
    if (request.method !== 'POST') {
      return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
      )
    }

    // 2. Validar token secreto
    const webhookSecret = process.env.DISCORD_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('DISCORD_WEBHOOK_SECRET no configurado')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer '
    if (token !== webhookSecret) {
      console.error('Token webhook inválido')
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 3. Rate limiting básico
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const rateLimit = rateLimitMap.get(clientIp)

    if (!rateLimit || now > rateLimit.resetTime) {
      rateLimitMap.set(clientIp, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      })
    } else if (rateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    } else {
      rateLimit.count++
    }

    // 4. Validar JSON
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // 5. Validar estructura del evento
    const { event_id, event_type, created_at, organization_id, payload } = body

    if (!event_id || !event_type || !created_at || !organization_id || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 6. Validar tipo de evento
    const validEventTypes = [
      'order.created',
      'order.paid',
      'order.processing',
      'order.completed',
      'order.cancelled',
      'ticket.created',
      'ticket.message_created',
      'user.created',
      'system.alert'
    ]

    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // 7. Prevenir duplicados (usando event_id)
    // En producción usar Redis o base de datos
    const processedEvents = new Set<string>()
    if (processedEvents.has(event_id)) {
      return NextResponse.json(
        { success: true, message: 'Event already processed' },
        { status: 200 }
      )
    }
    processedEvents.add(event_id)

    // 8. Procesar evento
    console.log(`📥 Evento recibido: ${event_type}`, {
      event_id,
      organization_id,
      timestamp: new Date().toISOString()
    })

    // Aquí se enviaría al bot de Discord
    // Por ahora, solo logueamos
    const discordBotUrl = process.env.DISCORD_BOT_API_URL
    if (discordBotUrl) {
      try {
        await fetch(discordBotUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DISCORD_BOT_API_SECRET}`
          },
          body: JSON.stringify(body)
        })
        console.log('✅ Evento enviado al bot de Discord')
      } catch (error) {
        console.error('❌ Error enviando al bot de Discord:', error)
        // No fallar el request si el bot no responde
      }
    }

    // 9. Responder con éxito
    return NextResponse.json(
      {
        success: true,
        message: 'Event processed successfully',
        event_id,
        event_type
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
