'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

function openSupportChat() {
  window.dispatchEvent(new CustomEvent('open-support-chat'))
}

export function SupportChatButton({ children, ...props }: ButtonProps) {
  return (
    <Button type="button" onClick={openSupportChat} {...props}>
      {children}
    </Button>
  )
}

interface SupportChatLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function SupportChatLink({ children, ...props }: SupportChatLinkProps) {
  return (
    <button type="button" onClick={openSupportChat} {...props}>
      {children}
    </button>
  )
}

