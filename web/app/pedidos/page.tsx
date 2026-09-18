'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { useNotificationStore } from '@/lib/notifications-store'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500' },
  reviewing: { label: 'Revisando', color: 'bg-blue-500' },
  in_progress: { label: 'En proceso', color: 'bg-purple-500' },
  waiting_client: { label: 'Esperando cliente', color: 'bg-orange-500' },
  completed: { label: 'Completado', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
}

interface Order {
  id: string
  order_number: string
  service_id: string
  service_name?: string
  client_name: string
  client_email: string
  client_discord?: string
  description: string
  price: number
  status: string
  created_at: string
}

export default function OrdersPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [searchResult, setSearchResult] = useState<Order | null>(null)
  const [searchError, setSearchError] = useState('')
  const [showAllOrders, setShowAllOrders] = useState(false)
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const { success: notifySuccess, error: notifyError, warning: notifyWarning, info: notifyInfo } = useNotificationStore()
  const supabase = createClient()

  // Cargar pedidos del usuario desde Supabase
  const loadOrders = async () => {
    setLoading(true)
    try {
      // Limpiar localStorage para evitar datos mezclados
      if (typeof window !== 'undefined') {
        localStorage.removeItem('orders')
      }

      const session = await getSession()
      if (!session) {
        setAllOrders([])
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(name)')
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Pedidos cargados desde Supabase:', data)
      // Añadir service_name a cada pedido
      const ordersWithServiceName = (data || []).map((order: any) => ({
        ...order,
        service_name: order.services?.name || 'Servicio desconocido'
      }))
      setAllOrders(ordersWithServiceName)
    } catch (error) {
      console.error('Error al cargar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    checkUserRole()
  }, [])

  // Suscribirse a cambios en tiempo real de pedidos
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('Order status changed:', payload)
        const updatedOrder = payload.new as Order
        
        // Verificar si el pedido pertenece al usuario actual
        if (allOrders.some(order => order.id === updatedOrder.id)) {
          // Notificar cambio de estado
          const oldStatus = payload.old.status
          const newStatus = updatedOrder.status
          
          if (oldStatus !== newStatus) {
            const statusLabel = STATUS_LABELS[newStatus]?.label || newStatus
            notifyInfo(`El pedido ${updatedOrder.order_number} cambió a: ${statusLabel}`)
          }
          
          // Recargar pedidos
          loadOrders()
        }
      })
      .subscribe((status) => {
        console.log('Orders Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [allOrders, notifyInfo])

  const checkUserRole = async () => {
    try {
      const session = await getSession()
      if (session?.user?.role === 'owner') {
        setUserRole('owner')
      }
    } catch (error) {
      console.error('Error checking user role:', error)
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const session = await getSession()
      if (!session) {
        notifyWarning('Debes iniciar sesión para eliminar pedidos')
        return
      }

      if (session.user.role !== 'owner') {
        notifyWarning('Solo el owner puede eliminar pedidos')
        return
      }

      // Importar la función de eliminación
      const { deleteSupabaseOrder } = await import('@/lib/supabase/orders')

      await deleteSupabaseOrder(orderId, session.user.id, session.user.role)

      // Recargar pedidos
      if (searchResult?.id === orderId) {
        setSearchResult(null)
      }
      loadOrders()
      setDeleteConfirm(null)
      setOrderToDelete(null)
      setShowDeleteModal(false)
      notifySuccess('Pedido eliminado exitosamente')
    } catch (error) {
      console.error('Error al eliminar pedido:', error)
      notifyError('Error al eliminar pedido: ' + (error as Error).message)
    }
  }

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId)
    setShowDeleteModal(true)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearchError('')
    setSearchResult(null)

    if (!orderNumber.trim()) {
      setSearchError('Ingresa un número de pedido')
      return
    }

    try {
      const session = await getSession()
      if (!session) {
        setSearchError('Debes iniciar sesión para buscar pedidos')
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(name)')
        .eq('order_number', orderNumber.trim())
        .eq('user_id', session.user.id)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      if (!data) {
        setSearchError('Pedido no encontrado')
        return
      }

      const orderWithServiceName = {
        ...data,
        service_name: data.services?.name || 'Servicio desconocido'
      }
      console.log('Pedido encontrado:', orderWithServiceName)
      setSearchResult(orderWithServiceName)
    } catch (error) {
      console.error('Error al buscar pedido:', error)
      setSearchError('Error al buscar pedido')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Mis Pedidos</h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Consulta el estado de tus solicitudes de servicio
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-blue-900/10">
            <CardHeader>
              <CardTitle className="text-2xl">Consultar Pedido</CardTitle>
              <CardDescription>
                Ingresa el número de pedido para ver su estado actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Número de pedido (ej: ORD202409120001)"
                    className="w-full px-4 py-3 rounded-lg border border-purple-500/30 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
                {searchError && (
                  <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-2">{searchError}</p>
                )}
                <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all">
                  Consultar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Result */}
          {searchResult && (
            <Card className="mt-6 border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Detalle del Pedido</CardTitle>
                  <div className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                    {searchResult.order_number}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/50 p-3 rounded-lg border border-purple-500/20">
                      <div className="text-sm text-muted mb-1">Servicio</div>
                      <div className="font-medium text-foreground">{searchResult.service_name || 'ID: ' + searchResult.service_id}</div>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg border border-purple-500/20">
                      <div className="text-sm text-muted mb-1">Precio</div>
                      <div className="font-medium text-green-400 text-lg">{formatPrice(searchResult.price)}</div>
                    </div>
                  </div>

                  <div className="bg-background/50 p-3 rounded-lg border border-purple-500/20">
                    <div className="text-sm text-muted mb-1">Estado</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${STATUS_LABELS[searchResult.status]?.color || 'bg-gray-500'} animate-pulse`} />
                      <span className="font-medium text-foreground">{STATUS_LABELS[searchResult.status]?.label || searchResult.status}</span>
                    </div>
                  </div>

                  <div className="bg-background/50 p-3 rounded-lg border border-purple-500/20">
                    <div className="text-sm text-muted mb-1">Fecha de creación</div>
                    <div className="font-medium text-foreground">{formatDate(searchResult.created_at)}</div>
                  </div>

                  <div className="bg-background/50 p-3 rounded-lg border border-purple-500/20">
                    <div className="text-sm text-muted mb-1">Descripción</div>
                    <div className="text-sm text-muted">{searchResult.description}</div>
                  </div>

                  <div className="pt-4 border-t border-purple-500/20">
                    <div className="text-sm text-muted mb-2">Información de contacto</div>
                    <div className="space-y-1 text-sm bg-background/30 p-3 rounded-lg">
                      <div><span className="text-muted">Nombre:</span> {searchResult.client_name}</div>
                      <div><span className="text-muted">Email:</span> {searchResult.client_email}</div>
                      {searchResult.client_discord && (
                        <div><span className="text-muted">Discord:</span> {searchResult.client_discord}</div>
                      )}
                    </div>
                  </div>

                  {/* Botón de eliminar - solo para owner */}
                  {userRole === 'owner' && (
                    <div className="pt-4 border-t border-purple-500/20">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(searchResult.id)}
                      >
                        Eliminar pedido
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Orders Toggle */}
          {allOrders.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAllOrders(!showAllOrders)}
                className="border-purple-500/30 text-purple-300 transition-all"
              >
                {showAllOrders ? 'Ocultar todos los pedidos' : `Ver todos mis pedidos (${allOrders.length})`}
              </Button>
            </div>
          )}

          {/* All Orders List */}
          {showAllOrders && allOrders.length > 0 && (
            <div className="mt-6 space-y-4">
              {allOrders.map((order) => (
                <Card key={order.id} className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-blue-900/10 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium text-foreground">{order.order_number}</div>
                          <div className={`w-2 h-2 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'} animate-pulse`} />
                          <span className="text-sm text-purple-300">{STATUS_LABELS[order.status]?.label || order.status}</span>
                        </div>
                        <div className="text-sm text-muted">{order.service_name || 'ID: ' + order.service_id}</div>
                        <div className="text-xs text-muted mt-1">{formatDate(order.created_at)}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOrderNumber(order.order_number)
                            setSearchResult(order)
                            setShowAllOrders(false)
                          }}
                          className="border-purple-500/30 text-purple-300 transition-all"
                        >
                          Ver detalles
                        </Button>
                        {userRole === 'owner' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(order.id)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Orders */}
          {allOrders.length === 0 && (
            <Card className="mt-6 border-2 border-dashed border-purple-500/30 bg-gradient-to-br from-purple-900/5 to-blue-900/5">
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <div className="text-muted mb-4 text-lg">
                  No tienes pedidos aún. Crea tu primera solicitud de servicio.
                </div>
                <Button variant="primary" href="/contacto" className="bg-gradient-to-r from-purple-600 to-blue-600 transition-all">
                  Crear Pedido
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setOrderToDelete(null)
        }}
        onConfirm={() => orderToDelete && handleDeleteOrder(orderToDelete)}
        title="Eliminar Pedido"
        description="¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />

      <Footer />
    </div>
  )
}
