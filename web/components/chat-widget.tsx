'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  user_id: string
  sender_id: string
  message: string
  is_from_admin: boolean
  is_read: boolean
  is_closed: boolean
  assigned_admin_id: string | null
  created_at: string
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const supabase = createClient()

  // Cargar mensajes cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      loadMessages()
      // Marcar mensajes como leídos al abrir
      markAsRead()
      setupRealtimeSubscription()
    } else {
      // Limpiar suscripción cuando se cierra
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isOpen, selectedUserId])

  // Cargar contador de mensajes no leídos periódicamente
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const session = await getSession()
        if (!session) return

        // Cargar todos los mensajes y filtrar en cliente
        const { data } = await supabase
          .from('chat_messages')
          .select('*')

        if (!data) return

        let count = 0
        if (isAdmin) {
          // Admin cuenta mensajes no leídos de clientes
          count = data.filter((msg: any) => !msg.is_from_admin && !msg.is_read).length
        } else {
          // Cliente cuenta mensajes no leídos del admin
          count = data.filter((msg: any) => msg.user_id === session.user.id && msg.is_from_admin && !msg.is_read).length
        }
        setUnreadCount(count)
      } catch (error) {
        console.error('Error al cargar contador de no leídos:', error)
      }
    }

    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 10000) // Actualizar cada 10 segundos
    return () => clearInterval(interval)
  }, [isAdmin])

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Verificar si es admin u owner
  useEffect(() => {
    const checkAdmin = async () => {
      const session = await getSession()
      console.log('Session:', session)
      console.log('User role:', session?.user?.role)
      if (session?.user?.role === 'admin' || session?.user?.role === 'owner') {
        console.log('Usuario es admin u owner, activando modo admin')
        setIsAdmin(true)
        loadUsers()
      } else {
        console.log('Usuario no es admin ni owner, modo cliente')
      }
    }
    checkAdmin()
  }, [])

  const loadUsers = async () => {
    console.log('Cargando usuarios que contactaron al soporte...')
    try {
      // Cargar usuarios que tienen mensajes NO cerrados en chat_messages
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('user_id')
        .eq('is_closed', false)
        .neq('is_from_admin', true)

      if (messagesError) {
        console.error('Error al cargar mensajes:', messagesError)
        setUsers([])
        return
      }

      console.log('Mensajes encontrados:', messages)
      if (!messages || messages.length === 0) {
        console.log('No hay mensajes de clientes')
        setUsers([])
        return
      }

      // Obtener IDs únicos de usuarios
      const userIds = [...new Set(messages.map((m: any) => m.user_id))]
      console.log('User IDs:', userIds)

      // Cargar datos de esos usuarios (excluir admin y owner)
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .in('id', userIds)
        .not('role', 'in', '("admin","owner")')

      if (error) {
        console.error('Error al cargar usuarios:', error)
      } else {
        console.log('Usuarios con chats activos:', users)
        setUsers(users || [])
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      setUsers([])
    }
  }

  const loadMessages = async () => {
    setLoading(true)
    try {
      const session = await getSession()
      if (!session) return

      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })

      if (isAdmin && selectedUserId) {
        console.log('Cargando mensajes del usuario:', selectedUserId)
        query = query.eq('user_id', selectedUserId)
      } else {
        console.log('Cargando mensajes del usuario actual:', session.user.id)
        query = query.eq('user_id', session.user.id).eq('is_closed', false)
      }

      const { data, error } = await query
      if (error) throw error
      console.log('Mensajes cargados:', data)
      setMessages(data || [])
    } catch (error) {
      console.error('Error al cargar mensajes:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = async () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const session = await getSession()
    if (!session) return

    const channel = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: isAdmin && selectedUserId
            ? `user_id=eq.${selectedUserId}`
            : `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log('Nuevo mensaje recibido en tiempo real:', payload)
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])

          // Actualizar contador de no leídos
          if (newMessage.is_from_admin && !isAdmin) {
            setUnreadCount((prev) => prev + 1)
          } else if (!newMessage.is_from_admin && isAdmin) {
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: isAdmin && selectedUserId
            ? `user_id=eq.${selectedUserId}`
            : `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log('Mensaje actualizado en tiempo real:', payload)
          const updatedMessage = payload.new as Message
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          )
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Intentando enviar mensaje:', newMessage)

    if (!newMessage.trim()) {
      console.log('Mensaje vacío, no se envía')
      return
    }

    try {
      const session = await getSession()
      console.log('Sesión:', session)
      console.log('User ID:', session?.user?.id)
      if (!session) {
        console.log('No hay sesión')
        alert('Debes iniciar sesión para enviar mensajes')
        return
      }

      const messageData = {
        user_id: isAdmin && selectedUserId ? selectedUserId : session.user.id,
        sender_id: session.user.id,
        message: newMessage.trim(),
        is_from_admin: isAdmin,
        is_read: false,
      }
      console.log('Datos del mensaje:', messageData)

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()

      if (error) {
        console.error('Error de Supabase:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert('Error al enviar mensaje: ' + error.message)
        throw error
      }

      console.log('Mensaje enviado exitosamente:', data)
      setNewMessage('')
      loadMessages()
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
      alert('Error al enviar mensaje: ' + (error as Error).message)
    }
  }

  const markAsRead = async () => {
    try {
      const session = await getSession()
      if (!session) return

      // Cargar todos los mensajes y actualizar los correspondientes
      const { data } = await supabase
        .from('chat_messages')
        .select('*')

      if (!data) return

      const messagesToUpdate = data.filter((msg: any) => {
        if (isAdmin && selectedUserId) {
          // Admin marca como leídos los mensajes del usuario seleccionado
          return msg.user_id === selectedUserId && !msg.is_from_admin && !msg.is_read
        } else if (!isAdmin) {
          // Cliente marca como leídos los mensajes del admin
          return msg.user_id === session.user.id && msg.is_from_admin && !msg.is_read
        }
        return false
      })

      // Actualizar cada mensaje individualmente
      for (const msg of messagesToUpdate) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('id', msg.id)
      }
    } catch (error) {
      console.error('Error al marcar como leídos:', error)
    }
  }

  const closeChat = async () => {
    try {
      const session = await getSession()
      if (!session) return

      if (isAdmin && selectedUserId) {
        // Admin cierra el chat del usuario (marca todos como cerrados)
        await supabase
          .from('chat_messages')
          .update({ is_closed: true })
          .eq('user_id', selectedUserId)

        setSelectedUserId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error al cerrar chat:', error)
    }
  }

  const claimChat = async () => {
    try {
      const session = await getSession()
      if (!session || !selectedUserId) return

      // Asignar admin al chat
      await supabase
        .from('chat_messages')
        .update({ assigned_admin_id: session.user.id })
        .eq('user_id', selectedUserId)

      // Enviar mensaje automático
      const adminName = session.user.full_name || session.user.email
      await supabase
        .from('chat_messages')
        .insert({
          user_id: selectedUserId,
          sender_id: session.user.id,
          message: `🎫 ${adminName} ha reclamado este chat. Estamos revisando tu solicitud.`,
          is_from_admin: true,
          is_read: false,
          is_closed: false,
        })

      loadMessages()
    } catch (error) {
      console.error('Error al reclamar chat:', error)
    }
  }

  if (isAdmin) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-amber-500 hover:to-amber-600 transition-all transform hover:scale-105 relative"
        >
          {isOpen ? '✕' : '💬'}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute bottom-20 right-0 w-[450px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header Premium */}
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                    Conversación
                  </button>
                  <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                    Artículos
                  </button>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                    TD
                  </div>
                  <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                    AD
                  </div>
                  <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                    ST
                  </div>
                </div>
                <div>
                  <p className="font-bold text-lg">Chatea con nosotros</p>
                  <p className="text-sm opacity-90">Normalmente responde en menos de 5 minutos</p>
                </div>
              </div>

              {selectedUserId && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={claimChat}
                    className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
                  >
                    🎫 Reclamar
                  </button>
                  <button
                    onClick={closeChat}
                    className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
                  >
                    ❌ Cerrar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUserId(null)
                      setMessages([])
                    }}
                    className="px-3 py-1.5 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
                  >
                    ← Volver
                  </button>
                </div>
              )}

              {!selectedUserId && (
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                  className="w-full mt-4 px-4 py-3 rounded-xl bg-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id} className="text-gray-800">
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedUserId ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {loading ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Cargando mensajes...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p className="text-4xl mb-2">💬</p>
                      <p>No hay mensajes</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-4 rounded-2xl shadow-md ${
                            msg.is_from_admin
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-br-none'
                              : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-gray-200 bg-white">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe aquí tu mensaje..."
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        😊
                      </button>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl hover:from-amber-500 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
                    >
                      ➤
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
                <div className="text-center">
                  <p className="text-4xl mb-2">👥</p>
                  <p>Selecciona un usuario para ver el chat</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-amber-500 hover:to-amber-600 transition-all transform hover:scale-105 relative"
      >
        {isOpen ? '✕' : '💬'}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[450px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header Premium */}
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                  Conversación
                </button>
                <button className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
                  Artículos
                </button>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                  TD
                </div>
                <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                  AD
                </div>
                <div className="w-10 h-10 bg-white/30 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                  ST
                </div>
              </div>
              <div>
                <p className="font-bold text-lg">Chatea con nosotros</p>
                <p className="text-sm opacity-90">Normalmente responde en menos de 5 minutos</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
            {loading ? (
              <div className="text-center text-gray-500 py-8">
                <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Cargando mensajes...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-4xl mb-2">👋</p>
                <p className="text-lg font-medium">¡Hola! ¿En qué podemos ayudarte hoy?</p>
                <p className="text-sm mt-2">Estamos aquí para responder tus preguntas</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl shadow-md ${
                      msg.is_from_admin
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <form onSubmit={sendMessage} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe aquí tu mensaje..."
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  😊
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl hover:from-amber-500 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
