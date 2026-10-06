import { create } from 'zustand'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (type: NotificationType, message: string, duration?: number) => void
  removeNotification: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const DEFAULT_DURATION = 5000

function showDesktopNotification(type: NotificationType, message: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  const titles: Record<NotificationType, string> = { success: 'Operación completada', error: 'Ocurrió un error', warning: 'Atención', info: 'TheDulcanDesign' }
  new window.Notification(titles[type], { body: message, icon: '/icon-192.png', badge: '/favicon-48x48.png' })
}

function appendNotification(set: (updater: (state: NotificationStore) => Partial<NotificationStore>) => void, type: NotificationType, message: string, duration = DEFAULT_DURATION) {
  const id = crypto.randomUUID()
  const notification: Notification = { id, type, message, duration }
  set((state) => ({ notifications: [...state.notifications, notification] }))
  showDesktopNotification(type, message)
  window.setTimeout(() => {
    set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) }))
  }, duration)
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (type, message, duration = DEFAULT_DURATION) => appendNotification(set, type, message, duration),
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
  },
  success: (message, duration = DEFAULT_DURATION) => appendNotification(set, 'success', message, duration),
  error: (message, duration = DEFAULT_DURATION) => appendNotification(set, 'error', message, duration),
  warning: (message, duration = DEFAULT_DURATION) => appendNotification(set, 'warning', message, duration),
  info: (message, duration = DEFAULT_DURATION) => appendNotification(set, 'info', message, duration),
}))
