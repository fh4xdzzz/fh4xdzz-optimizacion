'use client'

import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useNotificationStore, Notification } from '@/lib/notifications-store'

interface NotificationItemProps {
  notification: Notification
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

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  )
}
