# Discord Webhook Integration Guide

## 📋 Introducción

Este documento explica cómo funciona la integración de webhooks entre TheDulcanDesign web y el bot de Discord.

## 🏗️ Arquitectura

```
Web (Next.js) → API Route → Flask Webhook → EventProcessor → Discord
```

### Flujo de Datos

1. **Web (Next.js):** Evento ocurre (ej: pedido creado)
2. **DiscordIntegrationService:** Prepara el evento
3. **API Route:** Valida y envía al webhook
4. **Flask Webhook:** Recibe y valida el evento
5. **EventProcessor:** Procesa el evento
6. **Discord:** Envía notificación al canal correspondiente

## 🔐 Seguridad

### Autenticación

El webhook usa autenticación Bearer Token:

```typescript
// En la web
headers: {
  'Authorization': `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`
}
```

```python
# En el bot
auth_header = request.headers.get('Authorization')
token = auth_header[7:]  # Remove 'Bearer '
if token != webhook_secret:
    return {'success': False, 'message': 'Forbidden'}, 403
```

### Rate Limiting

Implementación básica en memoria:

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100
```

En producción, usar Redis para rate limiting distribuido.

### Validación de Eventos

Validación de estructura:

```typescript
const { event_id, event_type, created_at, organization_id, payload } = body

if (!event_id || !event_type || !created_at || !organization_id || !payload) {
  return { success: false, error: 'Missing required fields' }, 400
}
```

Validación de tipo:

```typescript
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
  return { success: false, error: 'Invalid event type' }, 400
}
```

### Prevención de Duplicados

Usando `event_id`:

```python
if event_id in self.processed_events:
    logger.info(f"Evento duplicado ignorado: {event_id}")
    return True

self.processed_events.add(event_id)
```

## 📦 Eventos Soportados

### order.created

Notifica cuando se crea un nuevo pedido.

**Payload:**
```json
{
  "event_id": "order_123_1691234567890",
  "event_type": "order.created",
  "created_at": "2026-09-13T12:00:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "order_id": "order_123",
    "order_number": "ORD-001",
    "service_name": "Optimización de OBS",
    "customer_name": "Juan Pérez",
    "customer_email": "juan@example.com",
    "status": "pending",
    "description": "Necesito optimización para streaming"
  }
}
```

**Embed en Discord:**
- Color: Amarillo (0xf1c40f)
- Canal: #pedidos
- Campos: ID, Cliente, Email, Servicio, Estado, Descripción

### order.paid

Notifica cuando un pedido es pagado.

**Payload:**
```json
{
  "event_id": "order_paid_123_1691234567890",
  "event_type": "order.paid",
  "created_at": "2026-09-13T12:30:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "order_id": "order_123",
    "order_number": "ORD-001",
    "service_name": "Optimización de OBS",
    "customer_name": "Juan Pérez"
  }
}
```

**Embed en Discord:**
- Color: Azul (0x3498db)
- Canal: #pedidos
- Campos: ID, Cliente, Servicio, Estado

### order.completed

Notifica cuando un pedido es completado.

**Payload:**
```json
{
  "event_id": "order_completed_123_1691234567890",
  "event_type": "order.completed",
  "created_at": "2026-09-13T14:00:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "order_id": "order_123",
    "order_number": "ORD-001",
    "service_name": "Optimización de OBS",
    "customer_name": "Juan Pérez"
  }
}
```

**Embed en Discord:**
- Color: Verde (0x2ecc71)
- Canal: #pedidos
- Campos: ID, Cliente, Servicio, Estado

### order.cancelled

Notifica cuando un pedido es cancelado.

**Payload:**
```json
{
  "event_id": "order_cancelled_123_1691234567890",
  "event_type": "order.cancelled",
  "created_at": "2026-09-13T15:00:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "order_id": "order_123",
    "order_number": "ORD-001",
    "service_name": "Optimización de OBS",
    "customer_name": "Juan Pérez"
  }
}
```

**Embed en Discord:**
- Color: Rojo (0xe74c3c)
- Canal: #pedidos
- Campos: ID, Cliente, Servicio, Estado

### ticket.created

Notifica cuando se crea un ticket de soporte.

**Payload:**
```json
{
  "event_id": "ticket_123_1691234567890",
  "event_type": "ticket.created",
  "created_at": "2026-09-13T16:00:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "ticket_id": "TICK-001",
    "customer_name": "Juan Pérez",
    "category": "soporte",
    "subject": "Problema con OBS",
    "description": "No puedo iniciar el streaming"
  }
}
```

**Embed en Discord:**
- Color: Azul (0x3498db)
- Canal: #staff
- Campos: ID, Cliente, Categoría, Asunto, Descripción

### ticket.message_created

Notifica cuando se envía un mensaje en un ticket.

**Payload:**
```json
{
  "event_id": "ticket_message_123_1691234567890",
  "event_type": "ticket.message_created",
  "created_at": "2026-09-13T16:30:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "ticket_id": "TICK-001",
    "customer_name": "Juan Pérez",
    "message": "Necesito ayuda urgente",
    "sender": "customer"
  }
}
```

**Embed en Discord:**
- Color: Púrpura (0x9b59b6)
- Canal: #staff
- Campos: ID, Cliente, Remitente, Mensaje

### user.created

Notifica cuando se registra un nuevo usuario.

**Payload:**
```json
{
  "event_id": "user_123_1691234567890",
  "event_type": "user.created",
  "created_at": "2026-09-13T17:00:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "user_id": "user_123",
    "email": "juan@example.com",
    "full_name": "Juan Pérez"
  }
}
```

**Embed en Discord:**
- Color: Verde (0x2ecc71)
- Canal: #notificaciones
- Campos: ID, Email, Nombre

### system.alert

Notifica alertas del sistema.

**Payload:**
```json
{
  "event_id": "alert_error_1691234567890",
  "event_type": "system.alert",
  "created_at": "2026-09-13T18:00:00Z",
  "organization_id": "thedulcandesign",
  "payload": {
    "level": "error",
    "message": "Error conectando a Supabase",
    "origin": "api/orders",
    "technical_info": {
      "error_code": "500",
      "timestamp": "2026-09-13T18:00:00Z"
    }
  }
}
```

**Embed en Discord:**
- Color: Según nivel (info=azul, warning=amarillo, error=naranja, critical=rojo)
- Canal: #notificaciones
- Campos: Nivel, Origen, Fecha, Información técnica (sanitizada)

## 💻 Uso en la Web

### DiscordIntegrationService

```typescript
import { getDiscordService } from '@/lib/discord-integration'

