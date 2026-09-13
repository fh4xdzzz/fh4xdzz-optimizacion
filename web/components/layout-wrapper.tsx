'use client'

import { ReactNode } from 'react'
import ChatWidget from './chat-widget'

interface LayoutWrapperProps {
  children: ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  )
}
