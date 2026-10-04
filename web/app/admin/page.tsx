'use client'

import { useState, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { getSession, isDemoMode } from '@/lib/auth-hybrid'
import { createClient } from '@/lib/supabase/client'
import { useNotificationStore } from '@/lib/notifications-store'
import * as tus from 'tus-js-client'

interface User {
  id: string
  email: string
  full_name?: string
  role: 'client' | 'admin' | 'staff' | 'owner'
  created_at: string
  online?: boolean
}

interface SupportAgent {
  id: string
  full_name?: string | null
  email?: string
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
  notes?: string
  assigned_to?: string | null
  estimated_completion?: string | null
  updated_at: string
}

interface OrderEvent {
  id: string
  description: string | null
  created_at: string
}

interface OrderDeliverable {
  id: string
  file_name: string
  content_type: string
  file_size: number
  note: string | null
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
  ai_handoff_ready?: boolean
  ai_summary?: string | null
  ai_intake?: Record<string, string | null>
}

interface ChatMessage {
  id: string
  session_id: string
  sender_id: string | null
  sender_role: string
  message: string
  message_type: string
  attachment_path?: string | null
  attachment_name?: string | null
  read_at?: string | null
  created_at: string
  sender?: {
    id: string | null
    full_name: string | null
    email: string | null
    avatar_url: string | null
    discord_avatar: string | null
    role: string
    online: boolean
  } | null
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [supportAgents, setSupportAgents] = useState<SupportAgent[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [selectedChatImage, setSelectedChatImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'services' | 'support' | 'history'>('overview')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [assignedAgentId, setAssignedAgentId] = useState('')
  const [estimatedCompletion, setEstimatedCompletion] = useState('')
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([])
  const [orderDeliverables, setOrderDeliverables] = useState<OrderDeliverable[]>([])
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null)
  const [deliveryNote, setDeliveryNote] = useState('')
  const [uploadingDelivery, setUploadingDelivery] = useState(false)
  const [deliveryUploadProgress, setDeliveryUploadProgress] = useState(0)
  const [deliveryInputKey, setDeliveryInputKey] = useState(0)
  const [savingOrder, setSavingOrder] = useState(false)
  const [userRole, setUserRole] = useState<'client' | 'admin' | 'staff' | 'owner'>('client')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [transferAgentId, setTransferAgentId] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const typingChannelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Support tab filters and search
  const [supportFilter, setSupportFilter] = useState<'all' | 'active' | 'waiting' | 'closed'>('all')
  const [supportSearch, setSupportSearch] = useState('')
  const [supportSort, setSupportSort] = useState<'date' | 'status' | 'number'>('date')
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({})
  const router = useRouter()
  const isDemo = isDemoMode()
  const { success: notifySuccess, error: notifyError, warning: notifyWarning, info: notifyInfo } = useNotificationStore()
  const supabase = createClient()

  const loadAdminData = async (supportOnly = userRole === 'staff') => {
    const supabase = createClient()

    if (!supportOnly) {
      // Estos datos son exclusivos del panel administrativo. Staff no los
      // solicita ni los recibe en el navegador.
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (usersData) setUsers(usersData)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, services(name)')
        .neq('status', 'pending')
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
          notes: order.notes,
          assigned_to: order.assigned_to,
          estimated_completion: order.estimated_completion,
          updated_at: order.updated_at,
        })))
      }

      // La consulta pública de Supabase oculta los servicios inactivos, pero
      // el panel administrativo debe poder reactivarlos.
      try {
        const servicesResponse = await fetch('/api/admin/services', { cache: 'no-store' })
        if (servicesResponse.ok) {
          const servicesPayload = await servicesResponse.json()
          setServices(servicesPayload.services || [])
        } else {
          notifyError('No se pudieron cargar los servicios del panel')
        }
      } catch {
        notifyError('No se pudieron cargar los servicios del panel')
      }
    } else {
      // Staff solo recibe la lista pública y reducida de agentes disponibles,
      // necesaria para transferir chats. No se carga el directorio de usuarios.
      try {
        const queueResponse = await fetch('/api/chat/queue', { cache: 'no-store' })
        if (queueResponse.ok) {
          const queuePayload = await queueResponse.json()
          setSupportAgents(queuePayload.agents || [])
        }
      } catch {
        // La conversación sigue disponible aunque la lista de transferencia falle.
      }
    }

    // Cargar sesiones de chat (todas, filtrar en código)
    const { data: allSessions, error: allError } = await supabase
      .from('chat_sessions')
      .select('*, users!chat_sessions_client_id_fkey(email, full_name)')
      .order('created_at', { ascending: false })

    if (allError) {
    } else {
    }

    // Filtrar en código: solo no-closed para support tab
    const activeSessions = allSessions?.filter((s: any) => s.status !== 'closed') || []
    const closedSessions = allSessions?.filter((s: any) => s.status === 'closed') || []

    const mapChatSession = (session: any): ChatSession => ({
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
      ai_handoff_ready: session.ai_handoff_ready,
      ai_summary: session.ai_summary,
      ai_intake: session.ai_intake,
    })

    const mappedActiveSessions = activeSessions.map(mapChatSession)
    const mappedClosedSessions = closedSessions.map(mapChatSession)

    setChatSessions(mappedActiveSessions)

    setChatHistory(mappedClosedSessions)
    // El panel es una cola informativa: nunca abre la conversación.
    // Al reclamar, la atención continúa únicamente en la burbuja del agente.
    setSelectedChat(null)

    // Cargar últimos mensajes para sesiones activas
    if (activeSessions.length > 0) {
      await loadLastMessages(mappedActiveSessions)
    }


  }

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession()

      if (!session) {
        router.push('/auth/login?redirect=/admin')
        return
      }

      // Los administradores ven todo el panel. Staff entra únicamente a soporte.
      const role = session.user.role as string || 'client'
      setUserRole(role as 'client' | 'admin' | 'staff' | 'owner')
      setCurrentUserId(session.user.id)

      if (!['staff', 'admin', 'owner'].includes(role)) {
        router.push('/dashboard')
        return
      }

      if (role === 'staff') setActiveTab('support')

      if (!isDemo) {
        await loadAdminData(role === 'staff')
      }

      setLoading(false)
    }

    loadData()
  }, [router, isDemo])

  // Suscribirse a cambios en tiempo real para chat sessions
  useEffect(() => {
    if (isDemo || !['staff', 'admin', 'owner'].includes(userRole)) return

    const channel = supabase
      .channel('admin-chat-sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_sessions'
      }, () => {
        loadAdminData()
      })
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isDemo, userRole])

  // Suscribirse a cambios en tiempo real para usuarios
  useEffect(() => {
    if (isDemo || (userRole !== 'admin' && userRole !== 'owner')) return

    const channel = supabase
      .channel('admin-users')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        loadAdminData()
      })
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isDemo, userRole])

  // Suscribirse a cambios en tiempo real para pedidos
  useEffect(() => {
    if (isDemo || (userRole !== 'admin' && userRole !== 'owner')) return

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {

        // Recargar si cambia deleted_at (soft delete)
        if (payload.eventType === 'UPDATE' && payload.new?.deleted_at !== payload.old?.deleted_at) {
          loadAdminData()
        } else {
          loadAdminData()
        }
      })
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isDemo, userRole])

  // Suscribirse a cambios en tiempo real para servicios
  useEffect(() => {
    if (isDemo || (userRole !== 'admin' && userRole !== 'owner')) return

    const channel = supabase
      .channel('admin-services')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'services'
      }, () => {
        loadAdminData()
      })
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isDemo, userRole])

  // Suscribirse a cambios en tiempo real para chat messages
  useEffect(() => {
    if (!selectedChat || isDemo) return

    const channel = supabase
      .channel(`admin-chat-messages-${selectedChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${selectedChat.id}`
      }, () => {
        loadChatMessages(selectedChat.id)
      })
      .subscribe((status) => {
      })

    return () => {
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

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setOrderNote('')
    setAssignedAgentId(order.assigned_to || '')
    setEstimatedCompletion(order.estimated_completion ? new Date(order.estimated_completion).toISOString().slice(0, 16) : '')
    setShowOrderModal(true)
    setDeliveryFile(null)
    setDeliveryNote('')

    const { data } = await supabase
      .from('order_events')
      .select('id, description, created_at')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(8)
    setOrderEvents((data || []) as OrderEvent[])
    await loadOrderDeliverables(order.id)
  }

  const loadOrderDeliverables = async (orderId: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/deliverables`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las entregas')
      setOrderDeliverables(payload.deliverables || [])
    } catch {
      setOrderDeliverables([])
    }
  }

  const uploadOrderDeliverable = async () => {
    if (!selectedOrder || !deliveryFile || uploadingDelivery) return
    if (deliveryFile.size > 2 * 1024 * 1024 * 1024) {
      notifyError('El archivo debe pesar 2 GB o menos')
      return
    }
    setUploadingDelivery(true)
    setDeliveryUploadProgress(0)
    try {
      const fileInfo = {
        fileName: deliveryFile.name,
        fileSize: deliveryFile.size,
        contentType: deliveryFile.type || 'application/octet-stream',
      }
      const prepareResponse = await fetch(`/api/admin/orders/${selectedOrder.id}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare', ...fileInfo }),
      })
      const prepared = await prepareResponse.json()
      if (!prepareResponse.ok) throw new Error(prepared.error || 'No se pudo preparar la subida')

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const projectId = new URL(supabaseUrl).hostname.split('.')[0]
      const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(deliveryFile, {
          endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          chunkSize: 6 * 1024 * 1024,
          removeFingerprintOnSuccess: true,
          uploadDataDuringCreation: true,
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'x-signature': prepared.token,
            'x-upsert': 'false',
          },
          metadata: {
            bucketName: 'order-deliverables',
            objectName: prepared.path,
            contentType: fileInfo.contentType,
            cacheControl: '3600',
          },
          onError: reject,
          onProgress: (uploaded, total) => setDeliveryUploadProgress(Math.round((uploaded / total) * 100)),
          onSuccess: () => resolve(),
        })
        upload.findPreviousUploads()
          .then(previous => {
            if (previous.length) upload.resumeFromPreviousUpload(previous[0])
            upload.start()
          })
          .catch(reject)
      })

      const completeResponse = await fetch(`/api/admin/orders/${selectedOrder.id}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', ...fileInfo, note: deliveryNote, path: prepared.path }),
      })
      const completed = await completeResponse.json()
      if (!completeResponse.ok) throw new Error(completed.error || 'No se pudo registrar la entrega')
      await loadOrderDeliverables(selectedOrder.id)
      setDeliveryFile(null)
      setDeliveryNote('')
      setDeliveryInputKey(value => value + 1)
      notifySuccess('Archivo entregado de forma privada')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir el archivo'
      notifyError(
        /size|large|limit|413|maximum/i.test(message)
          ? 'El almacenamiento rechazó el tamaño. Para archivos mayores de 50 MB debes activar Supabase Pro.'
          : message
      )
    } finally {
      setUploadingDelivery(false)
      setDeliveryUploadProgress(0)
    }
  }

  const deleteOrderDeliverable = async (fileId: string) => {
    if (!selectedOrder) return
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}/deliverables`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar el archivo')
      await loadOrderDeliverables(selectedOrder.id)
      notifySuccess('Archivo eliminado')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'No se pudo eliminar el archivo')
    }
  }

  const formatFileSize = (bytes: number) => bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

  const saveOrderOperations = async () => {
    if (!selectedOrder || savingOrder) return
    setSavingOrder(true)
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assignedTo: assignedAgentId || null,
          estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion).toISOString() : null,
          note: orderNote,
        }),
      })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'No se pudo actualizar el pedido')
      await loadAdminData()
      setShowOrderModal(false)
      notifySuccess('Pedido, responsable e historial actualizados')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'No se pudo actualizar el pedido')
    } finally {
      setSavingOrder(false)
    }
  }

  const openCustomerSupport = (order: Order) => {
    setShowOrderModal(false)
    setSupportSearch(order.client_email)
    setSupportFilter('all')
    setActiveTab('support')
    const matchingChat = [...chatSessions, ...chatHistory]
      .filter(chat => chat.client_id === order.user_id || chat.client_email?.toLowerCase() === order.client_email.toLowerCase())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!matchingChat) {
      notifyInfo('Panel abierto. Este cliente todavía no ha iniciado una conversación')
      return
    }

    setSupportFilter(matchingChat.status === 'closed' ? 'closed' : 'all')
    if (matchingChat.assigned_agent_id === currentUserId && matchingChat.status !== 'closed') {
      window.dispatchEvent(new CustomEvent('support-chat-claimed', { detail: { sessionId: matchingChat.id } }))
      notifyInfo('Soporte abierto en la burbuja')
    } else if (!matchingChat.assigned_agent_id && matchingChat.status !== 'closed') {
      notifyInfo('Soporte localizado. Reclámalo desde la cola para responder')
    } else if (matchingChat.status === 'closed') {
      notifyInfo('La conversación está cerrada y aparece en el historial')
    } else {
      notifyInfo('Este soporte está siendo atendido por otro agente')
    }
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
      notifyError('Error al eliminar pedido: ' + (error as Error).message)
    }
  }

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId)
    setShowDeleteModal(true)
  }

  const editService = async (service: Service) => {
    const name = window.prompt('Nombre del servicio', service.name)
    if (name === null) return
    const priceText = window.prompt('Precio del servicio', String(service.price))
    if (priceText === null) return
    const price = Number(priceText)
    if (!name.trim() || !Number.isFinite(price) || price < 0) {
      notifyWarning('Nombre o precio inválido')
      return
    }

    try {
      const response = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, name: name.trim(), price, is_active: service.is_active }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo actualizar el servicio')
      setServices((current) => current.map((item) => item.id === service.id ? { ...item, name: name.trim(), price } : item))
      notifySuccess('Servicio actualizado correctamente')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'No se pudo actualizar el servicio')
    }
  }

  const toggleServiceActive = async (service: Service) => {
    try {
      const response = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: service.id, name: service.name, price: service.price, is_active: !service.is_active }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'No se pudo actualizar el servicio')
      setServices((current) => current.map((item) => item.id === service.id ? { ...item, is_active: !service.is_active } : item))
      notifySuccess(service.is_active ? 'Servicio desactivado' : 'Servicio activado')
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'No se pudo actualizar el servicio')
    }
  }

  const loadChatMessages = async (sessionId: string) => {
    const response = await fetch(`/api/chat/messages?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
    if (!response.ok) return
    const data = await response.json()
    const messages = data.messages || []
    setChatMessages(messages)

    // Consultar detalles desde el panel nunca marca mensajes como vistos.
    // Solo la burbuja del agente que reclamó el soporte confirma la lectura.
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

  useEffect(() => {
    const chatId = new URLSearchParams(window.location.search).get('supportChat')
    if (!chatId) return

    const linkedChat = [...chatSessions, ...chatHistory].find(chat => chat.id === chatId)
    if (!linkedChat) return

    setActiveTab('support')
    setSupportFilter(linkedChat.status === 'closed' ? 'closed' : 'all')
  }, [chatSessions, chatHistory])

  // Respaldo para instalaciones donde Supabase Realtime no esté publicado o
  // el websocket se desconecte. Realtime sigue siendo la vía inmediata.
  useEffect(() => {
    if (isDemo || loading) return

    const syncSupport = async () => {
      await loadAdminData()
      if (selectedChat) await loadChatMessages(selectedChat.id)
    }

    const interval = window.setInterval(syncSupport, 3000)
    return () => window.clearInterval(interval)
  }, [isDemo, loading, selectedChat?.id])

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
        const data = await response.json()
        await loadAdminData()
        setSelectedChat(current => current?.id === sessionId ? { ...current, ...data.session } : current)
        window.dispatchEvent(new CustomEvent('support-chat-claimed', { detail: { sessionId } }))
        notifySuccess('Chat reclamado exitosamente')
      } else {
        const data = await response.json()
        notifyError(data.error || 'No se pudo reclamar el chat')
      }
    } catch (error) {
      notifyError('Error al reclamar chat')
    }
  }

  const handleCloseChat = async (sessionId: string) => {
    try {
      const session = await getSession()
      if (!session) return

      const response = await fetch('/api/chat/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      if (response.ok) {
        const data = await response.json()

        // Recargar datos para actualizar las listas
        await loadAdminData()

        // Limpiar selección
        setSelectedChat(null)
        setChatMessages([])

        notifySuccess('Chat cerrado exitosamente')
      } else {
        const errorData = await response.json()
        notifyError('Error al cerrar chat: ' + errorData.error)
      }
    } catch (error) {
      notifyError('Error al cerrar chat')
    }
  }

  const handleTransferChat = async () => {
    if (!selectedChat || !transferAgentId) return
    if (transferTargetBusy) {
      notifyWarning('Ese agente ya está atendiendo otro chat. Debe cerrar o transferir su conversación actual primero.')
      return
    }

    try {
      const response = await fetch('/api/chat/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedChat.id,
          target_agent_id: transferAgentId,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        notifyError(data.error || 'No se pudo transferir el chat')
        return
      }

      setTransferAgentId('')
      setSelectedChat(null)
      setChatMessages([])
      await loadAdminData()
      notifySuccess('Chat transferido exitosamente')
    } catch {
      notifyError('Error al transferir el chat')
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
        sendAgentTyping(false)
        await loadChatMessages(selectedChat.id)
      } else {
        const data = await response.json()
        notifyError(data.error || 'No se pudo enviar el mensaje')
      }
    } catch (error) {
      notifyError('Error al enviar mensaje')
    }
  }

  useEffect(() => {
    if (!selectedChat || isDemo) return

    const channel = supabase.channel(`messages:${selectedChat.id}`)
    channel.subscribe()
    typingChannelRef.current = channel

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      channel.send({ type: 'broadcast', event: 'agent_typing', payload: { typing: false } })
      supabase.removeChannel(channel)
      typingChannelRef.current = null
    }
  }, [selectedChat?.id, isDemo])

  const sendAgentTyping = (typing: boolean) => {
    typingChannelRef.current?.send({
      type: 'broadcast',
      event: 'agent_typing',
      payload: { typing },
    })
  }

  const handleAgentTyping = () => {
    sendAgentTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendAgentTyping(false), 1200)
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

  const orderHistory = orders.filter(order => ['completed', 'cancelled'].includes(order.status))
  const activeOrders = orders.filter(order => !['completed', 'cancelled'].includes(order.status))
  const transferTargetBusy = Boolean(
    transferAgentId && chatSessions.some(chat => (
      chat.assigned_agent_id === transferAgentId && chat.status !== 'closed' && chat.id !== selectedChat?.id
    ))
  )

  // Filtrar, buscar y ordenar sesiones de chat
  const getFilteredAndSortedSessions = () => {
    let filtered = supportFilter === 'closed' ? [...chatHistory] : [...chatSessions]

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
              <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text-primary animate-fade-in-up">
                {userRole === 'staff' ? 'Panel de Soporte' : 'Panel de Administración'}
              </h1>
              <p className="text-muted text-lg text-headline">
                {userRole === 'staff'
                  ? 'Responde y gestiona conversaciones de soporte'
                  : 'Gestiona usuarios, pedidos, servicios y configuraciones'}
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
            {userRole !== 'staff' && <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Resumen
            </button>}
            {userRole !== 'staff' && <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Pedidos ({activeOrders.length})
            </button>}
            {userRole !== 'staff' && <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('services')}
            >
              Servicios ({services.length})
            </button>}
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
            {userRole !== 'staff' && <button
              className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 text-lg pointer-events-auto cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-primary text-white'
                  : 'border border-border bg-transparent'
              }`}
              onClick={() => setActiveTab('history')}
            >
              Historial ({orderHistory.length})
            </button>}
          </div>

          {/* Overview Tab */}
          {userRole !== 'staff' && activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="transition-all glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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

          {/* Orders Tab */}
          {userRole !== 'staff' && activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5"><p className="text-sm text-blue-300">Por revisar</p><p className="mt-2 text-3xl font-bold">{activeOrders.filter(order => order.status === 'reviewing').length}</p></div>
                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5"><p className="text-sm text-violet-300">En proceso</p><p className="mt-2 text-3xl font-bold">{activeOrders.filter(order => order.status === 'in_progress').length}</p></div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><p className="text-sm text-amber-300">Esperando cliente</p><p className="mt-2 text-3xl font-bold">{activeOrders.filter(order => order.status === 'waiting_client').length}</p></div>
                <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5"><p className="text-sm text-sky-300">Pedidos activos</p><p className="mt-2 text-3xl font-bold">{activeOrders.length}</p></div>
              </div>
            <Card className="glass-card hover-glow animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-2xl">Todos los Pedidos</CardTitle>
                <CardDescription className="text-base">Gestión de pedidos de todos los usuarios</CardDescription>
              </CardHeader>
              <CardContent>
                {activeOrders.length > 0 ? (
                  <div className="space-y-4">
                    {activeOrders.map((order, index) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-6 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => openOrderDetails(order)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium text-lg">{order.order_number}</div>
                            <div className={`w-3 h-3 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'} animate-pulse`} />
                            <span className="text-sm text-muted font-medium">{STATUS_LABELS[order.status]?.label || order.status}</span>
                          </div>
                          <div className="text-base text-muted">
                            {order.service_name} • {formatDate(order.created_at)}
                          </div>
                          <div className="mt-2 text-sm text-muted">{order.assigned_to ? '✓ Responsable asignado' : 'Sin responsable'} · {order.estimated_completion ? `Entrega: ${formatDate(order.estimated_completion)}` : 'Sin fecha estimada'}</div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => openOrderDetails(order)}
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
            </div>
          )}

          {/* Services Tab */}
          {userRole !== 'staff' && activeTab === 'services' && (
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
                          </div>
                          <div className="text-base text-muted">
                            {service.category} • ${service.price}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {userRole === 'owner' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => editService(service)}>Editar</Button>
                              <Button variant="outline" size="sm" onClick={() => toggleServiceActive(service)}>
                                {service.is_active ? 'Desactivar' : 'Activar'}
                              </Button>
                            </>
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
                      <div className="text-sm text-purple-500 mb-1">
                        {userRole === 'staff' ? 'Mis chats' : 'Agentes online'}
                      </div>
                      <div className="text-2xl font-bold text-purple-500">
                        {userRole === 'staff'
                          ? chatSessions.filter(chat => chat.assigned_agent_id === currentUserId && chat.status !== 'closed').length
                          : users.filter(u => (u.role === 'admin' || u.role === 'staff' || u.role === 'owner') && u.online).length}
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
                        Cerrados ({chatHistory.length})
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
                          {selectedChat.assigned_agent_id === currentUserId && selectedChat.status !== 'closed' && (
                            <>
                              <select
                                value={transferAgentId}
                                onChange={(event) => setTransferAgentId(event.target.value)}
                                className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm text-[#ededed]"
                                aria-label="Agente de destino"
                              >
                                <option value="">Transferir a...</option>
                                {(userRole === 'staff' ? supportAgents : users)
                                  .filter(user => user.id !== currentUserId)
                                  .map(user => {
                                    const isBusy = chatSessions.some(chat => (
                                      chat.assigned_agent_id === user.id && chat.status !== 'closed' && chat.id !== selectedChat.id
                                    ))
                                    return (
                                      <option key={user.id} value={user.id} disabled={isBusy}>
                                        {user.full_name || user.email || 'Agente de soporte'}{isBusy ? ' · ocupado' : user.online ? ' · disponible' : ' · offline'}
                                      </option>
                                    )
                                  })}
                              </select>
                              <button
                                type="button"
                                onClick={handleTransferChat}
                                disabled={!transferAgentId || transferTargetBusy}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Transferir
                              </button>
                              <button
                                onClick={() => handleCloseChat(selectedChat.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg transition-colors"
                              >
                                Cerrar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedChat.ai_summary && (
                        <div className="border-b border-violet-500/20 bg-violet-500/[0.08] px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-bold text-violet-200">Resumen de Dulcan AI</span>
                            {selectedChat.ai_handoff_ready && <span className="text-xs font-semibold text-emerald-300">✓ Listo para atender</span>}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-white/75">{selectedChat.ai_summary}</p>
                        </div>
                      )}
                      <div className="h-[400px] overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-[#0a0a0a]">
                        {chatMessages.map((message) => {
                          const isClient = message.sender_role === 'client'
                          const isAssistant = message.sender_role === 'assistant'
                          const senderName = isAssistant
                            ? 'Dulcan AI'
                            : message.sender?.full_name || message.sender?.email?.split('@')[0] || (isClient ? 'Cliente' : 'Agente de soporte')
                          const senderAvatar = message.sender?.avatar_url || (message.sender?.discord_avatar && message.sender.id
                            ? `https://cdn.discordapp.com/avatars/${message.sender.id}/${message.sender.discord_avatar}.png`
                            : null)
                          const isAttachment = message.message_type === 'attachment'
                          const isImage = Boolean(
                            isAttachment && message.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          )
                          const attachmentUrl = message.attachment_path
                            ? `/api/chat/attachments/view?path=${encodeURIComponent(message.attachment_path)}`
                            : null
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isClient && (
                                <div className={`mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 text-xs font-black text-white ${isAssistant ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-[#292933]'}`}>
                                  {senderAvatar ? <img src={senderAvatar} alt={senderName} className="h-full w-full object-cover" /> : isAssistant ? 'AI' : senderName.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 max-w-[80%]">
                                <div className={`mb-1 flex items-center gap-2 px-1 ${isClient ? 'justify-end' : ''}`}>
                                  <span className="text-xs font-bold text-white/80">{isClient ? 'Cliente' : senderName}</span>
                                  {!isClient && (
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isAssistant ? 'bg-violet-500/20 text-violet-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                                      {isAssistant ? 'Triaje automático' : 'Agente verificado'}
                                    </span>
                                  )}
                                </div>
                              <div
                                className={`min-w-0 rounded-2xl p-3 ${
                                  isClient
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                    : 'bg-[#1a1a1a] border border-[#333333] text-[#ededed]'
                                }`}
                              >
                                {isImage && attachmentUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedChatImage(attachmentUrl)}
                                    className="block max-w-full overflow-hidden rounded-xl border border-white/15 bg-black/20 text-left"
                                    aria-label={`Abrir imagen ${message.attachment_name || 'adjunta'}`}
                                  >
                                    <img
                                      src={attachmentUrl}
                                      alt={message.attachment_name || 'Imagen adjunta'}
                                      className="max-h-72 w-auto max-w-full object-contain transition-opacity hover:opacity-90"
                                    />
                                    <span className="block break-words px-3 py-2 text-xs [overflow-wrap:anywhere]">
                                      {message.attachment_name}
                                    </span>
                                  </button>
                                ) : isAttachment && attachmentUrl ? (
                                  <a
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block break-words text-sm underline underline-offset-2 [overflow-wrap:anywhere]"
                                  >
                                    📎 {message.attachment_name || 'Abrir archivo adjunto'}
                                  </a>
                                ) : (
                                  <p className="break-words [overflow-wrap:anywhere] text-sm">{message.message}</p>
                                )}
                                <p className={`text-xs mt-1 ${isClient ? 'text-white/80' : 'text-[#6b7280]'}`}>
                                  {new Date(message.created_at).toLocaleTimeString('es-ES')}
                                </p>
                              </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="p-4 bg-[#1a1a1a] border-t border-[#333333]">
                        {selectedChat.status === 'waiting' && !selectedChat.assigned_agent_id && (
                          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
                            <p className="text-sm text-yellow-200">Reclama esta conversación para responder al cliente.</p>
                            <button
                              type="button"
                              onClick={() => handleClaimChat(selectedChat.id)}
                              className="shrink-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                              Reclamar chat
                            </button>
                          </div>
                        )}
                        {selectedChat.assigned_agent_id && selectedChat.assigned_agent_id !== currentUserId && selectedChat.status !== 'closed' && (
                          <p className="mb-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-200">
                            Esta conversación está siendo atendida por otro agente. Puedes verla, pero no responder.
                          </p>
                        )}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            const form = e.target as HTMLFormElement
                            const input = form.elements.namedItem('message') as HTMLInputElement
                            sendAgentTyping(false)
                            handleSendChatMessage(input.value)
                            input.value = ''
                          }}
                          className="flex gap-2"
                        >
                          <input
                            name="message"
                            type="text"
                            placeholder="Escribe tu respuesta..."
                            onChange={handleAgentTyping}
                            disabled={selectedChat.status === 'closed' || selectedChat.assigned_agent_id !== currentUserId}
                            className="flex-1 px-4 py-2 bg-[#0a0a0a] rounded-lg text-[#ededed] border border-[#333333] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={selectedChat.status === 'closed' || selectedChat.assigned_agent_id !== currentUserId}
                            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
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
                                      className="p-5 border border-border/50 rounded-xl glass-card animate-fade-in-up"
                                      style={{ animationDelay: `${index * 0.05}s` }}
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
                                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Asunto</span>
                                              <p className="mt-1 text-white/80">{chat.subject || 'Soporte general'}</p>
                                            </div>
                                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Prioridad</span>
                                              <p className="mt-1 capitalize text-white/80">{chat.priority || 'normal'}</p>
                                            </div>
                                          </div>
                                          {chat.ai_summary && (
                                            <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.08] p-3 text-sm text-violet-100">
                                              <span className="text-xs font-bold uppercase tracking-wide text-violet-300">Problema indicado</span>
                                              <p className="mt-1 whitespace-pre-wrap">{chat.ai_summary}</p>
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
                                      className="p-5 border border-border/50 rounded-xl glass-card animate-fade-in-up"
                                      style={{ animationDelay: `${index * 0.05}s` }}
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
                                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Asunto</span>
                                              <p className="mt-1 text-white/80">{chat.subject || 'Soporte general'}</p>
                                            </div>
                                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                              <span className="text-xs font-semibold uppercase tracking-wide text-white/40">Prioridad</span>
                                              <p className="mt-1 capitalize text-white/80">{chat.priority || 'normal'}</p>
                                            </div>
                                          </div>
                                          {chat.ai_summary && (
                                            <div className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/[0.08] p-3 text-sm text-violet-100">
                                              <span className="text-xs font-bold uppercase tracking-wide text-violet-300">Problema indicado</span>
                                              <p className="mt-1 whitespace-pre-wrap">{chat.ai_summary}</p>
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
                                      className="p-5 border border-border/50 rounded-xl glass-card animate-fade-in-up opacity-70"
                                      style={{ animationDelay: `${index * 0.05}s` }}
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
          {userRole !== 'staff' && activeTab === 'history' && (
            <div className="space-y-6">
              <Card className="glass-card hover-glow animate-fade-in-up">
                <CardHeader>
                  <CardTitle className="text-2xl">Historial de Pedidos</CardTitle>
                  <CardDescription className="text-base">Pedidos completados y cancelados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderHistory.length > 0 ? (
                      orderHistory.map((order, index) => (
                        <div
                          key={order.id}
                          className="p-6 border border-border/50 rounded-xl transition-all glass-card animate-fade-in-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-medium text-lg text-[#ededed]">{order.order_number}</div>
                                <div className={`w-3 h-3 rounded-full ${STATUS_LABELS[order.status]?.color || 'bg-gray-500'}`} />
                                <span className="text-sm text-[#6b7280] font-medium">{STATUS_LABELS[order.status]?.label || order.status}</span>
                              </div>
                              <div className="text-base text-[#6b7280]">
                                {order.service_name} • {order.client_name} • {formatDate(order.updated_at || order.created_at)}
                              </div>
                            </div>
                            <button
                              onClick={() => openOrderDetails(order)}
                              className="px-4 py-2 bg-[#333333] text-[#ededed] rounded-lg transition-colors"
                            >
                              Ver detalles
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted text-lg">No hay pedidos en el historial</p>
                        <p className="text-sm text-muted mt-2">Los pedidos completados o cancelados aparecerán aquí.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}

        </div>
      </section>

      {/* Order Details Modal */}
      {userRole !== 'staff' && showOrderModal && selectedOrder && (
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
                  <option value="reviewing">Revisando</option>
                  <option value="in_progress">En proceso</option>
                  <option value="waiting_client">Esperando cliente</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="order-assignee" className="mb-3 block text-base font-medium">Responsable</label>
                  <select id="order-assignee" value={assignedAgentId} onChange={(event) => setAssignedAgentId(event.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Equipo general</option>
                    {users.filter(user => ['staff', 'admin', 'owner'].includes(user.role)).map(user => <option key={user.id} value={user.id}>{user.full_name || user.email} · {ROLE_LABELS[user.role]?.label || user.role}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="order-estimated-date" className="mb-3 block text-base font-medium">Entrega estimada</label>
                  <input id="order-estimated-date" type="datetime-local" value={estimatedCompletion} onChange={(event) => setEstimatedCompletion(event.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              {/* Note */}
              <div>
                <div className="text-base font-medium mb-3">Nota para el historial</div>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Describe el avance, lo que necesitas del cliente o los próximos pasos..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                />
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-medium">Soporte privado del cliente</p><p className="text-sm text-muted">Busca sus conversaciones para responder o revisar archivos.</p></div><Button variant="outline" size="sm" onClick={() => openCustomerSupport(selectedOrder)}>Abrir soporte</Button></div>
              </div>

              <div className="border-t border-border/50 pt-5">
                <p className="font-medium">Entregas privadas</p>
                <p className="mt-1 text-sm text-muted">Comparte archivos finales visibles solamente para este cliente. Máximo 2 GB por archivo.</p>
                <div className="mt-4 space-y-3">
                  {orderDeliverables.map(file => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{file.file_name}</p><p className="mt-1 text-xs text-muted">{formatFileSize(file.file_size)} · {formatDate(file.created_at)}</p>{file.note && <p className="mt-1 break-words text-xs text-muted">{file.note}</p>}</div><Button variant="destructive" size="sm" onClick={() => deleteOrderDeliverable(file.id)}>Eliminar</Button></div>)}
                  {orderDeliverables.length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-4 text-center text-sm text-muted">Todavía no has entregado archivos.</p>}
                </div>
                <div className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <input key={deliveryInputKey} type="file" accept=".pdf,.zip,.7z,.rar,.png,.jpg,.jpeg,.webp,.txt,.json,.mp4,.blend,.fbx,.obj,.glb,.gltf,.stl,.dae,.3ds,.max,.ma,.mb" onChange={event => setDeliveryFile(event.target.files?.[0] || null)} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-white" />
                  <input type="text" maxLength={500} value={deliveryNote} onChange={event => setDeliveryNote(event.target.value)} placeholder="Nota opcional para el cliente" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                  <Button type="button" onClick={uploadOrderDeliverable} disabled={!deliveryFile || uploadingDelivery} className="w-full">{uploadingDelivery ? `Subiendo entrega… ${deliveryUploadProgress}%` : 'Entregar archivo al cliente'}</Button>
                  {uploadingDelivery && <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary transition-[width]" style={{ width: `${deliveryUploadProgress}%` }} /></div>}
                </div>
              </div>

              <div className="border-t border-border/50 pt-5">
                <p className="mb-3 font-medium">Historial reciente</p>
                <div className="space-y-3">
                  {orderEvents.length > 0 ? orderEvents.map(event => <div key={event.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-sm">{event.description || 'Pedido actualizado'}</p><p className="mt-1 text-xs text-muted">{formatDate(event.created_at)}</p></div>) : <p className="text-sm text-muted">Todavía no hay movimientos registrados.</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  className="flex-1 hover-lift shimmer-button"
                  onClick={saveOrderOperations}
                  disabled={savingOrder}
                >
                  {savingOrder ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowOrderModal(false)}
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

      {selectedChatImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa de imagen adjunta"
          onClick={() => setSelectedChatImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedChatImage(null)}
            className="absolute right-5 top-5 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xl text-white"
            aria-label="Cerrar vista previa"
          >
            ×
          </button>
          <img
            src={selectedChatImage}
            alt="Imagen adjunta ampliada"
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <Footer />
      </div>
    </div>
  )
}

