import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

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
    .select('id, status, assigned_to, estimated_completion')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!currentOrder) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

  if (parsed.data.assignedTo) {
    const { data: assignee } = await auth.supabase
      .from('users')
      .select('id, role')
      .eq('id', parsed.data.assignedTo)
      .in('role', ['staff', 'admin', 'owner'])
      .maybeSingle()
    if (!assignee) return NextResponse.json({ error: 'El responsable seleccionado no es válido.' }, { status: 400 })
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

  const { error: eventError } = await auth.supabase.from('order_events').insert({
    order_id: id,
    event_type: eventType,
    old_status: currentOrder.status,
    new_status: parsed.data.status,
    description: changes.join(' · ') || 'Pedido actualizado',
    created_by: auth.session.user.id,
  })

  if (eventError) console.error('[admin/orders] No se pudo registrar el historial', eventError)
  return NextResponse.json({ success: true })
}
