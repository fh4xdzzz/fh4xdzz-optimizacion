'use client'

import { ReactNode } from 'react'
import { Notifications, useNotifications } from './notifications'

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { notifications, removeNotification } = useNotifications()

  return (
    <>
      {children}
      <Notifications notifications={notifications} onClose={removeNotification} />
    </>
  )
}
