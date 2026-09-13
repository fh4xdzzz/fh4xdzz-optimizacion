'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, isDemoMode } from '@/lib/auth-hybrid'
import { getOrders, isSupabaseConfigured as isOrdersSupabaseConfigured } from '@/lib/orders'

interface Order {
  id: string
  orderNumber: string
  service: string
  status: string
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500' },
  reviewing: { label: 'Revisando', color: 'bg-blue-500' },
  in_progress: { label: 'En proceso', color: 'bg-purple-500' },
  waiting_client: { label: 'Esperando cliente', color: 'bg-orange-500' },
  completed: { label: 'Completado', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
}

export default function DashboardPage() {
  const [session, setSession] = useState<{ user: { full_name?: string; email: string } } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const isDemo = isDemoMode()

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/auth/login?redirect=/dashboard')
        return
      }

      setSession(session)

      // Cargar pedidos según configuración
      if (isOrdersSupabaseConfigured()) {
        // Si Supabase está configurado para pedidos, cargar de ahí
        // Por ahora usamos localStorage hasta que implementemos la integración completa
        const localOrders = getOrders()
        setOrders(localOrders)
      } else {
        // Sistema demo con localStorage
        const localOrders = getOrders()
        setOrders(localOrders)
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando dashboard...</p>
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
              <h1 className="text-4xl font-bold mb-2">
                Bienvenido, {session?.user?.full_name || session?.user?.email}
              </h1>
              <p className="text-muted">
                Gestiona tus servicios y solicitudes
                {isDemo && ' (Modo Demo)'}
              </p>
            </div>
            <Button variant="primary" href="/contacto">
              + Nuevo Pedido
            </Button>
          </div>

          {isDemo && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-2 rounded-lg text-sm mb-8">
              ⚠️ Modo demo activo - Usando localStorage (no es autenticación real)
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <CardTitle className="text-lg">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500">
                  {orders.filter((order: Order) => order.status === 'pending').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">En Proceso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">
                  {orders.filter((order: Order) => order.status === 'in_progress').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {orders.filter((order: Order) => order.status === 'completed').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pedidos Recientes</CardTitle>
                <Button variant="outline" size="sm" href="/pedidos">
                  Ver Todos
                </Button>
              </div>
              <CardDescription>
                Tus últimas solicitudes de servicio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order: Order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium">{order.orderNumber}</div>
                          <div className={`w-2 h-2 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'}`} />
                          <span className="text-sm text-muted">{STATUS_LABELS[order.status]?.label || order.status}</span>
                        </div>
                        <div className="text-sm text-muted">{order.service}</div>
                        <div className="text-xs text-muted mt-1">{formatDate(order.createdAt)}</div>
                      </div>
                      <Button variant="outline" size="sm" href="/pedidos">
                        Ver Detalles
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted mb-4">
                    No tienes pedidos aún. Crea tu primera solicitud de servicio.
                  </p>
                  <Button variant="primary" href="/contacto">
                    Crear Pedido
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  )
}