'use client'

import { useEffect, useRef } from 'react'
import { getSession } from '@/lib/auth-hybrid'

export default function PresenceTracker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string | null>(null)
  const userRoleRef = useRef<string | null>(null)

  useEffect(() => {
    async function setOnline() {
      try {
        const session = await getSession()
        if (session && session.user.role && ['admin', 'staff', 'owner'].includes(session.user.role)) {
          // Cache user data for offline detection
          userIdRef.current = session.user.id
          userRoleRef.current = session.user.role

          await fetch('/api/chat/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ online: true }),
          })
        }
      } catch (error) {
      }
    }

    function setOffline() {
      try {
        // Use cached user data for synchronous offline detection
        if (userRoleRef.current && ['admin', 'staff', 'owner'].includes(userRoleRef.current)) {
          const formData = new FormData()
          formData.append('online', 'false')
          navigator.sendBeacon('/api/chat/presence', formData)
        }
      } catch (error) {
      }
    }

    // Enviar heartbeat cada 30 segundos
    setOnline()
    intervalRef.current = setInterval(setOnline, 30000)

    // Evento para detectar cierre de página
    const handleBeforeUnload = () => {
      setOffline()
    }

    // Evento para detectar cuando vuelve a la pestaña (solo marca online, no offline)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setOffline()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
