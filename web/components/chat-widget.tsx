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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  // Cargar mensajes cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      loadMessages()
    }
  }, [isOpen, selectedUserId])

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
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name')
      .neq('role', 'admin')
    if (data) setUsers(data)
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
        query = query.eq('user_id', selectedUserId)
      } else {
        query = query.eq('user_id', session.user.id)
      }

      const { data, error } = await query
      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error al cargar mensajes:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const session = await getSession()
      if (!session) return

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: isAdmin && selectedUserId ? selectedUserId : session.user.id,
          sender_id: session.user.id,
          message: newMessage.trim(),
          is_from_admin: isAdmin,
          is_read: false,
        })

      if (error) throw error

      setNewMessage('')
      loadMessages()
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    }
  }

  if (isAdmin) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          {isOpen ? '✕' : '💬'}
        </button>

        {isOpen && (
          <div className="absolute bottom-16 right-0 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold">Chat de Soporte - Admin</h3>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                className="w-full mt-2 px-3 py-2 rounded border border-border bg-background text-foreground text-sm"
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loading ? (
                    <p className="text-center text-muted">Cargando mensajes...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-muted">No hay mensajes</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.is_from_admin
                              ? 'bg-primary text-white'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
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

                <div className="p-4 border-t border-border">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                    >
                      Enviar
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted">
                <p>Selecciona un usuario para ver el chat</p>
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
        className="w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold">Chat de Soporte</h3>
            <p className="text-sm text-muted">Habla con nuestro equipo de soporte</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-center text-muted">Cargando mensajes...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted">
                ¡Hola! ¿En qué podemos ayudarte hoy?
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.is_from_admin
                        ? 'bg-primary text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
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

          <div className="p-4 border-t border-border">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
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
