'use client'

import { useEffect, useRef } from 'react'
import { getSession } from '@/lib/auth-hybrid'

export default function PresenceTracker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function setOnline() {
      try {
        const session = await getSession()
        if (session && ['admin', 'staff', 'owner'].includes(session.user.role)) {
          await fetch('/api/chat/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ online: true }),
          })
        }
      } catch (error) {
        console.error('Error setting online status:', error)
      }
    }

    async function setOffline() {
      try {
        const session = await getSession()
        if (session && ['admin', 'staff', 'owner'].includes(session.user.role)) {
          await fetch('/api/chat/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ online: false }),
          })
        }
      } catch (error) {
        console.error('Error setting offline status:', error)
      }
    }

    // Enviar heartbeat cada 30 segundos
    setOnline()
    intervalRef.current = setInterval(setOnline, 30000)

    // Limpiar al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setOffline()
    }
  }, [])

  return null
}
