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

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (type, message, duration = 5000) => {
    const id = crypto.randomUUID()
    const notification: Notification = { id, type, message, duration }
    set((state) => ({ notifications: [...state.notifications, notification] }))

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }))
    }, duration)
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
  },
  success: (message, duration) => {
    set((state) => {
      const id = crypto.randomUUID()
      const notification: Notification = { id, type: 'success', message, duration }
      const notifications = [...state.notifications, notification]
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id)
        }))
      }, duration)
      return { notifications }
    })
  },
  error: (message, duration) => {
    set((state) => {
      const id = crypto.randomUUID()
      const notification: Notification = { id, type: 'error', message, duration }
      const notifications = [...state.notifications, notification]
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id)
        }))
      }, duration)
      return { notifications }
    })
  },
  warning: (message, duration) => {
    set((state) => {
      const id = crypto.randomUUID()
      const notification: Notification = { id, type: 'warning', message, duration }
      const notifications = [...state.notifications, notification]
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id)
        }))
      }, duration)
      return { notifications }
    })
  },
  info: (message, duration) => {
    set((state) => {
      const id = crypto.randomUUID()
      const notification: Notification = { id, type: 'info', message, duration }
      const notifications = [...state.notifications, notification]
      setTimeout(() => {
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id)
        }))
      }, duration)
      return { notifications }
    })
  }
}))
