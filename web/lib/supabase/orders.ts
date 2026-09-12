// Integración con Supabase para gestión de pedidos
// Este archivo está preparado para cuando se configure Supabase

import { createClient } from './client'

const supabase = createClient()

export interface SupabaseOrder {
  id: string
  order_number: string
  user_id?: string
  service_id: string
  status: 'pending' | 'reviewing' | 'in_progress' | 'waiting_client' | 'completed' | 'cancelled'
  client_name: string
  client_email: string
  client_discord?: string
  description: string
  price: number
  notes?: string
  assigned_to?: string
  estimated_completion?: string
  actual_completion?: string
  created_at: string
  updated_at: string
}

// Crear pedido en Supabase
export async function createSupabaseOrder(orderData: Omit<SupabaseOrder, 'id' | 'order_number' | 'created_at' | 'updated_at'>) {
  try {
    // Generar número de pedido
    const orderNumber = generateOrderNumber()

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        order_number: orderNumber,
      })
      .select()
      .single()

    if (error) throw error

    // Crear evento de creación
    await createOrderEvent(data.id, 'created', null, 'pending', 'Pedido creado')

    return data
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

// Obtener pedido por número
export async function getSupabaseOrderByNumber(orderNumber: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching order:', error)
    throw error
  }
}

// Obtener pedidos de un usuario
export async function getSupabaseUserOrders(userId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching user orders:', error)
    throw error
  }
}

// Actualizar estado de pedido
export async function updateSupabaseOrderStatus(
  orderId: string,
  newStatus: string,
  notes?: string
) {
  try {
    // Obtener estado actual
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (!currentOrder) throw new Error('Order not found')

    // Actualizar pedido
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    // Crear evento de cambio de estado
    await createOrderEvent(
      orderId,
      'status_changed',
      currentOrder.status,
      newStatus,
      notes || `Estado cambiado a ${newStatus}`
    )

    return data
  } catch (error) {
    console.error('Error updating order status:', error)
    throw error
  }
}

// Crear evento de pedido
async function createOrderEvent(
  orderId: string,
  eventType: string,
  oldStatus: string | null,
  newStatus: string | null,
  description: string
) {
  try {
    const { error } = await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: eventType,
      old_status: oldStatus,
      new_status: newStatus,
      description,
    })

    if (error) throw error
  } catch (error) {
    console.error('Error creating order event:', error)
  }
}

// Generar número de pedido (función auxiliar)
function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `ORD${dateStr}${random}`
}

// Verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}