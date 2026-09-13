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
  role: 'client' | 'admin' | 'staff'
  created_at: string
}

interface Order {
  id: string
  order_number: string
  user_id: string
  service_name: string
  status: string
  created_at: string
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
      setOrders(ordersData.map((order: { id: string; order_number: string; user_id: string; created_at: string; status: string; services: { name: string } | null }) => ({
        id: order.id,
        order_number: order.order_number,
        user_id: order.user_id,
        service_name: order.services?.name || 'Unknown',
        status: order.status,
        created_at: order.created_at,
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

      // Verificar si es admin
      if (session.user.role !== 'admin') {
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
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Panel de Administración</h1>
              <p className="text-muted">
                Gestiona usuarios, pedidos, servicios y configuraciones
                {isDemo && ' (Modo Demo)'}
              </p>
            </div>
          </div>

          {isDemo && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-2 rounded-lg text-sm mb-8">
              ⚠️ Modo demo activo - Funcionalidades limitadas
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-border pb-4">
            <Button
              variant={activeTab === 'overview' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('overview')}
            >
              Resumen
            </Button>
            <Button
              variant={activeTab === 'users' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('users')}
            >
              Usuarios ({users.length})
            </Button>
            <Button
              variant={activeTab === 'orders' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('orders')}
            >
              Pedidos ({orders.length})
            </Button>
            <Button
              variant={activeTab === 'services' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('services')}
            >
              Servicios ({services.length})
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('settings')}
            >
              Configuración
            </Button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{users.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{orders.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pedidos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">
                    {orders.filter((order) => order.status === 'pending').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Servicios Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {services.filter((service) => service.is_active).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card>
              <CardHeader>
                <CardTitle>Usuarios Registrados</CardTitle>
                <CardDescription>Gestión de usuarios y roles</CardDescription>
              </CardHeader>
              <CardContent>
                {users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium">{user.email}</div>
                            <div className={`w-2 h-2 rounded-full ${ROLE_LABELS[user.role]?.color || 'bg-gray-500'}`} />
                            <span className="text-sm text-muted">{ROLE_LABELS[user.role]?.label || user.role}</span>
                          </div>
                          <div className="text-sm text-muted">
                            {user.full_name || 'Sin nombre'} • {formatDate(user.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted">No hay usuarios registrados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <Card>
              <CardHeader>
                <CardTitle>Todos los Pedidos</CardTitle>
                <CardDescription>Gestión de pedidos de todos los usuarios</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium">{order.order_number}</div>
                            <div className={`w-2 h-2 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'}`} />
                            <span className="text-sm text-muted">{STATUS_LABELS[order.status]?.label || order.status}</span>
                          </div>
                          <div className="text-sm text-muted">
                            {order.service_name} • {formatDate(order.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted">No hay pedidos</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <Card>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
                <CardDescription>Gestión de servicios del catálogo</CardDescription>
              </CardHeader>
              <CardContent>
                {services.length > 0 ? (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium">{service.name}</div>
                            {!service.is_active && (
                              <span className="text-xs bg-gray-500 text-white px-2 py-1 rounded">Inactivo</span>
                            )}
                            {service.is_featured && (
                              <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">Destacado</span>
                            )}
                          </div>
                          <div className="text-sm text-muted">
                            {service.category} • ${service.price}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted">No hay servicios</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>Configuración general del negocio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted mb-4">
                    La configuración de administración está en desarrollo
                  </p>
                  <p className="text-sm text-muted">
                    Usa el Supabase Dashboard para configuración avanzada
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
