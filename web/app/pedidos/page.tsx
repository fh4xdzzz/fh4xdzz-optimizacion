'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

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

  // Cargar pedidos del usuario desde Supabase
  const loadOrders = async () => {
    setLoading(true)
    try {
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
        .order('created_at', { ascending: false })

      if (error) throw error
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
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearchError('')
    setSearchResult(null)

    if (!orderNumber.trim()) {
      setSearchError('Ingresa un número de pedido')
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber.trim())
        .single()

      if (error) throw error
      if (!data) {
        setSearchError('Pedido no encontrado')
        return
      }

      setSearchResult(data)
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
          <Card>
            <CardHeader>
              <CardTitle>Consultar Pedido</CardTitle>
              <CardDescription>
                Ingresa el número de pedido para ver su estado
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
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {searchError && (
                  <p className="text-red-500 text-sm">{searchError}</p>
                )}
                <Button type="submit" variant="primary" className="w-full">
                  Consultar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Result */}
          {searchResult && (
            <Card className="mt-6 border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detalle del Pedido</CardTitle>
                  <div className="text-sm text-muted">{searchResult.order_number}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted mb-1">Servicio</div>
                      <div className="font-medium">{searchResult.service_name || 'ID: ' + searchResult.service_id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted mb-1">Precio</div>
                      <div className="font-medium">{formatPrice(searchResult.price)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted mb-1">Estado</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${STATUS_LABELS[searchResult.status]?.color || 'bg-gray-500'}`} />
                      <span className="font-medium">{STATUS_LABELS[searchResult.status]?.label || searchResult.status}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted mb-1">Fecha de creación</div>
                    <div className="font-medium">{formatDate(searchResult.created_at)}</div>
                  </div>

                  <div>
                    <div className="text-sm text-muted mb-1">Descripción</div>
                    <div className="text-sm text-muted">{searchResult.description}</div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="text-sm text-muted mb-2">Información de contacto</div>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-muted">Nombre:</span> {searchResult.client_name}</div>
                      <div><span className="text-muted">Email:</span> {searchResult.client_email}</div>
                      {searchResult.client_discord && (
                        <div><span className="text-muted">Discord:</span> {searchResult.client_discord}</div>
                      )}
                    </div>
                  </div>
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
              >
                {showAllOrders ? 'Ocultar todos los pedidos' : `Ver todos mis pedidos (${allOrders.length})`}
              </Button>
            </div>
          )}

          {/* All Orders List */}
          {showAllOrders && allOrders.length > 0 && (
            <div className="mt-6 space-y-4">
              {allOrders.map((order) => (
                <Card key={order.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="font-medium">{order.order_number}</div>
                          <div className={`w-2 h-2 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'}`} />
                          <span className="text-sm text-muted">{STATUS_LABELS[order.status]?.label || order.status}</span>
                        </div>
                        <div className="text-sm text-muted">{order.service_name || 'ID: ' + order.service_id}</div>
                        <div className="text-xs text-muted mt-1">{formatDate(order.created_at)}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOrderNumber(order.order_number)
                          setSearchResult(order)
                          setShowAllOrders(false)
                        }}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Orders */}
          {allOrders.length === 0 && (
            <Card className="mt-6">
              <CardContent className="p-8 text-center">
                <div className="text-muted mb-4">
                  No tienes pedidos aún. Crea tu primera solicitud de servicio.
                </div>
                <Button variant="primary" href="/contacto">
                  Crear Pedido
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
