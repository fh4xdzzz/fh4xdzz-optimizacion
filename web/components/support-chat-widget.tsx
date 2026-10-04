'use client'

import Link from 'next/link'
import { Fragment, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { MessageCircle, X, Send, Paperclip, Smile, BookOpen, MessagesSquare, Search, ShieldCheck, Sparkles, ChevronRight, Bot } from 'lucide-react'
import { useNotificationStore } from '@/lib/notifications-store'

interface Message {
  id: string
  sender_id: string | null
  sender_role: string
  message: string
  message_type: string
  created_at: string
  read_at: string | null
  attachment_path?: string
  attachment_name?: string
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
const SUPPORT_ROLES = ['admin', 'staff', 'owner']

const QUICK_ACTIONS = [
  { label: 'Problema técnico', message: 'Hola, necesito ayuda con un problema técnico.' },
  { label: 'OBS o streaming', message: 'Hola, necesito ayuda con OBS o mi configuración de streaming.' },
  { label: 'Pagos y pedidos', message: 'Hola, necesito ayuda con un pago o pedido.' },
]

const MESSAGE_URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi
const INTERNAL_HOSTS = new Set(['thedulcandesign.com', 'www.thedulcandesign.com'])
const INTAKE_PROMPT_PREFIX = '[DULCAN_INTAKE] '

function LinkifiedMessage({ text, onInternalNavigate }: { text: string; onInternalNavigate: () => void }) {
  return (
    <>
      {text.split(MESSAGE_URL_PATTERN).map((part, index) => {
        if (!/^(?:https?:\/\/|www\.)/i.test(part)) return part

        const trailingPunctuation = part.match(/[),.!?;:]+$/)?.[0] || ''
        const displayedUrl = trailingPunctuation ? part.slice(0, -trailingPunctuation.length) : part
        const absoluteUrl = displayedUrl.startsWith('www.') ? `https://${displayedUrl}` : displayedUrl

        try {
          const parsedUrl = new URL(absoluteUrl)
          const isInternal = INTERNAL_HOSTS.has(parsedUrl.hostname.toLowerCase())
          const linkClass = 'font-semibold text-cyan-200 underline decoration-cyan-300/60 underline-offset-2 transition hover:text-white'

          return (
            <Fragment key={`${displayedUrl}-${index}`}>
              {isInternal ? (
                <Link
                  href={`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`}
                  className={linkClass}
                  onClick={onInternalNavigate}
                >
                  {displayedUrl}
                </Link>
              ) : (
                <a href={parsedUrl.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {displayedUrl}
                </a>
              )}
              {trailingPunctuation}
            </Fragment>
          )
        } catch {
          return part
        }
      })}
    </>
  )
}

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
  const [assignedAgent, setAssignedAgent] = useState<Message['sender']>(null)
  const [aiTyping, setAiTyping] = useState(false)
  const [intakeProblem, setIntakeProblem] = useState('')
  const [submittingIntake, setSubmittingIntake] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const aiRequestSessionRef = useRef<string | null>(null)
  const aiRecoveryAttemptedRef = useRef(new Set<string>())
  const { warning: notifyWarning, error: notifyError, success: notifySuccess } = useNotificationStore()

  const openRef = useRef(open)
  const currentUserIdRef = useRef<string | undefined>(currentUser?.id)
  openRef.current = open
  currentUserIdRef.current = currentUser?.id

  useEffect(() => {
    const openFromOrder = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      setOpen(true)
      setTab('chat')
      if (detail?.message) setText(detail.message)
    }
    window.addEventListener('open-support-chat', openFromOrder)
    return () => window.removeEventListener('open-support-chat', openFromOrder)
  }, [])

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

  // Cargar sesión del usuario
  useEffect(() => {
    loadUserSession()
  }, [])

  // Cargar nombre del agente cuando la sesión cambia
  useEffect(() => {
    if (session?.assigned_agent_id) {
      loadAssignedAgentName(session.assigned_agent_id)
    } else {
      setAssignedAgent(null)
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
          const isSupportUser = SUPPORT_ROLES.includes(userSession.user.role || '')
          const activeSession = data.sessions.find((s: ChatSession) => (
            ['waiting', 'active', 'pending'].includes(s.status)
            && (!isSupportUser || s.assigned_agent_id === userSession.user.id)
          ))
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

  // Los agentes solo ven la burbuja mientras tienen un soporte activo asignado.
  // La consulta periódica sirve como respaldo si Realtime todavía no notificó
  // una reclamación o transferencia realizada desde el panel.
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || !SUPPORT_ROLES.includes(currentUser.role || '')) return

    let cancelled = false
    const syncAssignedSupport = async () => {
      try {
        const response = await fetch('/api/chat/sessions', { cache: 'no-store' })
        if (!response.ok || cancelled) return

        const data = await response.json()
        const assignedSession = data.sessions?.find((item: ChatSession) => (
          item.assigned_agent_id === currentUser.id
          && ['waiting', 'active', 'pending'].includes(item.status)
        )) as ChatSession | undefined

        if (!assignedSession) {
          if (session?.assigned_agent_id === currentUser.id) {
            setSession(null)
            setMessages([])
            setOpen(false)
          }
          return
        }

        setSession(assignedSession)
        if (session?.id !== assignedSession.id) {
          shouldAutoScrollRef.current = true
          await loadMessages(assignedSession.id)
        }
      } catch {
        // Realtime seguirá actualizando la sesión si una consulta puntual falla.
      }
    }

    syncAssignedSupport()
    const interval = window.setInterval(syncAssignedSupport, 3000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isAuthenticated, currentUser?.id, currentUser?.role, session?.id, session?.assigned_agent_id])

  // Cargar nombre del agente asignado
  async function loadAssignedAgentName(agentId: string | null) {
    if (!agentId) {
      setAssignedAgent(null)
      return
    }

    try {
      const supabase = createClient()
      const { data: agent } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, discord_avatar, role, online')
        .eq('id', agentId)
        .single()

      if (agent) {
        setAssignedAgent(agent)
      } else {
        setAssignedAgent(null)
      }
    } catch (error) {
      setAssignedAgent(null)
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

    const isClientViewer = currentUser?.role === 'client'
    let channel = supabase.channel(
      isClientViewer
        ? `messages:${session.id}`
        : `support-widget-messages:${session.id}:${currentUser?.id || 'agent'}`
    )

    // El canal compartido de escritura solo lo escucha el cliente. En el panel
    // del agente ya existe un canal emisor con el mismo tema.
    if (isClientViewer) {
      channel = channel.on('broadcast', { event: 'agent_typing' }, ({ payload }) => {
        const typing = payload?.typing === true
        setIsTyping(typing)

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        if (typing) {
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2500)
        }
      })
    }

    channel = channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        const newMessage = payload.new as Message
        
        // Verificar si el mensaje ya existe para evitar duplicados
        if (openRef.current) loadMessages(session.id)

        // Incrementar contador si el chat está cerrado y el mensaje es del soporte
        if (newMessage.sender_id !== currentUserIdRef.current && !openRef.current) {
          setUnread(prev => prev + 1)
        }

        if (newMessage.sender_role !== 'client') {
          setIsTyping(false)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${session.id}`
      }, () => {
        // Actualiza inmediatamente los indicadores de lectura del cliente.
        loadMessages(session.id)
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
    channel.subscribe((status) => {
    })

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      setIsTyping(false)
      supabase.removeChannel(channel)
    }
  }, [session?.id, currentUser?.id, currentUser?.role])

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < 80
  }

  // Al abrir la conversación o volver desde artículos, mostrar el mensaje más reciente.
  useEffect(() => {
    if (!open || tab !== 'chat') return
    shouldAutoScrollRef.current = true
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    })
  }, [open, tab, session?.id])

  // Mantener el final visible solo si el cliente no subió a leer el historial.
  useEffect(() => {
    if (open && tab === 'chat' && shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, open, tab, isTyping, aiTyping])

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

  // Recupera automáticamente una bienvenida que no pudo generarse por un
  // error temporal, sin duplicar solicitudes mientras se envía un mensaje.
  useEffect(() => {
    if (
      currentUser?.role !== 'client'
      || !session?.id
      || session.status === 'closed'
      || session.assigned_agent_id
      || aiRequestSessionRef.current === session.id
      || aiRecoveryAttemptedRef.current.has(session.id)
      || !messages.some(message => message.sender_role === 'client')
      || messages.some(message => message.sender_role === 'assistant')
    ) return

    let cancelled = false
    const recoverAssistant = async () => {
      aiRecoveryAttemptedRef.current.add(session.id)
      aiRequestSessionRef.current = session.id
      setAiTyping(true)
      try {
        const response = await fetch('/api/chat/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.id }),
        })
        if (response.ok && !cancelled) await loadMessages(session.id)
      } finally {
        if (aiRequestSessionRef.current === session.id) aiRequestSessionRef.current = null
        if (!cancelled) setAiTyping(false)
      }
    }

    void recoverAssistant()
    return () => {
      cancelled = true
    }
  }, [currentUser?.role, session?.id, session?.status, session?.assigned_agent_id, messages])

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

  // La burbuja de un agente también confirma lectura cuando está abierta.
  useEffect(() => {
    if (
      !open
      || !session?.id
      || !SUPPORT_ROLES.includes(currentUser?.role || '')
      || !messages.some(message => message.sender_role === 'client' && !message.read_at)
    ) return

    fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    }).catch(() => {})
  }, [open, session?.id, currentUser?.role, messages])

  // Crear nueva sesión de chat
  async function createSession(forceNew = false) {
    if (session && !forceNew) return session

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
        setMessages([])
        setIntakeProblem('')
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
      const currentSession = session?.status === 'closed'
        ? await createSession(true)
        : session || await createSession()
      if (!currentSession) return

      shouldAutoScrollRef.current = true
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

  async function sendSupportMessage(messageText: string, clearComposer = false) {
    if (!messageText.trim() || loading) return false

    // Verificar autenticación
    if (!isAuthenticated || !currentUser) {
      notifyWarning('Debes iniciar sesión para enviar mensajes')
      return false
    }

    const currentSession = session?.status === 'closed'
      ? await createSession(true)
      : session || await createSession()
    if (!currentSession) return false

    try {
      setLoading(true)
      shouldAutoScrollRef.current = true
      const shouldRequestAi = !currentSession.assigned_agent_id
      if (shouldRequestAi) aiRequestSessionRef.current = currentSession.id
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.id,
          message: messageText.trim(),
          message_type: 'text'
        })
      })

      if (response.ok) {
        if (clearComposer) setText('')
        if (shouldRequestAi) {
          setAiTyping(true)
          try {
            await fetch('/api/chat/ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: currentSession.id }),
            })
            await loadMessages(currentSession.id)
          } finally {
            setAiTyping(false)
          }
        }
        return true
      }
    } catch (error) {
    } finally {
      if (aiRequestSessionRef.current === currentSession.id) aiRequestSessionRef.current = null
      setLoading(false)
    }
    return false
  }

  // Enviar mensaje desde el compositor principal
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    await sendSupportMessage(text, true)
  }

  async function submitIntakeProblem(e: React.FormEvent) {
    e.preventDefault()
    if (!intakeProblem.trim() || submittingIntake) return

    setSubmittingIntake(true)
    try {
      const sent = await sendSupportMessage(`Descripción del problema:\n${intakeProblem.trim()}`)
      if (sent) setIntakeProblem('')
    } finally {
      setSubmittingIntake(false)
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
  const isSupportUser = SUPPORT_ROLES.includes(currentUser?.role || '')

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

  // Evita mostrar brevemente una burbuja incorrecta antes de resolver el rol.
  if (authLoading) return null

  // Para agentes, la burbuja existe únicamente durante su conversación asignada.
  if (isSupportUser && (
    !session
    || session.assigned_agent_id !== currentUser?.id
    || !['waiting', 'active', 'pending'].includes(session.status)
  )) {
    return null
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 right-4 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6">
        <div className="hidden rounded-2xl border border-white/10 bg-[#15151c]/95 px-4 py-3 text-right shadow-2xl backdrop-blur-xl sm:block">
          <p className="text-sm font-bold text-white">¿Necesitas ayuda?</p>
          <p className="mt-0.5 text-xs text-white/60">{isSupportUser ? 'Soporte activo' : isOnline ? 'Estamos en línea' : 'Déjanos un mensaje'}</p>
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
          <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-[#0a0a0a] ${isSupportUser || isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
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
                  {isSupportUser ? session?.conversation_number : isOnline ? `${onlineAgents.length} en línea` : 'Fuera de horario'}
                </span>
              </div>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              {isSupportUser
                ? `Atendiendo ${session?.conversation_number || 'soporte'}`
                : assignedAgent ? `Soporte con ${assignedAgent.full_name || assignedAgent.email?.split('@')[0] || 'tu agente'}` : 'Soporte inteligente'}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
              <ShieldCheck size={14} />
              {isSupportUser
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
            onScroll={handleMessagesScroll}
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

            {messages.map((message, messageIndex) => {
              const isClient = message.sender_role === 'client'
              const isAssistant = message.sender_role === 'assistant'
              const isOwnMessage = message.sender_id === currentUser?.id
              const isAttachment = message.message_type === 'attachment'
              const isIntakePrompt = isAssistant && message.message.startsWith(INTAKE_PROMPT_PREFIX)
              const displayedMessage = isIntakePrompt
                ? message.message.slice(INTAKE_PROMPT_PREFIX.length)
                : message.message
              const intakeCompleted = isIntakePrompt && messages
                .slice(messageIndex + 1)
                .some(item => item.sender_role === 'client')
              const isImage = isAttachment && message.attachment_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              const senderName = isAssistant
                ? 'Dulcan AI'
                : message.sender?.full_name || message.sender?.email?.split('@')[0] || (isClient ? 'Cliente' : 'Agente de soporte')
              const avatar = isAssistant ? '/favicon-master-1024.png' : message.sender?.avatar_url || (message.sender?.discord_avatar && message.sender.id
                ? `https://cdn.discordapp.com/avatars/${message.sender.id}/${message.sender.discord_avatar}.png`
                : null)
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && (
                    <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                      {avatar ? <img src={avatar} alt={senderName} className="h-full w-full object-cover" /> : isAssistant ? <Bot size={17} /> : <span className="text-xs font-black">{senderName.slice(0, 1).toUpperCase()}</span>}
                    </div>
                  )}
                  <div className="min-w-0 max-w-[80%]">
                    {!isOwnMessage && (
                      <div className="mb-1 flex items-center gap-2 px-1">
                        <span className="text-xs font-bold text-white">{senderName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isAssistant ? 'bg-violet-500/20 text-violet-300' : isClient ? 'bg-blue-500/15 text-blue-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                          {isAssistant ? 'Asistente virtual' : isClient ? 'Cliente' : 'Agente verificado'}
                        </span>
                        {!isAssistant && message.sender?.online && <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="En línea" />}
                      </div>
                    )}
                  <div
                    className={`min-w-0 rounded-2xl p-3 ${
                      isOwnMessage
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
                    {!isAttachment && (
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm">
                        <LinkifiedMessage text={displayedMessage} onInternalNavigate={() => setOpen(false)} />
                      </p>
                    )}
                    {isIntakePrompt && !intakeCompleted && !isSupportUser && (
                      <form onSubmit={submitIntakeProblem} className="mt-4 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/30">
                            <img src="/favicon-master-1024.png" alt="TheDulcanDesign" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">Introduce tu problema</p>
                            <p className="text-[11px] text-white/50">Incluye errores, equipo y lo que ya intentaste.</p>
                          </div>
                        </div>
                        <textarea
                          value={intakeProblem}
                          onChange={(event) => setIntakeProblem(event.target.value)}
                          placeholder="Describe aquí qué sucede y qué necesitas lograr..."
                          rows={4}
                          maxLength={2000}
                          className="w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-[10px] text-white/35">{intakeProblem.length}/2000</span>
                          <button
                            type="submit"
                            disabled={!intakeProblem.trim() || submittingIntake || loading}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {submittingIntake ? 'Enviando...' : 'Enviar problema'}
                            {!submittingIntake && <Send size={13} />}
                          </button>
                        </div>
                      </form>
                    )}
                    {isIntakePrompt && intakeCompleted && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                        <ShieldCheck size={14} /> Problema recibido por Dulcan AI
                      </div>
                    )}
                    <div className={`mt-1 flex items-center gap-2 text-xs ${isOwnMessage ? 'justify-end text-white/80' : 'text-[#6b7280]'}`}>
                      <span>{formatTime(message.created_at)}</span>
                      {isOwnMessage && isClient && message.read_at && (
                        <span className="font-semibold text-cyan-100" aria-label="Mensaje visto por soporte">
                          ✓✓ Visto
                        </span>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              )
            })}

            {(isTyping || aiTyping) && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#1a1a1f] px-4 py-3 shadow-sm" role="status" aria-live="polite">
                  <span className="sr-only">{aiTyping ? 'Dulcan AI está escribiendo' : 'El agente está escribiendo'}</span>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
                    {aiTyping && <Bot size={13} />} {aiTyping ? 'Dulcan AI está preparando tu siguiente pregunta' : `${assignedAgent?.full_name || 'Tu agente'} está escribiendo`}
                  </p>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400" />
                  </div>
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
                  session?.status === 'closed'
                    ? 'Escribe para iniciar un nuevo soporte...'
                    : ['admin', 'staff', 'owner'].includes(currentUser?.role)
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

