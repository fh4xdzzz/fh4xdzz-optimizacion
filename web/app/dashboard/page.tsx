'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import DashboardNavigation from '@/components/dashboard-navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, isDemoMode } from '@/lib/auth-hybrid'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  order_number: string
  service_name: string
  status: string
  created_at: string
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
  const [session, setSession] = useState<{ user: { full_name?: string; email: string; id: string } } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const isDemo = isDemoMode()
  const supabase = useMemo(() => createClient(), [])

  // CAMBIO CRÍTICO: Envolver loadOrders en useCallback
  const loadOrders = useCallback(async (userId: string) => {
    if (!userId) {
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, services(name)')
      .eq('user_id', userId)
      .neq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      setOrders([])
    } else {
      const rows = (data || []) as unknown as (Omit<Order, 'service_name'> & { services: { name: string } | { name: string }[] | null })[]
      const ordersMapped = rows.map(order => ({
        id: order.id,
        order_number: order.order_number,
        service_name: (Array.isArray(order.services) ? order.services[0]?.name : order.services?.name) || 'Servicio desconocido',
        status: order.status,
        created_at: order.created_at,
      }))
      setOrders(ordersMapped)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/auth/login?redirect=/dashboard')
        return
      }

      setSession(session)

      // Limpiar localStorage para evitar datos mezclados
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orders')
      }

      await loadOrders(session.user.id)
      setLoading(false)
    }

    loadData()
  }, [router, loadOrders])

  // Suscribirse a cambios en tiempo real para pedidos del cliente
  useEffect(() => {
    if (!session?.user?.id || isDemo) {
      return
    }

    const channel = supabase
      .channel('client-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        loadOrders(session.user.id)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${session.user.id}`
      }, (payload) => {
        // Recargar si cambia deleted_at (soft delete)
        if (payload.new?.deleted_at !== payload.old?.deleted_at) {
          loadOrders(session.user.id)
        } else {
          loadOrders(session.user.id)
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        // Filtrar en el cliente usando el payload.old
        // Esto es necesario porque REPLICA IDENTITY puede no incluir user_id
        if (payload.old?.user_id === session.user.id) {
          loadOrders(session.user.id)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id, isDemo, loadOrders, supabase])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
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
          <div className="mx-auto w-full text-center">
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
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Bienvenido, {session?.user?.full_name || session?.user?.email}
              </h1>
              <p className="text-muted">
                Gestiona tus pedidos, entregas y keys desde un solo lugar.
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

          <DashboardNavigation />

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
                <Button variant="outline" size="sm" href="/dashboard/pedidos">
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
                      className="flex items-center justify-between p-4 border border-border rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium">{order.order_number}</div>
                          <div className={`w-2 h-2 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'}`} />
                          <span className="text-sm text-muted">{STATUS_LABELS[order.status]?.label || order.status}</span>
                        </div>
                        <div className="text-sm text-muted">{order.service_name}</div>
                        <div className="text-xs text-muted mt-1">{formatDate(order.created_at)}</div>
                      </div>
                      <Button variant="outline" size="sm" href="/dashboard/pedidos">
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
