'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

function openSupportChat(message?: string) {
  window.dispatchEvent(new CustomEvent('open-support-chat', {
    detail: { message, asCustomer: true },
  }))
}

interface SupportChatButtonProps extends ButtonProps {
  message?: string
}

export function SupportChatButton({ children, message, ...props }: SupportChatButtonProps) {
  return (
    <Button type="button" onClick={() => openSupportChat(message)} {...props}>
      {children}
    </Button>
  )
}

interface SupportChatLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function SupportChatLink({ children, ...props }: SupportChatLinkProps) {
  return (
    <button type="button" onClick={() => openSupportChat()} {...props}>
      {children}
    </button>
  )
}

