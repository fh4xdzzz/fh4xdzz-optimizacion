import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'
import { getDiscordService } from '@/lib/discord-integration'
import { sendOrderNotificationEmail } from '@/lib/order-notifications'

const updateOrderSchema = z.object({
  status: z.enum(['reviewing', 'in_progress', 'waiting_client', 'completed', 'cancelled']),
  assignedTo: z.uuid().nullable(),
  estimatedCompletion: z.iso.datetime().nullable(),
  note: z.string().trim().max(1000).optional().default(''),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRole()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = updateOrderSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del pedido.' }, { status: 400 })

  const { id } = await context.params
  const { data: currentOrder } = await auth.supabase
    .from('orders')
    .select('id, user_id, order_number, client_name, client_email, status, assigned_to, estimated_completion, services(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!currentOrder) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

  let assignedName: string | null = null
  if (parsed.data.assignedTo) {
    const { data: assignee } = await auth.supabase
      .from('users')
      .select('id, role, full_name')
      .eq('id', parsed.data.assignedTo)
      .in('role', ['staff', 'admin', 'owner'])
      .maybeSingle()
    if (!assignee) return NextResponse.json({ error: 'El responsable seleccionado no es válido.' }, { status: 400 })
    assignedName = assignee.full_name || null
  }

  const updatePayload: Record<string, string | null> = {
    status: parsed.data.status,
    assigned_to: parsed.data.assignedTo,
    estimated_completion: parsed.data.estimatedCompletion,
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.note) updatePayload.notes = parsed.data.note
  if (parsed.data.status === 'completed' && currentOrder.status !== 'completed') {
    updatePayload.actual_completion = new Date().toISOString()
  }

  const { data: updatedOrder, error: updateError } = await auth.supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', id)
    .select('id')
    .single()

  if (updateError || !updatedOrder) {
    return NextResponse.json({ error: updateError?.message || 'No se pudo actualizar el pedido.' }, { status: 500 })
  }

  const changes: string[] = []
  if (currentOrder.status !== parsed.data.status) changes.push(`Estado: ${currentOrder.status} → ${parsed.data.status}`)
  if (currentOrder.assigned_to !== parsed.data.assignedTo) changes.push(parsed.data.assignedTo ? 'Responsable asignado' : 'Responsable retirado')
  if (currentOrder.estimated_completion !== parsed.data.estimatedCompletion) changes.push('Fecha estimada actualizada')
  if (parsed.data.note) changes.push(parsed.data.note)

  const eventType = currentOrder.status !== parsed.data.status
    ? 'status_changed'
    : currentOrder.assigned_to !== parsed.data.assignedTo
      ? 'assigned'
      : 'note_added'

  const { data: orderEvent, error: eventError } = await auth.supabase.from('order_events').insert({
    order_id: id,
    event_type: eventType,
    old_status: currentOrder.status,
    new_status: parsed.data.status,
    description: changes.join(' · ') || 'Pedido actualizado',
    created_by: auth.session.user.id,
  }).select('id').single()

  if (eventError) console.error('[admin/orders] No se pudo registrar el historial', eventError)

  if (changes.length > 0) {
    const service = Array.isArray(currentOrder.services) ? currentOrder.services[0] : currentOrder.services
    const { data: customer } = await auth.supabase
      .from('users')
      .select('discord_id')
      .eq('id', currentOrder.user_id)
      .maybeSingle()
    const notificationKind = currentOrder.status !== parsed.data.status
      ? parsed.data.status === 'waiting_client'
        ? 'waiting_client'
        : parsed.data.status === 'completed'
          ? 'completed'
          : parsed.data.status === 'cancelled'
            ? 'cancelled'
            : 'status_changed'
      : currentOrder.assigned_to !== parsed.data.assignedTo
        ? 'assigned'
        : 'status_changed'
    const notificationEventId = orderEvent?.id || `${id}-${Date.now()}`

    await Promise.allSettled([
      sendOrderNotificationEmail({
        kind: notificationKind,
        eventId: notificationEventId,
        orderId: id,
        orderNumber: currentOrder.order_number,
        customerName: currentOrder.client_name,
        customerEmail: currentOrder.client_email,
        serviceName: service?.name || 'Servicio',
        status: parsed.data.status,
        note: parsed.data.note || undefined,
        estimatedCompletion: parsed.data.estimatedCompletion,
        assignedName,
      }),
      getDiscordService().notifyOrderStatus({
        event_id: notificationEventId,
        order_id: id,
        order_number: currentOrder.order_number,
        service_name: service?.name || 'Servicio',
        customer_name: currentOrder.client_name,
        discord_user_id: customer?.discord_id || undefined,
        status: parsed.data.status,
        note: parsed.data.note || undefined,
        estimated_completion: parsed.data.estimatedCompletion,
        assigned_name: assignedName,
      }),
    ])
  }
  return NextResponse.json({ success: true })
}
