'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, BellRing } from 'lucide-react'
import { useNotificationStore, Notification as AppNotification } from '@/lib/notifications-store'

interface NotificationItemProps {
  notification: AppNotification
}

const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { type, message } = notification
  const removeNotification = useNotificationStore((state) => state.removeNotification)

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  }

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/50',
    error: 'bg-red-500/10 border-red-500/50',
    warning: 'bg-yellow-500/10 border-yellow-500/50',
    info: 'bg-blue-500/10 border-blue-500/50'
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${bgColors[type]} bg-[#1a1a1a] animate-in slide-in-from-right duration-300`}
    >
      {icons[type]}
      <div className="flex-1">
        <p className="text-sm text-[#ededed]">{message}</p>
      </div>
      <button
        onClick={() => removeNotification(notification.id)}
        className="text-[#6b7280] hover:text-[#ededed] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export const Notifications = () => {
  const notifications = useNotificationStore((state) => state.notifications)
  const success = useNotificationStore((state) => state.success)
  const warning = useNotificationStore((state) => state.warning)
  const [showPermission, setShowPermission] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || window.Notification.permission !== 'default' || localStorage.getItem('tdd-notification-prompt-dismissed') === '1') return
    const timer = window.setTimeout(() => setShowPermission(true), 2500)
    return () => window.clearTimeout(timer)
  }, [])

  const requestDesktopNotifications = async () => {
    const permission = await window.Notification.requestPermission()
    setShowPermission(false)
    if (permission === 'granted') {
      success('Notificaciones de escritorio activadas.')
      new window.Notification('TheDulcanDesign', { body: 'Recibirás avisos importantes aunque esta pestaña esté en segundo plano.', icon: '/icon-192.png' })
    } else {
      warning('El navegador no permitió las notificaciones de escritorio.')
    }
  }

  const dismissPermission = () => {
    localStorage.setItem('tdd-notification-prompt-dismissed', '1')
    setShowPermission(false)
  }

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto"><NotificationItem notification={notification} /></div>
      ))}
      {showPermission && <div className="pointer-events-auto overflow-hidden rounded-2xl border border-primary/35 bg-[#141622]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><BellRing className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-bold text-white">Activa las notificaciones</p><p className="mt-1 text-xs leading-relaxed text-white/60">Recibe avisos importantes de pedidos y soporte en el escritorio.</p></div><button onClick={dismissPermission} aria-label="Cerrar solicitud de notificaciones" className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div><div className="mt-4 flex gap-2"><button onClick={dismissPermission} className="h-10 flex-1 rounded-xl border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/5">Ahora no</button><button onClick={() => void requestDesktopNotifications()} className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-white hover:brightness-110">Activar</button></div></div>}
    </div>
  )
}
