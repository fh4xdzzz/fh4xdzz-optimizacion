'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { getSession, isDemoMode } from '@/lib/auth-hybrid'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/notifications-store'

interface User {
  id: string
  email: string
  full_name?: string
  role: 'client' | 'admin' | 'staff' | 'owner'
  created_at: string
  online?: boolean
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

interface ChatSession {
  id: string
  conversation_number: string
  status: string
  priority: string
  assigned_agent_id: string | null
  subject: string
  created_at: string
  client_id: string
  client_name?: string
  client_email?: string
}

interface ChatMessage {
  id: string
  session_id: string
  sender_id: string
  sender_role: string
  message: string
  message_type: string
  created_at: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'services' | 'support' | 'history' | 'settings'>('overview')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [userRole, setUserRole] = useState<'client' | 'admin' | 'staff' | 'owner'>('client')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  
  // Support tab filters and search
  const [supportFilter, setSupportFilter] = useState<'all' | 'active' | 'waiting' | 'closed'>('all')
  const [supportSearch, setSupportSearch] = useState('')
  const [supportSort, setSupportSort] = useState<'date' | 'status' | 'number'>('date')
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({})
  const router = useRouter()
  const isDemo = isDemoMode()
  const { success: notifySuccess, error: notifyError, warning: notifyWarning, info: notifyInfo } = useNotificationStore()
  const supabase = createClient()

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
      .is('deleted_at', null)
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

    // Cargar sesiones de chat (todas, filtrar en código)
    console.log('Loading all chat sessions...')
    const { data: allSessions, error: allError } = await supabase
      .from('chat_sessions')
      .select('*, users!chat_sessions_client_id_fkey(email, full_name)')
      .order('created_at', { ascending: false })

    if (allError) {
      console.error('Error loading all chat sessions:', allError)
    } else {
      console.log('All sessions loaded:', allSessions?.length || 0)
      console.log('All session statuses:', allSessions?.map((s: any) => s.status))
    }

    // Filtrar en código: solo no-closed para support tab
    const activeSessions = allSessions?.filter((s: any) => s.status !== 'closed') || []
    const closedSessions = allSessions?.filter((s: any) => s.status === 'closed') || []

    console.log('Active sessions (after filter):', activeSessions.length)
    console.log('Closed sessions (after filter):', closedSessions.length)

    setChatSessions(activeSessions.map((session: any) => ({
      id: session.id,
      conversation_number: session.conversation_number,
      status: session.status,
      priority: session.priority,
      assigned_agent_id: session.assigned_agent_id,
      subject: session.subject,
      created_at: session.created_at,
      client_id: session.client_id,
      client_name: session.users?.full_name || session.users?.email || 'Cliente',
      client_email: session.users?.email || '',
    })))

    setChatHistory(closedSessions.map((session: any) => ({
      id: session.id,
      conversation_number: session.conversation_number,
      status: session.status,
      priority: session.priority,
      assigned_agent_id: session.assigned_agent_id,
      subject: session.subject,
      created_at: session.created_at,
      client_id: session.client_id,
      client_name: session.users?.full_name || session.users?.email || 'Cliente',
      client_email: session.users?.email || '',
    })))

    // Cargar últimos mensajes para sesiones activas
    if (activeSessions.length > 0) {
      const mappedSessions = activeSessions.map((session: any) => ({
        id: session.id,
        conversation_number: session.conversation_number,
        status: session.status,
        priority: session.priority,
        assigned_agent_id: session.assigned_agent_id,
        subject: session.subject,
        created_at: session.created_at,
        client_id: session.client_id,
        client_name: session.users?.full_name || session.users?.email || 'Cliente',
        client_email: session.users?.email || '',
      }))
      await loadLastMessages(mappedSessions)
    }


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

  // Suscribirse a cambios en tiempo real para chat sessions
  useEffect(() => {
    if (isDemo) return

    console.log('Setting up Realtime for chat sessions')

    const channel = supabase
      .channel('admin-chat-sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions'
      }, () => {
        console.log('Chat sessions changed, reloading...')
        loadAdminData()
      })
      .subscribe((status) => {
        console.log('Chat sessions Realtime status:', status)
      })

    return () => {
      console.log('Cleaning up chat sessions Realtime')
      supabase.removeChannel(channel)
    }
  }, [isDemo])

