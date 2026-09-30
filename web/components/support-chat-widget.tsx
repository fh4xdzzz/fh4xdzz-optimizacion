'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { MessageCircle, X, Send, Paperclip, Smile, BookOpen, MessagesSquare, Search, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react'
import { useNotificationStore } from '@/lib/notifications-store'

interface Message {
  id: string
  sender_id: string
  sender_role: string
  message: string
  message_type: string
  created_at: string
  read_at: string | null
  attachment_path?: string
  attachment_name?: string
}

interface ChatSession {
  id: string
  conversation_number: string
  status: string
  priority: string
  assigned_agent_id: string | null
  subject: string
  created_at: string
}

const PROFESSIONAL_EMOJIS = ['😀', '😊', '😂', '😍', '🤔', '😎', '👍', '👎', '👌', '👏', '🙏', '👋', '💪', '🎮', '💻', '🎙️', '🎧', '📸', '✅', '❌', '⚠️', '🔥', '⭐', '💙']

const QUICK_ACTIONS = [
  { label: 'Problema técnico', message: 'Hola, necesito ayuda con un problema técnico.' },
  { label: 'OBS o streaming', message: 'Hola, necesito ayuda con OBS o mi configuración de streaming.' },
  { label: 'Pagos y pedidos', message: 'Hola, necesito ayuda con un pago o pedido.' },
]

