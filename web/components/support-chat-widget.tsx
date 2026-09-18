'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { MessageCircle, X, Send, Paperclip, Smile, BookOpen, MessagesSquare, User } from 'lucide-react'
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

export default function SupportChatWidget() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'chat' | 'articles'>('chat')
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
    { title: 'Cómo configurar OBS para Twitch/Kick', description: 'Guía rápida del centro de ayuda.' },
    { title: 'Optimizar Windows para gaming', description: 'Mejora el rendimiento de tu PC.' },
    { title: 'Solucionar pérdida de frames', description: 'Tips para streaming estable.' },
    { title: 'Configurar bitrate, encoder y audio', description: 'Configuración profesional.' }
  ]

  // Cargar sesión del usuario
  useEffect(() => {
    loadUserSession()
  }, [])

  // Cargar sesión del usuario
  async function loadUserSession() {
    try {
      setAuthLoading(true)
      const userSession = await getSession()
      if (!userSession) {
        console.log('No user session found')
        setIsAuthenticated(false)
        setCurrentUser(null)
        setAuthLoading(false)
        return
      }

      console.log('User session found:', userSession.user.id, userSession.user.role)
      
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
      console.error('Error loading user session:', error)
      setIsAuthenticated(false)
    } finally {
      setAuthLoading(false)
    }
  }

  // Suscribirse a cambios en tiempo real para session (siempre activo)
  useEffect(() => {
    if (!session) return

    console.log('Setting up Realtime subscription for session status (always active):', session.id)

    const channel = supabase
      .channel(`session-status:${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        console.log('Session status changed:', payload.new.status)
        const updatedSession = payload.new as ChatSession
        setSession(updatedSession)
        
        // Si la sesión se cerró, limpiar mensajes
        if (updatedSession.status === 'closed') {
          setMessages([])
        }
      })
      .subscribe((status) => {
        console.log('Session status Realtime subscription status:', status)
      })

    return () => {
      console.log('Cleaning up session status Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [session?.id])

  // Suscribirse a cambios en tiempo real para mensajes (siempre activo para recibir notificaciones)
  useEffect(() => {
    if (!session) return

    console.log('Setting up Realtime subscription for session:', session.id)

    const channel = supabase
      .channel(`messages:${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        console.log('Realtime INSERT received:', payload)
        const newMessage = payload.new as Message
        
        // Verificar si el mensaje ya existe para evitar duplicados
        setMessages(prev => {
          if (prev.some(msg => msg.id === newMessage.id)) {
            console.log('Message already exists, skipping:', newMessage.id)
            return prev
          }
          
          // Solo agregar mensajes al estado si el chat está abierto
          if (!open) {
            console.log('Chat is closed, not adding message to state')
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
          console.log('Adding new message:', cleanMessage.id)
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
        console.log('Realtime UPDATE received:', payload)
        const updatedSession = payload.new as ChatSession
        setSession(updatedSession)
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    channelRef.current = channel

    return () => {
      console.log('Cleaning up Realtime subscription')
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
      console.error('Error loading messages:', error)
    }
  }

  // Crear nueva sesión de chat
  async function createSession() {
    if (session) return session

    console.log('Creating chat session...')
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

      console.log('Session API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Session created:', data.session)
        setSession(data.session)
        loadMessages(data.session.id)
        return data.session
      } else {
        const error = await response.json()
        console.error('Session creation failed:', error)
      }
    } catch (error) {
      console.error('Error creating session:', error)
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
      console.error('Error uploading file:', error)
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
      console.error('Error sending message:', error)
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
        console.error('Error loading online agents:', error)
      }
    }

    loadOnlineAgents()
  }, [])

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setUnread(0)
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110"
        aria-label="Abrir chat de soporte"
      >
        <MessageCircle size={28} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 min-w-6 rounded-full bg-red-600 text-xs font-bold text-white border-2 border-white animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col w-[390px] max-w-[calc(100vw-24px)] h-[720px] max-h-[90vh] bg-[#1a1a1a] rounded-[28px] shadow-2xl overflow-hidden border border-[#333333]">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 p-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
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
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs font-semibold text-white/90">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-black text-white">Soporte</h2>
            <p className="mt-1 text-sm text-white/90">
              Normalmente responde en menos de 5 minutos
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Cerrar chat"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Tabs */}
        <nav className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/20">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-bold transition-colors ${
              tab === 'chat' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'
            }`}
          >
            <MessagesSquare size={16} />
            Conversación
          </button>
          <button
            onClick={() => setTab('articles')}
            className={`flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-bold transition-colors ${
              tab === 'articles' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'
            }`}
          >
            <BookOpen size={16} />
            Artículos
          </button>
        </nav>
      </header>

      {/* Content */}
      {tab === 'articles' ? (
        <div className="flex-1 overflow-auto p-5 space-y-3 bg-[#0a0a0a]">
          {articles.map((article, index) => (
            <article
              key={index}
              className="p-4 bg-[#1a1a1a] rounded-2xl border border-[#333333] hover:border-blue-500 transition-colors cursor-pointer"
            >
              <h3 className="font-bold text-[#ededed]">{article.title}</h3>
              <p className="mt-1 text-sm text-[#6b7280]">{article.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-auto p-4 space-y-3 bg-[#0a0a0a] relative"
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
              <div className="p-4 bg-[#1a1a1a] rounded-2xl text-sm text-[#ededed] border border-[#333333]">
                <p className="font-bold">¡Hola! 👋</p>
                <p className="mt-2">
                  Bienvenido a nuestro soporte. Estamos aquí para ayudarte con OBS, streaming, PC, gaming y soporte técnico.
                </p>
                <p className="mt-2">Cuéntanos qué problema tienes y te ayudaremos.</p>
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
                    className={`max-w-[80%] rounded-2xl p-3 ${
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
                        onLoad={() => console.log('Image loaded successfully:', message.attachment_path)}
                        onError={(e) => {
                          console.error('Error loading image:', message.attachment_path)
                          console.error('Image URL:', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${message.attachment_path}`)
                        }}
                      />
                    )}
                    {isAttachment && !isImage && (
                      <div className="flex items-center gap-2 mb-2">
                        <Paperclip size={16} />
                        <span className="text-sm">{message.attachment_name}</span>
                      </div>
                    )}
                    {!isAttachment && <p className="text-sm">{message.message}</p>}
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
          <div className="p-4 bg-[#1a1a1a] border-t border-[#333333]">
            {showEmojiPicker && (
              <div className="mb-4 p-4 bg-[#0a0a0a] border border-[#333333] rounded-2xl">
                <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-2xl hover:bg-[#333333] rounded p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-center gap-2">
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
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#333333] transition-colors text-[#6b7280]"
                aria-label="Adjuntar archivo"
              >
                {uploadingFile ? '...' : <Paperclip size={20} />}
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 bg-[#0a0a0a] rounded-full text-sm text-[#ededed] focus:outline-none focus:ring-2 focus:ring-blue-500 border border-[#333333]"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#333333] transition-colors text-[#6b7280]"
                aria-label="Emoji"
              >
                <Smile size={20} />
              </button>
              <button
                type="submit"
                disabled={!text.trim() || loading}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}