  // Suscribirse a cambios en tiempo real para usuarios
  useEffect(() => {
    if (isDemo) return

    console.log('Setting up Realtime for users')

    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        console.log('Users changed, reloading...')
        loadAdminData()
      })
      .subscribe((status) => {
        console.log('Users Realtime status:', status)
      })

    return () => {
      console.log('Cleaning up users Realtime')
      supabase.removeChannel(channel)
    }
  }, [isDemo])

  // Suscribirse a cambios en tiempo real para pedidos
  useEffect(() => {
    if (isDemo) return

    console.log('Setting up Realtime for orders')

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('Orders changed, payload:', payload)
        
        // Recargar si cambia deleted_at (soft delete)
        if (payload.eventType === 'UPDATE' && payload.new?.deleted_at !== payload.old?.deleted_at) {
          console.log('Order deleted_at changed, reloading...')
          loadAdminData()
        } else {
          console.log('Orders changed, reloading...')
          loadAdminData()
        }
      })
      .subscribe((status) => {
        console.log('Orders Realtime status:', status)
      })

    return () => {
      console.log('Cleaning up orders Realtime')
      supabase.removeChannel(channel)
    }
  }, [isDemo])

  // Suscribirse a cambios en tiempo real para servicios
  useEffect(() => {
    if (isDemo) return

    console.log('Setting up Realtime for services')

    const channel = supabase
      .channel('admin-services')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'services'
      }, () => {
        console.log('Services changed, reloading...')
        loadAdminData()
      })
      .subscribe((status) => {
        console.log('Services Realtime status:', status)
      })

    return () => {
      console.log('Cleaning up services Realtime')
      supabase.removeChannel(channel)
    }
  }, [isDemo])

  // Suscribirse a cambios en tiempo real para chat messages
  useEffect(() => {
    if (!selectedChat || isDemo) return

    console.log('Setting up Realtime for chat messages:', selectedChat.id)

    const channel = supabase
      .channel(`admin-chat-messages-${selectedChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${selectedChat.id}`
      }, () => {
        console.log('New message received, reloading...')
        loadChatMessages(selectedChat.id)
      })
      .subscribe((status) => {
        console.log('Chat messages Realtime status:', status)
      })

    return () => {
      console.log('Cleaning up chat messages Realtime')
      supabase.removeChannel(channel)
    }
  }, [selectedChat?.id, isDemo])

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
        notifyWarning('Solo el owner puede eliminar pedidos')
        return
      }

      // Importar la función de eliminación
      const { deleteSupabaseOrder } = await import('@/lib/supabase/orders')

      const session = await getSession()
      if (!session) {
        notifyWarning('Debes iniciar sesión para eliminar pedidos')
        return
      }

      await deleteSupabaseOrder(orderId, session.user.id, session.user.role || 'client')

      // Recargar pedidos
      await loadAdminData()
      setDeleteConfirm(null)
      setShowOrderModal(false)
      setSelectedOrder(null)
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

  const toggleFeatured = async (serviceId: string, currentFeatured: boolean) => {
    try {
      if (userRole !== 'owner') {
        notifyWarning('Solo el owner puede cambiar servicios destacados')
        return
      }

      const { error } = await supabase
        .from('services')
        .update({ is_featured: !currentFeatured })
        .eq('id', serviceId)

      if (error) throw error

      await loadAdminData()
      notifySuccess(currentFeatured ? 'Servicio quitado de destacados' : 'Servicio marcado como destacado')
    } catch (error) {
      console.error('Error al cambiar destacado:', error)
      notifyError('Error al cambiar destacado: ' + (error as Error).message)
    }
  }

  const loadChatMessages = async (sessionId: string) => {
    const supabase = createClient()
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (messagesData) {
      setChatMessages(messagesData)
    }
  }

  const loadLastMessages = async (sessions: ChatSession[]) => {
    const supabase = createClient()
    const lastMessagesMap: Record<string, ChatMessage> = {}
    
    for (const session of sessions) {
      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (lastMessage && lastMessage.length > 0) {
        lastMessagesMap[session.id] = lastMessage[0]
      }
    }
    
    setLastMessages(lastMessagesMap)
  }

  const handleClaimChat = async (sessionId: string) => {
    try {
      const session = await getSession()
      if (!session) return

      const response = await fetch('/api/chat/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (response.ok) {
        await loadAdminData()
        notifySuccess('Chat reclamado exitosamente')
      }
    } catch (error) {
      console.error('Error al reclamar chat:', error)
      notifyError('Error al reclamar chat')
    }
  }

  const handleCloseChat = async (sessionId: string) => {
    try {
      const session = await getSession()
      if (!session) return

      console.log('Closing chat:', sessionId)

      const response = await fetch('/api/chat/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Chat closed successfully:', data.session.status)
        
        // Recargar datos para actualizar las listas
        await loadAdminData()
        
        // Limpiar selección
        setSelectedChat(null)
        setChatMessages([])
        
        notifySuccess('Chat cerrado exitosamente')
      } else {
        const errorData = await response.json()
        console.error('Error closing chat:', errorData)
        notifyError('Error al cerrar chat: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error al cerrar chat:', error)
      notifyError('Error al cerrar chat')
    }
  }

  const handleSendChatMessage = async (message: string) => {
    if (!selectedChat || !message.trim()) return

    // Verificar si el chat está cerrado
    if (selectedChat.status === 'closed') {
      notifyWarning('No puedes enviar mensajes en chats cerrados. Por favor, selecciona un chat activo.')
      return
    }

    try {
      const session = await getSession()
      if (!session) return

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedChat.id,
          message: message.trim(),
          message_type: 'text'
        })
      })

      if (response.ok) {
        await loadChatMessages(selectedChat.id)
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
      notifyError('Error al enviar mensaje')
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

  const CHAT_STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
    active: { label: 'Activo', color: 'bg-green-500', bgColor: 'bg-green-500/10' },
    waiting: { label: 'Esperando', color: 'bg-yellow-500', bgColor: 'bg-yellow-500/10' },
    closed: { label: 'Cerrado', color: 'bg-gray-500', bgColor: 'bg-gray-500/10' },
  }

  // Filtrar, buscar y ordenar sesiones de chat
  const getFilteredAndSortedSessions = () => {
    let filtered = [...chatSessions]
    
    // Filtrar por estado
    if (supportFilter !== 'all') {
      filtered = filtered.filter(s => s.status === supportFilter)
    }
    
    // Buscar por número de conversación, nombre o email
    if (supportSearch.trim()) {
      const searchLower = supportSearch.toLowerCase()
      filtered = filtered.filter(s => 
        s.conversation_number.toLowerCase().includes(searchLower) ||
        (s.client_name || '').toLowerCase().includes(searchLower) ||
        (s.client_email || '').toLowerCase().includes(searchLower)
      )
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      if (supportSort === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      } else if (supportSort === 'status') {
        const statusOrder = { waiting: 0, active: 1, closed: 2 }
        return (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3)
      } else if (supportSort === 'number') {
        return a.conversation_number.localeCompare(b.conversation_number, undefined, { numeric: true })
      }
      return 0
    })
    
    return filtered
  }

  const getTimeSinceLastMessage = (sessionId: string) => {
    const lastMsg = lastMessages[sessionId]
    if (!lastMsg) return null
    
    const now = new Date()
    const lastMsgTime = new Date(lastMsg.created_at)
    const diffMs = now.getTime() - lastMsgTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const getUnreadCount = (sessionId: string) => {
    // En una implementación real, esto se calcularía basándose en mensajes no leídos
    // Por ahora, devolvemos 0 o podríamos implementar lógica de lectura
    return 0
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
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Resumen
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('users')}
            >
              Usuarios ({users.length})
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Pedidos ({orders.length})
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('services')}
            >
              Servicios ({services.length})
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('support')}
            >
              Soporte
            </button>
            <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Historial ({chatHistory.length})
            </button>
            {(userRole === 'owner') && (
              <button
                className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-primary text-white'
                    : 'border border-border bg-transparent'
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
              <Card className="cursor-pointer transition-all glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }} onClick={() => setActiveTab('users')}>
                <CardHeader>
                  <CardTitle className="text-xl mb-2">Total Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold gradient-text-primary">{users.length}</div>
                  <p className="text-sm text-muted mt-2">Usuarios registrados</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-all glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }} onClick={() => setActiveTab('orders')}>
                <CardHeader>
                  <CardTitle className="text-xl mb-2">Total Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold gradient-text-secondary">{orders.length}</div>
                  <p className="text-sm text-muted mt-2">Pedidos totales</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-all glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }} onClick={() => setActiveTab('orders')}>
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

              <Card className="cursor-pointer transition-all glass-card animate-fade-in-up" style={{ animationDelay: '0.4s' }} onClick={() => setActiveTab('services')}>
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
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up"
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
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up"
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
                              onClick={() => handleDeleteClick(order.id)}
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
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up"
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
                        <div className="flex gap-2">
                          {userRole === 'owner' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFeatured(service.id, service.is_featured)}
                            >
                              {service.is_featured ? 'Quitar destacado' : 'Marcar destacado'}
                            </Button>
                          )}
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

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <Card className="glass-card hover-glow animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="text-2xl">Panel de Soporte</CardTitle>
                  <CardDescription className="text-base">Gestión de chats de soporte en tiempo real</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-xl">
                      <div className="text-sm text-yellow-500 mb-1">Chats esperando</div>
                      <div className="text-2xl font-bold text-yellow-500">
                        {chatSessions.filter(s => s.status === 'waiting').length}
                      </div>
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-xl">
                      <div className="text-sm text-green-500 mb-1">Chats activos</div>
                      <div className="text-2xl font-bold text-green-500">
                        {chatSessions.filter(s => s.status === 'active').length}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl">
                      <div className="text-sm text-blue-500 mb-1">Total chats</div>
                      <div className="text-2xl font-bold text-blue-500">
                        {chatSessions.length}
                      </div>
                    </div>
                    <div className="p-4 bg-purple-500/10 border border-purple-500/50 rounded-xl">
                      <div className="text-sm text-purple-500 mb-1">Agentes online</div>
                      <div className="text-2xl font-bold text-purple-500">
                        {users.filter(u => (u.role === 'admin' || u.role === 'staff' || u.role === 'owner') && u.online).length}
                      </div>
                    </div>
                  </div>

                  {/* Filters and Search */}
                  <div className="mb-6 space-y-4">
                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSupportFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          supportFilter === 'all'
                            ? 'bg-primary text-white'
                            : 'border border-border bg-transparent text-muted-foreground'
                        }`}
                      >
                        Todos ({chatSessions.length})
                      </button>
                      <button
                        onClick={() => setSupportFilter('active')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          supportFilter === 'active'
                            ? 'bg-green-500 text-white'
                            : 'border border-border bg-transparent text-muted-foreground'
                        }`}
                      >
                        Activos ({chatSessions.filter(s => s.status === 'active').length})
                      </button>
                      <button
                        onClick={() => setSupportFilter('waiting')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          supportFilter === 'waiting'
                            ? 'bg-yellow-500 text-white'
                            : 'border border-border bg-transparent text-muted-foreground'
                        }`}
                      >
                        Esperando ({chatSessions.filter(s => s.status === 'waiting').length})
                      </button>
                      <button
                        onClick={() => setSupportFilter('closed')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          supportFilter === 'closed'
                            ? 'bg-gray-500 text-white'
                            : 'border border-border bg-transparent text-muted-foreground'
                        }`}
                      >
                        Cerrados ({chatSessions.filter(s => s.status === 'closed').length})
                      </button>
                    </div>

                    {/* Search and Sort */}
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Buscar por número, nombre o email..."
                        value={supportSearch}
                        onChange={(e) => setSupportSearch(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <select
                        value={supportSort}
                        onChange={(e) => setSupportSort(e.target.value as 'date' | 'status' | 'number')}
                        className="px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="date">Ordenar por fecha</option>
                        <option value="status">Ordenar por estado</option>
                        <option value="number">Ordenar por número</option>
                      </select>
                    </div>
                  </div>

                  {selectedChat ? (
                    <div className="border border-border/50 rounded-xl overflow-hidden">
                      <div className="p-4 bg-[#1a1a1a] border-b border-[#333333] flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-[#ededed]">{selectedChat.client_name}</h3>
                          <p className="text-sm text-[#6b7280]">{selectedChat.client_email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedChat(null)}
                            className="px-4 py-2 bg-[#333333] text-[#ededed] rounded-lg transition-colors"
                          >
                            Volver
                          </button>
                          <button
                            onClick={() => handleCloseChat(selectedChat.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg transition-colors"
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                      <div className="h-[400px] overflow-auto p-4 space-y-3 bg-[#0a0a0a]">
                        {chatMessages.map((message) => {
                          const isClient = message.sender_role === 'client'
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-2xl p-3 ${
                                  isClient
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                    : 'bg-[#1a1a1a] border border-[#333333] text-[#ededed]'
                                }`}
                              >
                                <p className="text-sm">{message.message}</p>
                                <p className={`text-xs mt-1 ${isClient ? 'text-white/80' : 'text-[#6b7280]'}`}>
                                  {new Date(message.created_at).toLocaleTimeString('es-ES')}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="p-4 bg-[#1a1a1a] border-t border-[#333333]">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            const form = e.target as HTMLFormElement
                            const input = form.elements.namedItem('message') as HTMLInputElement
                            handleSendChatMessage(input.value)
                            input.value = ''
                          }}
                          className="flex gap-2"
                        >
                          <input
                            name="message"
                            type="text"
                            placeholder="Escribe tu respuesta..."
                            className="flex-1 px-4 py-2 bg-[#0a0a0a] rounded-lg text-[#ededed] border border-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg transition-opacity"
                          >
                            Enviar
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {getFilteredAndSortedSessions().length > 0 ? (
                        <>
                          {/* Active Sessions Group */}
                          {getFilteredAndSortedSessions().filter(s => s.status === 'active').length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                Chats Activos ({getFilteredAndSortedSessions().filter(s => s.status === 'active').length})
                              </h3>
                              <div className="space-y-3">
                                {getFilteredAndSortedSessions()
                                  .filter(s => s.status === 'active')
                                  .map((chat, index) => (
                                    <div
                                      key={chat.id}
                                      className="p-5 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up cursor-pointer hover:border-green-500/50"
                                      style={{ animationDelay: `${index * 0.05}s` }}
                                      onClick={() => {
                                        setSelectedChat(chat)
                                        loadChatMessages(chat.id)
                                      }}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="font-medium text-lg text-[#ededed]">{chat.client_name}</div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${CHAT_STATUS_LABELS[chat.status]?.bgColor} ${CHAT_STATUS_LABELS[chat.status]?.color}`}>
                                              {CHAT_STATUS_LABELS[chat.status]?.label || chat.status}
                                            </div>
                                            {getUnreadCount(chat.id) > 0 && (
                                              <div className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                                                {getUnreadCount(chat.id)}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-sm text-[#6b7280] mb-2">
                                            {chat.client_email}
                                          </div>
                                          <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                                            <span className="text-muted-foreground">#{chat.conversation_number}</span>
                                            <span>•</span>
                                            <span>{formatDate(chat.created_at)}</span>
                                            {getTimeSinceLastMessage(chat.id) && (
                                              <>
                                                <span>•</span>
                                                <span className="text-blue-400">Última actividad: {getTimeSinceLastMessage(chat.id)}</span>
                                              </>
                                            )}
                                          </div>
                                          {lastMessages[chat.id] && (
                                            <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg text-sm text-[#6b7280] border border-[#333333]">
                                              <span className="text-muted-foreground">Último mensaje: </span>
                                              {lastMessages[chat.id].message.length > 50 
                                                ? lastMessages[chat.id].message.substring(0, 50) + '...' 
                                                : lastMessages[chat.id].message}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Waiting Sessions Group */}
                          {getFilteredAndSortedSessions().filter(s => s.status === 'waiting').length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                                Chats Esperando ({getFilteredAndSortedSessions().filter(s => s.status === 'waiting').length})
                              </h3>
                              <div className="space-y-3">
                                {getFilteredAndSortedSessions()
                                  .filter(s => s.status === 'waiting')
                                  .map((chat, index) => (
                                    <div
                                      key={chat.id}
                                      className="p-5 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up cursor-pointer hover:border-yellow-500/50"
                                      style={{ animationDelay: `${index * 0.05}s` }}
                                      onClick={() => {
                                        setSelectedChat(chat)
                                        loadChatMessages(chat.id)
                                      }}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="font-medium text-lg text-[#ededed]">{chat.client_name}</div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${CHAT_STATUS_LABELS[chat.status]?.bgColor} ${CHAT_STATUS_LABELS[chat.status]?.color}`}>
                                              {CHAT_STATUS_LABELS[chat.status]?.label || chat.status}
                                            </div>
                                            {getUnreadCount(chat.id) > 0 && (
                                              <div className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                                                {getUnreadCount(chat.id)}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-sm text-[#6b7280] mb-2">
                                            {chat.client_email}
                                          </div>
                                          <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                                            <span className="text-muted-foreground">#{chat.conversation_number}</span>
                                            <span>•</span>
                                            <span>{formatDate(chat.created_at)}</span>
                                            {getTimeSinceLastMessage(chat.id) && (
                                              <>
                                                <span>•</span>
                                                <span className="text-blue-400">Última actividad: {getTimeSinceLastMessage(chat.id)}</span>
                                              </>
                                            )}
                                          </div>
                                          {lastMessages[chat.id] && (
                                            <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg text-sm text-[#6b7280] border border-[#333333]">
                                              <span className="text-muted-foreground">Último mensaje: </span>
                                              {lastMessages[chat.id].message.length > 50 
                                                ? lastMessages[chat.id].message.substring(0, 50) + '...' 
                                                : lastMessages[chat.id].message}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleClaimChat(chat.id)
                                          }}
                                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg transition-opacity ml-3"
                                        >
                                          Reclamar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Closed Sessions Group */}
                          {getFilteredAndSortedSessions().filter(s => s.status === 'closed').length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-500" />
                                Chats Cerrados ({getFilteredAndSortedSessions().filter(s => s.status === 'closed').length})
                              </h3>
                              <div className="space-y-3">
                                {getFilteredAndSortedSessions()
                                  .filter(s => s.status === 'closed')
                                  .map((chat, index) => (
                                    <div
                                      key={chat.id}
                                      className="p-5 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up cursor-pointer opacity-70 hover:opacity-100"
                                      style={{ animationDelay: `${index * 0.05}s` }}
                                      onClick={() => {
                                        setSelectedChat(chat)
                                        loadChatMessages(chat.id)
                                      }}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="font-medium text-lg text-[#ededed]">{chat.client_name}</div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${CHAT_STATUS_LABELS[chat.status]?.bgColor} ${CHAT_STATUS_LABELS[chat.status]?.color}`}>
                                              {CHAT_STATUS_LABELS[chat.status]?.label || chat.status}
                                            </div>
                                          </div>
                                          <div className="text-sm text-[#6b7280] mb-2">
                                            {chat.client_email}
                                          </div>
                                          <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                                            <span className="text-muted-foreground">#{chat.conversation_number}</span>
                                            <span>•</span>
                                            <span>{formatDate(chat.created_at)}</span>
                                          </div>
                                          {lastMessages[chat.id] && (
                                            <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg text-sm text-[#6b7280] border border-[#333333]">
                                              <span className="text-muted-foreground">Último mensaje: </span>
                                              {lastMessages[chat.id].message.length > 50 
                                                ? lastMessages[chat.id].message.substring(0, 50) + '...' 
                                                : lastMessages[chat.id].message}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-muted text-lg">
                            {supportSearch ? 'No se encontraron chats que coincidan con la búsqueda' : 'No hay chats de soporte activos'}
                          </p>
                          <p className="text-sm text-muted mt-2">
                            {supportSearch ? 'Intenta con otros términos de búsqueda' : 'Los clientes pueden iniciar chats desde la burbuja de soporte en el sitio.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <Card className="glass-card hover-glow animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="text-2xl">Historial de Chats</CardTitle>
                  <CardDescription className="text-base">Chats cerrados (se eliminan automáticamente después de 24 horas)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {chatHistory.length > 0 ? (
                      chatHistory.map((chat, index) => (
                        <div
                          key={chat.id}
                          className="p-6 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-medium text-lg text-[#ededed]">{chat.client_name}</div>
                                <div className="w-3 h-3 rounded-full bg-gray-500" />
                                <span className="text-sm text-[#6b7280] font-medium">Cerrado</span>
                              </div>
                              <div className="text-base text-[#6b7280]">
                                {chat.conversation_number} • {formatDate(chat.created_at)}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedChat(chat)
                                loadChatMessages(chat.id)
                                setActiveTab('support')
                              }}
                              className="px-4 py-2 bg-[#333333] text-[#ededed] rounded-lg transition-colors"
                            >
                              Ver detalles
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted text-lg">No hay chats en el historial</p>
                        <p className="text-sm text-muted mt-2">Los chats cerrados aparecerán aquí.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                        .is('deleted_at', null)
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
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteClick(selectedOrder.id)}
                    className="hover-lift"
                  >
                    Eliminar pedido
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
    </div>
  )
}
