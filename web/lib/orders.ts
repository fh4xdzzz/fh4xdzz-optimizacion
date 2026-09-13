// Sistema de gestión de pedidos (demo - en producción usar Supabase)

export interface Order {
  id: string
  orderNumber: string
  service: string
  clientName: string
  clientEmail: string
  clientDiscord?: string
  description: string
  price: number
  status: 'pending' | 'reviewing' | 'in_progress' | 'waiting_client' | 'completed' | 'cancelled'
  createdAt: string
  estimatedCompletion?: string
}

export interface Service {
  id: string
  name: string
  slug: string
  price: number
  duration: string
}

const SERVICES: Service[] = [
  { id: '1', name: 'Optimización de OBS', slug: 'optimizacion-obs', price: 29.99, duration: '1-2 horas' },
  { id: '2', name: 'Configuración de Streaming', slug: 'configuracion-streaming', price: 49.99, duration: '2-3 horas' },
  { id: '3', name: 'Optimización de PC/Windows', slug: 'optimizacion-pc-windows', price: 39.99, duration: '1-2 horas' },
  { id: '4', name: 'Configuración Gaming', slug: 'configuracion-gaming', price: 24.99, duration: '1 hora por juego' },
  { id: '5', name: 'Diseño de Overlays y Alertas', slug: 'diseno-overlays-alertas', price: 59.99, duration: '3-5 días' },
  { id: '6', name: 'Soporte Técnico', slug: 'soporte-tecnico', price: 19.99, duration: '30-60 minutos' },
  { id: '7', name: 'Servicios Personalizados', slug: 'servicios-personalizados', price: 99.99, duration: 'Según complejidad' },
]

// Verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key'
  )
}

// Generar número de pedido único
export function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `ORD${dateStr}${random}`
}

// Guardar pedido en localStorage (fallback cuando Supabase no está configurado)
export function saveOrder(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order {
  const orders = getOrders()
  const newOrder: Order = {
    ...order,
    id: Date.now().toString(),
    orderNumber: generateOrderNumber(),
    createdAt: new Date().toISOString(),
  }
  orders.push(newOrder)
  localStorage.setItem('orders', JSON.stringify(orders))
  return newOrder
}

// Obtener todos los pedidos (localStorage - fallback)
export function getOrders(): Order[] {
  if (typeof window === 'undefined') return []
  const orders = localStorage.getItem('orders')
  return orders ? JSON.parse(orders) : []
}

// Obtener pedido por número (localStorage - fallback)
export function getOrderByNumber(orderNumber: string): Order | undefined {
  const orders = getOrders()
  return orders.find(order => order.orderNumber === orderNumber)
}

// Obtener servicio por nombre
export function getServiceByName(name: string): Service | undefined {
  return SERVICES.find(service => service.name === name)
}

// Obtener todos los servicios
export function getServices(): Service[] {
  return SERVICES
}
