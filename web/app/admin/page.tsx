'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, isDemoMode } from '@/lib/auth-hybrid'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  full_name?: string
  role: 'client' | 'admin' | 'staff' | 'owner'
  created_at: string
}

interface Order {
  id: string
  order_number: string
  user_id: string
  service_name: string
  status: string
  created_at: string
  client_name: string
  client_email: string
  description: string
}

interface Service {
  id: string
  name: string
  slug: string
  category: string
  price: number
  is_active: boolean
  is_featured: boolean
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'services' | 'settings'>('overview')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [userRole, setUserRole] = useState<'client' | 'admin' | 'staff' | 'owner'>('client')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const router = useRouter()
  const isDemo = isDemoMode()

  const loadAdminData = async () => {
    const supabase = createClient()

    // Cargar usuarios
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (usersData) setUsers(usersData)

    // Cargar pedidos
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, services(name)')
      .order('created_at', { ascending: false })
    if (ordersData) {
      setOrders(ordersData.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        service_name: order.services?.name || 'Servicio desconocido',
        status: order.status,
        created_at: order.created_at,
        client_name: order.client_name,
        client_email: order.client_email,
        description: order.description,
      })))
    }

    // Cargar servicios
    const { data: servicesData } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true })
    if (servicesData) setServices(servicesData)
  }

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/auth/login?redirect=/admin')
        return
      }

      // Verificar si es admin o owner
      const role = session.user.role as string || 'client'
      setUserRole(role as 'client' | 'admin' | 'staff' | 'owner')
      if (role !== 'admin' && role !== 'owner') {
        router.push('/dashboard')
        return
      }

      // Cargar datos de administración
      if (!isDemo) {
        await loadAdminData()
      }

      setLoading(false)
    }

    loadData()
  }, [router, isDemo])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      if (userRole !== 'owner') {
        alert('Solo el owner puede eliminar pedidos')
        return
      }

      const confirmed = confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')
      if (!confirmed) return

      // Importar la función de eliminación
      const { deleteSupabaseOrder } = await import('@/lib/supabase/orders')

      const session = await getSession()
      if (!session) {
        alert('Debes iniciar sesión para eliminar pedidos')
        return
      }

      await deleteSupabaseOrder(orderId, session.user.id, session.user.role || 'client')

      // Recargar pedidos
      await loadAdminData()
      setDeleteConfirm(null)
      setShowOrderModal(false)
      setSelectedOrder(null)
      alert('Pedido eliminado exitosamente')
    } catch (error) {
      console.error('Error al eliminar pedido:', error)
      alert('Error al eliminar pedido: ' + (error as Error).message)
    }
  }

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: 'bg-yellow-500' },
    reviewing: { label: 'Revisando', color: 'bg-blue-500' },
    in_progress: { label: 'En proceso', color: 'bg-purple-500' },
    waiting_client: { label: 'Esperando cliente', color: 'bg-orange-500' },
    completed: { label: 'Completado', color: 'bg-green-500' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500' },
  }

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    client: { label: 'Cliente', color: 'bg-blue-500' },
    admin: { label: 'Admin', color: 'bg-red-500' },
    staff: { label: 'Staff', color: 'bg-purple-500' },
    owner: { label: 'Owner', color: 'bg-black' },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando dashboard de administración...</p>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="animated-bg"></div>
      <div className="animated-bg-overlay"></div>
      <div className="relative z-10">
        <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text-primary animate-fade-in-up">Panel de Administración</h1>
              <p className="text-muted text-lg text-headline">
                Gestiona usuarios, pedidos, servicios y configuraciones
                {isDemo && ' (Modo Demo)'}
              </p>
            </div>
          </div>

          {isDemo && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-6 py-3 rounded-xl text-base mb-8 animate-fade-in-up glass-card">
              ⚠️ Modo demo activo - Funcionalidades limitadas
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-3 mb-8 border-b border-border/50 pb-6 relative z-30">
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'overview' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'border border-border bg-transparent hover:bg-card'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Resumen
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'users' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'border border-border bg-transparent hover:bg-card'
              }`}
              onClick={() => setActiveTab('users')}
            >
              Usuarios ({users.length})
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'orders' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'border border-border bg-transparent hover:bg-card'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Pedidos ({orders.length})
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'services' 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'border border-border bg-transparent hover:bg-card'
              }`}
              onClick={() => setActiveTab('services')}
            >
              Servicios ({services.length})
            </button>
            {(userRole === 'owner') && (
              <button
                className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                  activeTab === 'settings' 
                    ? 'bg-primary text-white hover:bg-primary/90' 
                    : 'border border-border bg-transparent hover:bg-card'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                Configuración
              </button>
            )}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="cursor-pointer hover:border-primary/50 transition-all hover-lift hover-glow glass-card glowing-border animate-fade-in-up" style={{ animationDelay: '0.1s' }} onClick={() => setActiveTab('users')}>
                <CardHeader>
                  <CardTitle className="text-xl mb-2">Total Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold gradient-text-primary">{users.length}</div>
                  <p className="text-sm text-muted mt-2">Usuarios registrados</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-all hover-lift hover-glow glass-card glowing-border animate-fade-in-up" style={{ animationDelay: '0.2s' }} onClick={() => setActiveTab('orders')}>
                <CardHeader>
                  <CardTitle className="text-xl mb-2">Total Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold gradient-text-secondary">{orders.length}</div>
                  <p className="text-sm text-muted mt-2">Pedidos totales</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-all hover-lift hover-glow glass-card glowing-border animate-fade-in-up" style={{ animationDelay: '0.3s' }} onClick={() => setActiveTab('orders')}>
                <CardHeader>
                  <CardTitle className="text-xl mb-2">Pedidos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-yellow-500">
                    {orders.filter((order) => order.status === 'pending').length}
                  </div>
                  <p className="text-sm text-muted mt-2">Requieren atención</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-all hover-lift hover-glow glass-card glowing-border animate-fade-in-up" style={{ animationDelay: '0.4s' }} onClick={() => setActiveTab('services')}>
                <CardHeader>
                  <CardTitle className="text-xl mb-2">Servicios Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-500">
                    {services.filter((service) => service.is_active).length}
                  </div>
                  <p className="text-sm text-muted mt-2">Disponibles</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card className="glass-card hover-glow animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl">Usuarios Registrados</CardTitle>
                <CardDescription className="text-base">Gestión de usuarios y roles</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user, index) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl hover:border-primary/50 transition-all hover-lift glass-card animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium text-lg">{user.email}</div>
                            <div className={`w-3 h-3 rounded-full ${ROLE_LABELS[user.role]?.color || 'bg-gray-500'} animate-pulse`} />
                            <span className="text-sm text-muted font-medium">{ROLE_LABELS[user.role]?.label || user.role}</span>
                          </div>
                          <div className="text-base text-muted">
                            {user.full_name || 'Sin nombre'} • {formatDate(user.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted text-lg">No hay usuarios registrados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <Card className="glass-card hover-glow animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl">Todos los Pedidos</CardTitle>
                <CardDescription className="text-base">Gestión de pedidos de todos los usuarios</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order, index) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl hover:border-primary/50 transition-all hover-lift glass-card animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedOrder(order)
                            setNewStatus(order.status)
                            setOrderNote('')
                            setShowOrderModal(true)
                          }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium text-lg">{order.order_number}</div>
                            <div className={`w-3 h-3 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'} animate-pulse`} />
                            <span className="text-sm text-muted font-medium">{STATUS_LABELS[order.status]?.label || order.status}</span>
                          </div>
                          <div className="text-base text-muted">
                            {order.service_name} • {formatDate(order.created_at)}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => {
                              setSelectedOrder(order)
                              setNewStatus(order.status)
                              setOrderNote('')
                              setShowOrderModal(true)
                            }}
                            className="hover-lift"
                          >
                            Ver detalles
                          </Button>
                          {userRole === 'owner' && (
                            <Button
                              variant="destructive"
                              size="md"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="hover-lift"
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted text-lg">No hay pedidos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <Card className="glass-card hover-glow animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl">Servicios</CardTitle>
                <CardDescription className="text-base">Gestión de servicios del catálogo</CardDescription>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="space-y-4">
                    {services.map((service, index) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl hover:border-primary/50 transition-all hover-lift glass-card animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium text-lg">{service.name}</div>
                            {!service.is_active && (
                              <span className="text-xs bg-gray-500 text-white px-3 py-1 rounded-full">Inactivo</span>
                            )}
                            {service.is_featured && (
                              <span className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-full">Destacado</span>
                            )}
                          </div>
                          <div className="text-base text-muted">
                            {service.category} • ${service.price}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted text-lg">No hay servicios</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Negocio</CardTitle>
                  <CardDescription>Configura la información básica de tu negocio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nombre del negocio</label>
                      <input
                        type="text"
                        value="TheDulcanDesign"
                        disabled
                        className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-muted-foreground cursor-not-allowed"
                      />
                      <p className="text-xs text-muted mt-1">El nombre del negocio es fijo</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email de contacto</label>
                      <input
                        type="email"
                        defaultValue="thedulcandesign@gmail.com"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Teléfono</label>
                      <input
                        type="text"
                        placeholder="+1 234 567 890"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Dirección</label>
                      <input
                        type="text"
                        placeholder="Calle, Ciudad, País"
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Enlace de Discord</label>
                    <input
                      type="url"
                      defaultValue="https://discord.gg/DXkEXrYRvM"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button>Guardar cambios</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Redes Sociales</CardTitle>
                  <CardDescription>Configura los enlaces a tus redes sociales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Discord</label>
                    <input
                      type="url"
                      defaultValue="https://discord.gg/DXkEXrYRvM"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Twitter</label>
                    <input
                      type="url"
                      placeholder="https://twitter.com/tuusuario"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">YouTube</label>
                    <input
                      type="url"
                      placeholder="https://youtube.com/tucanal"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Instagram</label>
                    <input
                      type="url"
                      placeholder="https://instagram.com/tuusuario"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button>Guardar cambios</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Formulario de Contacto</CardTitle>
                  <CardDescription>Configura el formulario de contacto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Habilitar formulario</div>
                      <div className="text-sm text-muted">Permite que los usuarios envíen mensajes de contacto</div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Habilitar reCAPTCHA</div>
                      <div className="text-sm text-muted">Protege el formulario contra spam</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                  </div>
                  <Button>Guardar cambios</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Pagos</CardTitle>
                  <CardDescription>Configura los métodos de pago</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Moneda</label>
                    <select className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="USD">USD - Dólar Estadounidense</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="MXN">MXN - Peso Mexicano</option>
                      <option value="COP">COP - Peso Colombiano</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Habilitar PayPal</div>
                      <div className="text-sm text-muted">Acepta pagos con PayPal</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Habilitar Stripe</div>
                      <div className="text-sm text-muted">Acepta pagos con tarjetas de crédito</div>
                    </div>
                    <input type="checkbox" className="w-5 h-5" />
                  </div>
                  <Button>Guardar cambios</Button>
                </CardContent>
              </Card>



              <Card>
                <CardHeader>
                  <CardTitle>Integración con Discord</CardTitle>
                  <CardDescription>Configura la integración con tu bot de Discord</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">URL del Bot de Discord</label>
                    <input
                      type="url"
                      placeholder="http://localhost:5000/webhook"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Webhook Secret</label>
                    <input
                      type="password"
                      placeholder="Tu webhook secreto"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">ID del Canal de Notificaciones</label>
                    <input
                      type="text"
                      placeholder="ID del canal de Discord"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button>Guardar cambios</Button>
                    <Button variant="outline">Probar conexión</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-scale">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto glass-card hover-glow glowing-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl gradient-text-primary">Detalle del Pedido</CardTitle>
                <Button variant="outline" size="md" onClick={() => setShowOrderModal(false)} className="hover-lift">
                  Cerrar
                </Button>
              </div>
              <CardDescription className="text-base">{selectedOrder.order_number}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border/50 rounded-xl glass-card">
                    <div className="text-sm text-muted mb-1">Servicio</div>
                    <div className="font-medium text-lg">{selectedOrder.service_name}</div>
                  </div>
                  <div className="p-4 border border-border/50 rounded-xl glass-card">
                    <div className="text-sm text-muted mb-1">Estado actual</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${STATUS_LABELS[selectedOrder.status]?.color || 'bg-gray-500'} animate-pulse`} />
                      <span className="font-medium text-lg">{STATUS_LABELS[selectedOrder.status]?.label || selectedOrder.status}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border/50 rounded-xl glass-card">
                    <div className="text-sm text-muted mb-1">Cliente</div>
                    <div className="font-medium text-lg">{selectedOrder.client_name}</div>
                  </div>
                  <div className="p-4 border border-border/50 rounded-xl glass-card">
                    <div className="text-sm text-muted mb-1">Email</div>
                    <div className="font-medium text-lg">{selectedOrder.client_email}</div>
                  </div>
                </div>

                <div className="p-4 border border-border/50 rounded-xl glass-card">
                  <div className="text-sm text-muted mb-1">Descripción</div>
                  <div className="text-base">{selectedOrder.description}</div>
                </div>

                <div className="p-4 border border-border/50 rounded-xl glass-card">
                  <div className="text-sm text-muted mb-1">Fecha de creación</div>
                  <div className="font-medium text-lg">{formatDate(selectedOrder.created_at)}</div>
                </div>
              </div>

              {/* Status Change */}
              <div className="border-t border-border/50 pt-6">
                <div className="text-base font-medium mb-3">Cambiar estado</div>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="pending">Pendiente</option>
                  <option value="reviewing">Revisando</option>
                  <option value="in_progress">En proceso</option>
                  <option value="waiting_client">Esperando cliente</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <div className="text-base font-medium mb-3">Agregar nota</div>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Agrega una nota sobre este pedido..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  className="flex-1 hover-lift shimmer-button"
                  onClick={async () => {
                    try {
                      const supabase = createClient()
                      const { error } = await supabase
                        .from('orders')
                        .update({ status: newStatus })
                        .eq('id', selectedOrder.id)

                      if (error) throw error

                      // Reload orders
                      const { data: updatedOrders } = await supabase
                        .from('orders')
                        .select('*, services(name)')
                        .order('created_at', { ascending: false })

                      if (updatedOrders) {
                        setOrders(updatedOrders.map((order: any) => ({
                          id: order.id,
                          order_number: order.order_number,
                          user_id: order.user_id,
                          service_name: order.services?.name || 'Servicio desconocido',
                          status: order.status,
                          created_at: order.created_at,
                          client_name: order.client_name,
                          client_email: order.client_email,
                          description: order.description,
                        })))
                      }

                      setShowOrderModal(false)
                    } catch (error) {
                      console.error('Error al actualizar pedido:', error)
                    }
                  }}
                >
                  Guardar cambios
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOrderModal(false)}
                  className="hover-lift"
                >
                  Cancelar
                </Button>
                {userRole === 'owner' && (
                  <>
                    {deleteConfirm === selectedOrder.id ? (
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteOrder(selectedOrder.id)}
                        className="hover-lift"
                      >
                        Confirmar eliminación
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteConfirm(selectedOrder.id)}
                        className="hover-lift"
                      >
                        Eliminar pedido
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
      </div>
    </div>
  )
}