export default function SupportChatWidget() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'chat' | 'articles'>('chat')
  const [articleSearch, setArticleSearch] = useState('')
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [onlineAgents, setOnlineAgents] = useState<any[]>([])
  const [assignedAgentName, setAssignedAgentName] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { warning: notifyWarning, error: notifyError, success: notifySuccess } = useNotificationStore()

  // Estado para emoji picker y subida de archivos
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Emojis simples
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '�', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '�👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '�', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🎮', '🖥️', '🎙️', '🎧', '📸', '🎬', '🎨', '🎭', '🎪', '🎯', '🎲', '🎰', '🎳', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📱', '📲', '☎️', '📞', '📟', '📠', '🔋', '🔌', '💡', '🔦', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '✅', '❌', '⭕', '❓', '❔', '❕', '❗', '〰️', '‼️', '⁉️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '🔥', '⭐', '🌟', '✨', '⚡', '💥', '💫', '🔮']

  // Artículos de ayuda
  const articles = [
    { 
      title: 'Cómo configurar OBS para Twitch/Kick', 
      description: 'Guía rápida del centro de ayuda.',
      message: 'Hola, necesito ayuda para configurar OBS para Twitch/Kick. ¿Podrías orientarme?'
    },
    { 
      title: 'Optimizar Windows para gaming', 
      description: 'Mejora el rendimiento de tu PC.',
      message: 'Hola, necesito ayuda para optimizar Windows para gaming. ¿Qué me recomiendas?'
    },
    { 
      title: 'Solucionar pérdida de frames', 
      description: 'Tips para streaming estable.',
      message: 'Hola, estoy experimentando pérdida de frames en mi stream. ¿Podrías ayudarme a solucionarlo?'
    },
    { 
      title: 'Configurar bitrate, encoder y audio', 
      description: 'Configuración profesional.',
      message: 'Hola, necesito ayuda para configurar bitrate, encoder y audio. ¿Cuáles son los valores recomendados?'
    }
  ]

  const filteredArticles = articles.filter((article) => {
    const query = articleSearch.trim().toLowerCase()
    return !query || `${article.title} ${article.description}`.toLowerCase().includes(query)
  })

  // Respuestas automáticas del bot
  const botResponses = [
    {
      keywords: ['obs', 'streaming', 'twitch', 'kick', 'configurar'],
      response: 'Para configurar OBS, te recomiendo: 1) Usar x264 encoder en nivel 5-6, 2) Bitrate de 4500-6000 kbps para 1080p60, 3) Keyframe interval de 2 segundos. ¿Necesitas ayuda más específica?'
    },
    {
      keywords: ['windows', 'gaming', 'optimizar', 'rendimiento', 'pc'],
      response: 'Para optimizar Windows para gaming: 1) Activa el modo de alto rendimiento, 2) Desactiva Game DVR, 3) Actualiza drivers de GPU, 4) Cierra apps en segundo plano. ¿Te ayudo con alguno de estos pasos?'
    },
    {
      keywords: ['frames', 'lag', 'caída', 'stutter', 'perdida'],
      response: 'Para solucionar pérdida de frames: 1) Verifica tu conexión a internet, 2) Reduce la resolución o bitrate, 3) Cierra programas que consuman CPU, 4) Actualiza OBS. ¿Cuál es tu configuración actual?'
    },
    {
      keywords: ['precio', 'costo', 'servicio', 'pagar'],
      response: 'Nuestros servicios incluyen: 1) Configuración OBS: $25, 2) Optimización PC: $30, 3) Soporte técnico: $20/hora. ¿Te interesa alguno de estos servicios?'
    },
    {
      keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches'],
      response: '¡Hola! 👋 Soy el asistente virtual de TheDulcanDesign. Estoy aquí para ayudarte. Si no hay agentes disponibles, te daré respuestas básicas. ¿En qué puedo ayudarte?'
    }
  ]

  // Cargar sesión del usuario
  useEffect(() => {
    loadUserSession()
  }, [])

  // Cargar nombre del agente cuando la sesión cambia
  useEffect(() => {
    if (session?.assigned_agent_id) {
      loadAssignedAgentName(session.assigned_agent_id)
    } else {
      setAssignedAgentName(null)
    }
  }, [session?.assigned_agent_id])

  // Cargar sesión del usuario
  async function loadUserSession() {
    try {
      setAuthLoading(true)
      const userSession = await getSession()
      if (!userSession) {
        setIsAuthenticated(false)
        setCurrentUser(null)
        setAuthLoading(false)
        return
      }

      setCurrentUser(userSession.user)
      setIsAuthenticated(true)

      const response = await fetch('/api/chat/sessions')
      if (response.ok) {
        const data = await response.json()
        if (data.sessions && data.sessions.length > 0) {
          const activeSession = data.sessions.find((s: ChatSession) =>
            ['waiting', 'active', 'pending'].includes(s.status)
          )
          if (activeSession) {
            setSession(activeSession)
            loadMessages(activeSession.id)
          }
        }
      }
    } catch (error) {
      setIsAuthenticated(false)
    } finally {
      setAuthLoading(false)
    }
  }

  // Cargar nombre del agente asignado
  async function loadAssignedAgentName(agentId: string | null) {
    if (!agentId) {
      setAssignedAgentName(null)
      return
    }

    try {
      const supabase = createClient()
      const { data: agent } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', agentId)
        .single()

      if (agent) {
        setAssignedAgentName(agent.full_name || agent.email?.split('@')[0] || 'Agente')
      } else {
        setAssignedAgentName(null)
      }
    } catch (error) {
      setAssignedAgentName(null)
    }
  }

  // Suscribirse a cambios en tiempo real para session (siempre activo)
  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel(`session-status:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        const updatedSession = payload.new as ChatSession
        setSession(updatedSession)

        // Si cambió el agente asignado, actualizar el nombre
        if (payload.old.assigned_agent_id !== payload.new.assigned_agent_id) {
          loadAssignedAgentName(payload.new.assigned_agent_id)
        }

        // Si la sesión se cerró, limpiar mensajes
        if (updatedSession.status === 'closed') {
          setMessages([])
        }
      })
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id])

  // Suscribirse a cambios en tiempo real para mensajes (siempre activo para recibir notificaciones)
  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel(`messages:${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        const newMessage = payload.new as Message
        
        // Verificar si el mensaje ya existe para evitar duplicados
        setMessages(prev => {
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev
          }
          
          // Solo agregar mensajes al estado si el chat está abierto
          if (!open) {
            return prev
          }
          
          // Extraer solo los campos necesarios para evitar errores
          const cleanMessage: Message = {
            id: newMessage.id,
            sender_id: newMessage.sender_id,
            sender_role: newMessage.sender_role,
            message: newMessage.message,
            message_type: newMessage.message_type,
            created_at: newMessage.created_at,
            read_at: newMessage.read_at,
            attachment_path: newMessage.attachment_path,
            attachment_name: newMessage.attachment_name,
          }
          return [...prev, cleanMessage]
        })

        // Incrementar contador si el chat está cerrado y el mensaje es del soporte
        if (newMessage.sender_role !== 'client' && !open) {
          setUnread(prev => prev + 1)
        }

        if (newMessage.sender_role !== 'client') {
          setIsTyping(false)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        const updatedSession = payload.new as ChatSession
        setSession(updatedSession)
      })
      .subscribe((status) => {
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [session?.id, open])

  // Scroll al último mensaje siempre
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Cargar mensajes de una sesión
  async function loadMessages(sessionId: string) {
    try {
      const response = await fetch(`/api/chat/messages?session_id=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
    }
  }

  // Respaldo de Realtime: mantiene el chat sincronizado aunque el websocket
  // sea bloqueado o la tabla no esté todavía en la publicación de Supabase.
  useEffect(() => {
    if (!session || !isAuthenticated) return

    const syncChat = async () => {
      try {
        const response = await fetch('/api/chat/sessions', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          const updated = data.sessions?.find((item: ChatSession) => item.id === session.id)
          if (updated) setSession(updated)
        }
        if (session.status !== 'closed') await loadMessages(session.id)
      } catch {
        // Realtime seguirá funcionando si una consulta puntual falla.
      }
    }

    const interval = window.setInterval(syncChat, 3000)
    return () => window.clearInterval(interval)
  }, [session?.id, session?.status, isAuthenticated])

  // Crear nueva sesión de chat
  async function createSession() {
    if (session) return session

    try {
      setLoading(true)
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Soporte web',
          service_type: 'general',
          language: 'es'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
        loadMessages(data.session.id)
        return data.session
      } else {
        const error = await response.json()
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
    return null
  }

  // Manejar selección de emoji
  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Manejar subida de archivo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar tamaño del archivo (máximo 4MB para Vercel)
    if (file.size > 4 * 1024 * 1024) {
      notifyError('El archivo es demasiado grande. Máximo 4MB.')
      return
    }

    try {
      setUploadingFile(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/chat/attachments/sign', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Error al subir archivo')
      }

      const data = await response.json()
      
      // Enviar mensaje con el archivo adjunto
      const currentSession = session || await createSession()
      if (!currentSession) return

      const messageResponse = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.id,
          message: `📎 Archivo: ${file.name}`,
          message_type: 'attachment',
          attachment_path: data.path,
          attachment_name: file.name,
        }),
      })

      if (messageResponse.ok) {
        // No agregar manualmente, dejar que Realtime lo maneje
        // setMessages(prev => [...prev, messageData.message])
      }
    } catch (error) {
      notifyError('Error al subir el archivo')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Manejar paste de imágenes
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          const event = {
            target: {
              files: [file]
            }
          } as unknown as React.ChangeEvent<HTMLInputElement>
          handleFileUpload(event)
        }
      }
    }
  }

  // Enviar mensaje
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text.trim() || loading) return

    // Verificar autenticación
    if (!isAuthenticated || !currentUser) {
      notifyWarning('Debes iniciar sesión para enviar mensajes')
      return
    }

    const currentSession = session || await createSession()
    if (!currentSession) return

    try {
      setLoading(true)
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.id,
          message: text.trim(),
          message_type: 'text'
        })
      })

      if (response.ok) {
        setText('')
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // Formatear tiempo
  function formatTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)} h`
    return date.toLocaleDateString('es-ES')
  }

  // Verificar si hay agentes online
  const isOnline = onlineAgents.length > 0

  // Cargar agentes de soporte en línea
  useEffect(() => {
    async function loadOnlineAgents() {
      try {
        const response = await fetch('/api/chat/queue')
        if (response.ok) {
          const data = await response.json()
          setOnlineAgents(data.agents || [])
        }
      } catch (error) {
      }
    }

    loadOnlineAgents()

    // Suscribirse a cambios en tiempo real de usuarios
    const channel = supabase
      .channel('users-online-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users'
      }, (payload) => {
        // Solo procesar si es admin/staff/owner
        if (['admin', 'staff', 'owner'].includes(payload.new.role)) {
          loadOnlineAgents()
        }
      })
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Los agentes atienden desde /admin; la burbuja es exclusiva para clientes.
  if (!authLoading && currentUser && ['admin', 'staff', 'owner'].includes(currentUser.role)) {
    return null
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 right-4 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6">
        <div className="hidden rounded-2xl border border-white/10 bg-[#15151c]/95 px-4 py-3 text-right shadow-2xl backdrop-blur-xl sm:block">
          <p className="text-sm font-bold text-white">¿Necesitas ayuda?</p>
          <p className="mt-0.5 text-xs text-white/60">{isOnline ? 'Estamos en línea' : 'Déjanos un mensaje'}</p>
        </div>
        <button
          onClick={() => {
            setOpen(true)
            setUnread(0)
          }}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-white shadow-[0_16px_50px_rgba(79,70,229,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(79,70,229,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
          aria-label="Abrir chat de soporte"
        >
          <MessageCircle size={27} className="transition-transform group-hover:scale-110" />
          <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-[#0a0a0a] ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-xs font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <section
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0d0d12] shadow-2xl sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[730px] sm:max-h-[calc(100vh-40px)] sm:w-[400px] sm:rounded-[26px] sm:border sm:border-white/10"
      aria-label="Soporte de TheDulcanDesign"
    >
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 pb-4">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
        <div className="flex items-start justify-between">
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex -space-x-2">
                {onlineAgents.length > 0 ? (
                  onlineAgents.slice(0, 3).map((agent) => (
                    <img
                      key={agent.id}
                      src={agent.avatar_url || `https://cdn.discordapp.com/embed/avatars/${agent.id.slice(0, 1)}.png`}
                      alt={agent.full_name || 'Agente'}
                      className="w-9 h-9 rounded-full border-2 border-white object-cover"
                    />
                  ))
                ) : (
                  <>
                    <span className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-white bg-black text-xs font-bold text-white">S</span>
                    <span className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-white bg-black text-xs font-bold text-white">P</span>
                    <span className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-white bg-black text-xs font-bold text-white">T</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 backdrop-blur">
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                <span className="text-xs font-semibold text-white">
                  {isOnline ? `${onlineAgents.length} en línea` : 'Fuera de horario'}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              {assignedAgentName ? `Soporte con ${assignedAgentName}` : 'Soporte'}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <ShieldCheck size={14} />
              {['admin', 'staff', 'owner'].includes(currentUser?.role) 
                ? 'Puedes responder directamente a este chat' 
                : isOnline ? 'Normalmente respondemos en menos de 5 minutos' : 'Responderemos en cuanto volvamos'}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/20 transition-colors hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Cerrar chat"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Tabs */}
        <nav className="relative mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1" aria-label="Secciones de soporte">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-bold transition-all ${
              tab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MessagesSquare size={16} />
            Conversación
          </button>
          <button
            onClick={() => setTab('articles')}
            className={`flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-bold transition-all ${
              tab === 'articles' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen size={16} />
            Artículos
          </button>
        </nav>
      </header>

      {/* Content */}
      {tab === 'articles' ? (
        <div className="flex-1 space-y-3 overflow-auto bg-[#0d0d12] p-5">
          <div className="relative mb-4">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={articleSearch}
              onChange={(event) => setArticleSearch(event.target.value)}
              placeholder="Buscar en el centro de ayuda"
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Respuestas rápidas</p>
              <p className="text-xs text-white/45">Elige un tema para comenzar</p>
            </div>
            <BookOpen size={20} className="text-indigo-400" />
          </div>
          {filteredArticles.map((article, index) => (
            <article
              key={index}
              onClick={() => {
                setText(article.message)
                setTab('chat')
              }}
              className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-indigo-400/60 hover:bg-white/[0.07]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><BookOpen size={18} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white">{article.title}</h3>
                <p className="mt-1 text-sm text-white/45">{article.description}</p>
              </div>
              <ChevronRight size={18} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" />
            </article>
          ))}
          {filteredArticles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center">
              <p className="font-semibold text-white">No encontramos ese tema</p>
              <button onClick={() => { setText(`Hola, necesito ayuda con: ${articleSearch}`); setTab('chat') }} className="mt-3 text-sm font-bold text-indigo-300 hover:text-indigo-200">
                Preguntar al equipo
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="relative flex-1 space-y-3 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] p-4"
          >
            {authLoading ? (
              <div className="p-4 bg-[#1a1a1a] rounded-2xl text-sm text-[#ededed] border border-[#333333] text-center">
                <p>Cargando...</p>
              </div>
            ) : !isAuthenticated ? (
              <div className="p-4 bg-[#1a1a1a] border border-blue-500/50 rounded-2xl text-center">
                <p className="text-sm text-blue-400 font-bold mb-2">🔒 Inicia sesión para chatear</p>
                <p className="text-sm text-[#6b7280]">
                  Debes iniciar sesión para enviar mensajes a nuestro equipo de soporte.
                </p>
                <a
                  href="/auth/login"
                  className="inline-block mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Iniciar sesión
                </a>
              </div>
            ) : !isOnline ? (
              <div className="p-4 bg-[#1a1a1a] border border-yellow-500/50 rounded-2xl text-center">
                <p className="text-sm text-yellow-400">
                  ⚠️ Nuestro equipo está actualmente offline. Déjanos un mensaje y te responderemos lo antes posible.
                </p>
              </div>
            ) : session?.status === 'closed' ? (
              <div className="p-4 bg-[#1a1a1a] border border-green-500/50 rounded-2xl text-center">
                <p className="text-sm text-green-400 font-bold mb-2">✅ Chat cerrado</p>
                <p className="text-sm text-[#6b7280]">
                  Este chat ha sido cerrado por nuestro equipo de soporte. Si necesitas más ayuda, puedes iniciar un nuevo chat.
                </p>
                <button
                  onClick={() => {
                    setSession(null)
                    setMessages([])
                  }}
                  className="inline-block mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Iniciar nuevo chat
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-5 text-sm text-white shadow-lg">
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                    <Sparkles size={21} />
                  </span>
                  <p className="text-lg font-black">¡Hola! ¿Cómo podemos ayudarte?</p>
                  <p className="mt-2 leading-relaxed text-white/55">
                    Habla con nuestro equipo sobre OBS, streaming, optimización, pagos o soporte técnico.
                  </p>
                </div>
                <div>
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.16em] text-white/35">Comenzar rápidamente</p>
                  <div className="space-y-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => setText(action.message)}
                        className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-indigo-400/50 hover:bg-indigo-500/10"
                      >
                        {action.label}
                        <ChevronRight size={17} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {messages.map((message) => {
              const isClient = message.sender_role === 'client'
              const isAttachment = message.message_type === 'attachment'
              const isImage = isAttachment && message.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`min-w-0 max-w-[80%] rounded-2xl p-3 ${
                      isClient
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-[#1a1a1a] border border-[#333333] text-[#ededed]'
                    }`}
                  >
                    {isImage && message.attachment_path && (
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${message.attachment_path}`}
                        alt={message.attachment_name}
                        className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedImage(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${message.attachment_path}`)}
                        onError={(e) => {
                        }}
                      />
                    )}
                    {isAttachment && !isImage && (
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip size={16} />
                        <span className="min-w-0 break-words [overflow-wrap:anywhere] text-sm">{message.attachment_name}</span>
                      </div>
                    )}
                    {!isAttachment && <p className="break-words [overflow-wrap:anywhere] text-sm">{message.message}</p>}
                    <p
                      className={`text-xs mt-1 ${
                        isClient ? 'text-white/80' : 'text-[#6b7280]'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] border border-[#333333] rounded-2xl p-3">
                  <p className="text-sm text-[#6b7280]">Escribiendo...</p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 bg-[#15151c] p-3 sm:p-4">
            {showEmojiPicker && (
              <div className="mb-3 rounded-2xl border border-white/10 bg-[#0d0d12] p-3 shadow-xl">
                <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto">
                  {PROFESSIONAL_EMOJIS.map(emoji => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="rounded-lg p-1 text-xl transition-colors hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-end gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Adjuntar archivo"
              >
                {uploadingFile ? '...' : <Paperclip size={20} />}
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  ['admin', 'staff', 'owner'].includes(currentUser?.role)
                    ? 'Responde como agente de soporte...'
                    : 'Escribe tu mensaje...'
                }
                className="min-h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Emoji"
              >
                <Smile size={20} />
              </button>
              <button
                type="submit"
                disabled={!text.trim() || loading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Enviar mensaje"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}

      {/* Lightbox para ver imagen en grande */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedImage(null)}
            aria-label="Cerrar"
          >
            <X size={32} />
          </button>
          <img
            src={selectedImage}
            alt="Imagen en grande"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
