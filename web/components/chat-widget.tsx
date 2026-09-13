'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

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

  const supabase = createClient()

  // Cargar mensajes cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      loadMessages()
      // Marcar mensajes como leídos al abrir
      markAsRead()
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

  // Verificar si es admin
  useEffect(() => {
    const checkAdmin = async () => {
      const session = await getSession()
      if (session?.user?.role === 'admin') {
        setIsAdmin(true)
        loadUsers()
      }
    }
    checkAdmin()
  }, [])

  const loadUsers = async () => {
    console.log('Cargando usuarios que contactaron al soporte...')
    try {
      // Cargar usuarios que tienen mensajes en chat_messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('user_id')
        .neq('is_from_admin', true)

      if (!messages || messages.length === 0) {
        setUsers([])
        return
      }

      // Obtener IDs únicos de usuarios
      const userIds = [...new Set(messages.map((m: any) => m.user_id))]

      // Cargar datos de esos usuarios
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds)
        .neq('role', 'admin')

      if (error) {
        console.error('Error al cargar usuarios:', error)
      } else {
        console.log('Usuarios que contactaron:', users)
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
      if (!session) {
        console.log('No hay sesión')
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

      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData)

      if (error) {
        console.error('Error de Supabase:', error)
        throw error
      }

      console.log('Mensaje enviado exitosamente')
      setNewMessage('')
      loadMessages()
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
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
        console.log('Cerrando chat del usuario:', selectedUserId)
        // Admin cierra el chat del usuario (marca todos como cerrados)
        const { error } = await supabase
          .from('chat_messages')
          .update({ is_closed: true })
          .eq('user_id', selectedUserId)

        if (error) {
          console.error('Error al cerrar chat:', error)
          throw error
        }

        console.log('Chat cerrado exitosamente')
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
          className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-primary/90 hover:to-primary/70 transition-all transform hover:scale-105 relative"
        >
          {isOpen ? '✕' : '💬'}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute bottom-20 right-0 w-[450px] h-[600px] bg-gradient-to-br from-slate-900 to-slate-800 border border-primary/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">Chat de Soporte - Admin</h3>
                  <p className="text-sm text-white/70 mt-1">Gestiona conversaciones con clientes</p>
                </div>
                {selectedUserId && (
                  <div className="flex gap-2">
                    <button
                      onClick={claimChat}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      🎫 Reclamar
                    </button>
                    <button
                      onClick={closeChat}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                    >
                      ❌ Cerrar Chat
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUserId(null)
                        setMessages([])
                      }}
                      className="px-3 py-1.5 bg-slate-500/20 text-slate-400 rounded-lg text-sm hover:bg-slate-500/30 transition-colors"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                className="w-full mt-4 px-4 py-3 rounded-xl border border-primary/30 bg-slate-800/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Seleccionar usuario...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {selectedUserId ? (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/50">
                  {loading ? (
                    <div className="text-center text-white/50 py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p>Cargando mensajes...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-white/50 py-8">
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
                          className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${
                            msg.is_from_admin
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-none'
                              : 'bg-slate-700 text-white rounded-bl-none'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-2 text-white/60">
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

                <div className="p-6 border-t border-primary/30 bg-slate-800/50">
                  <form onSubmit={sendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 px-4 py-3 rounded-xl border border-primary/30 bg-slate-700/50 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Enviar
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/50">
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
        className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-primary/90 hover:to-primary/70 transition-all transform hover:scale-105 relative"
      >
        {isOpen ? '✕' : '💬'}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[450px] h-[600px] bg-gradient-to-br from-slate-900 to-slate-800 border border-primary/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">Chat de Soporte</h3>
                <p className="text-sm text-white/70 mt-1">Habla con nuestro equipo de soporte</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/50">
            {loading ? (
              <div className="text-center text-white/50 py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Cargando mensajes...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-white/50 py-8">
                <p className="text-4xl mb-2">👋</p>
                <p className="text-lg">¡Hola! ¿En qué podemos ayudarte hoy?</p>
                <p className="text-sm mt-2">Estamos aquí para responder tus preguntas</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${
                      msg.is_from_admin
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-none'
                        : 'bg-slate-700 text-white rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-2 text-white/60">
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

          <div className="p-6 border-t border-primary/30 bg-slate-800/50">
            <form onSubmit={sendMessage} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-3 rounded-xl border border-primary/30 bg-slate-700/50 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
