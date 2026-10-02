import { NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/admin-api'

type Activity = {
  id: string
  type: 'user' | 'order' | 'support' | 'message'
  action: string
  title: string
  description: string
  actorId: string | null
  actorName: string
  actorRole: string
  reference: string | null
  createdAt: string
}

export async function GET() {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { supabase } = auth
  const [usersResult, ordersResult, servicesResult, sessionsResult, orderEventsResult, chatAuditResult, messagesResult] = await Promise.all([
    supabase.from('users').select('id, email, full_name, role, created_at').order('created_at', { ascending: false }).limit(1000),
    supabase.from('orders').select('id, order_number, status, client_name, client_email, service_name, price, user_id, assigned_to, created_at, updated_at').order('updated_at', { ascending: false }).limit(1000),
    supabase.from('services').select('id, name, category, price, is_active, is_featured, created_at').order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
    supabase.from('chat_sessions').select('id, conversation_number, status, priority, subject, client_id, assigned_agent_id, created_at, updated_at').order('updated_at', { ascending: false }).limit(1000),
    supabase.from('order_events').select('id, order_id, event_type, description, old_status, new_status, created_by, created_at, orders(order_number, client_name)').order('created_at', { ascending: false }).limit(150),
    supabase.from('chat_audit_logs').select('id, action, actor_id, session_id, metadata, created_at, chat_sessions(conversation_number, subject)').order('created_at', { ascending: false }).limit(150),
    supabase.from('chat_messages').select('id, session_id, sender_id, sender_role, message, message_type, created_at, chat_sessions(conversation_number, subject)').order('created_at', { ascending: false }).limit(120),
  ])

  const failed = [usersResult, ordersResult, servicesResult, sessionsResult, orderEventsResult, chatAuditResult, messagesResult].find(result => result.error)
  if (failed?.error) {
    console.error('[owner/activity] Error consultando actividad', failed.error)
    return NextResponse.json({ error: 'No se pudo cargar la actividad del sistema.' }, { status: 500 })
  }

  const users = usersResult.data || []
  const orders = ordersResult.data || []
  const services = servicesResult.data || []
  const sessions = sessionsResult.data || []
  const userMap = new Map(users.map(user => [user.id, user]))
  const actor = (id: string | null, fallbackRole = 'system') => {
    const user = id ? userMap.get(id) : null
    return {
      actorId: id,
      actorName: user?.full_name || user?.email || (id ? 'Usuario eliminado' : 'Sistema'),
      actorRole: user?.role || fallbackRole,
    }
  }

  const activities: Activity[] = []

  for (const user of users.slice(0, 80)) {
    activities.push({
      id: `user-${user.id}`,
      type: 'user',
      action: 'USER_REGISTERED',
      title: 'Nuevo usuario registrado',
      description: `${user.full_name || user.email} se unió como ${user.role}.`,
      ...actor(user.id, user.role),
      reference: user.email,
      createdAt: user.created_at,
    })
  }

  for (const event of orderEventsResult.data || []) {
    const order = Array.isArray(event.orders) ? event.orders[0] : event.orders
    activities.push({
      id: `order-${event.id}`,
      type: 'order',
      action: event.event_type,
      title: event.event_type === 'created' ? 'Pedido creado' : event.event_type === 'status_changed' ? 'Estado de pedido actualizado' : 'Actividad en pedido',
      description: event.description || [event.old_status, event.new_status].filter(Boolean).join(' → ') || 'Pedido actualizado.',
      ...actor(event.created_by),
      reference: order?.order_number || order?.client_name || null,
      createdAt: event.created_at,
    })
  }

  for (const log of chatAuditResult.data || []) {
    const chat = Array.isArray(log.chat_sessions) ? log.chat_sessions[0] : log.chat_sessions
    activities.push({
      id: `support-${log.id}`,
      type: 'support',
      action: log.action,
      title: String(log.action).replaceAll('_', ' ').toLowerCase().replace(/^./, (value: string) => value.toUpperCase()),
      description: typeof log.metadata === 'object' && log.metadata !== null
        ? Object.entries(log.metadata).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') || 'Acción registrada en soporte.'
        : 'Acción registrada en soporte.',
      ...actor(log.actor_id),
      reference: chat?.conversation_number || chat?.subject || null,
      createdAt: log.created_at,
    })
  }

  for (const message of messagesResult.data || []) {
    const chat = Array.isArray(message.chat_sessions) ? message.chat_sessions[0] : message.chat_sessions
    const preview = message.message_type === 'attachment'
      ? 'Envió un archivo adjunto.'
      : String(message.message || '').replaceAll('\n', ' ').slice(0, 120)
    activities.push({
      id: `message-${message.id}`,
      type: 'message',
      action: 'MESSAGE_SENT',
      title: 'Mensaje enviado en soporte',
      description: preview || 'Mensaje sin contenido visible.',
      ...actor(message.sender_id, message.sender_role),
      reference: chat?.conversation_number || chat?.subject || null,
      createdAt: message.created_at,
    })
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + Number(order.price || 0), 0)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    metrics: {
      users: users.length,
      clients: users.filter(user => user.role === 'client').length,
      team: users.filter(user => ['staff', 'admin'].includes(user.role)).length,
      orders: orders.length,
      activeOrders: orders.filter(order => ['reviewing', 'in_progress', 'waiting_client'].includes(order.status)).length,
      revenue: totalRevenue,
      openChats: sessions.filter(session => session.status !== 'closed').length,
      closedChats: sessions.filter(session => session.status === 'closed').length,
    },
    users,
    orders,
    services,
    chats: sessions.map(session => ({
      ...session,
      clientName: session.client_id ? userMap.get(session.client_id)?.full_name || userMap.get(session.client_id)?.email || 'Cliente' : 'Visitante',
      assignedAgent: session.assigned_agent_id ? userMap.get(session.assigned_agent_id)?.full_name || userMap.get(session.assigned_agent_id)?.email || 'Agente' : null,
    })),
    activities: activities.slice(0, 300),
  })
}