const discordService = getDiscordService()

// Notificar nuevo pedido
await discordService.notifyNewOrder({
  order_id: 'order_123',
  order_number: 'ORD-001',
  service_name: 'Optimización de OBS',
  customer_name: 'Juan Pérez',
  customer_email: 'juan@example.com',
  status: 'pending'
})

// Notificar pedido pagado
await discordService.notifyOrderPaid({
  order_id: 'order_123',
  order_number: 'ORD-001',
  service_name: 'Optimización de OBS',
  customer_name: 'Juan Pérez'
})

// Notificar alerta del sistema
await discordService.notifySystemAlert({
  level: 'error',
  message: 'Error conectando a Supabase',
  origin: 'api/orders',
  technical_info: {
    error_code: '500'
  }
})
```

### API Route Directa

```typescript
const response = await fetch('/api/integrations/discord/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`
  },
  body: JSON.stringify({
    event_id: `event_${Date.now()}`,
    event_type: 'order.created',
    created_at: new Date().toISOString(),
    organization_id: 'thedulcandesign',
    payload: {
      // Tu payload aquí
    }
  })
})
```

## 🧪 Pruebas

### Probar con curl

```bash
curl -X POST http://localhost:3000/api/integrations/discord/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_webhook_secret" \
  -d '{
    "event_id": "test_123",
    "event_type": "system.alert",
    "created_at": "2026-09-13T12:00:00Z",
    "organization_id": "thedulcandesign",
    "payload": {
      "level": "info",
      "message": "Prueba de webhook",
      "origin": "test"
    }
  }'
```

### Probar desde Discord

```
!test-webhook
```

## 🐛 Solución de Problemas

### Error: "Unauthorized"

**Causa:** Token no enviado o incorrecto

**Solución:**
1. Verifica que `DISCORD_WEBHOOK_SECRET` esté configurado
2. Verifica que el header `Authorization` esté presente
3. Verifica que el token sea correcto

### Error: "Forbidden"

**Causa:** Token inválido

**Solución:**
1. Verifica que el secreto sea el mismo en bot y web
2. Regenera el secreto si es necesario

### Error: "Rate limit exceeded"

**Causa:** Demasiadas solicitudes

**Solución:**
1. Espera 1 minuto
2. Implementa retry con exponential backoff

### Error: "Invalid event type"

**Causa:** Tipo de evento no soportado

**Solución:**
1. Verifica que el tipo esté en la lista de eventos válidos
2. Agrega el nuevo tipo al validador si es necesario

### Evento no llega a Discord

**Causa:** Error en EventProcessor

**Solución:**
1. Revisa los logs del bot
2. Verifica que EventProcessor esté inicializado
3. Verifica que el canal de destino exista

## 📚 Referencias

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Discord.py Documentation](https://discordpy.readthedocs.io/)
