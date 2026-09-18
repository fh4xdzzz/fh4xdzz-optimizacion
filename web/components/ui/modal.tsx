'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  children?: React.ReactNode
  className?: string
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = 'default',
    children,
    className 
  }, ref) => {
    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose()
        }
      }
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // Prevent body scroll when modal is open
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'unset'
      }
      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [isOpen])

    if (!isOpen) return null

    const handleConfirm = () => {
      if (onConfirm) {
        onConfirm()
      }
      onClose()
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-scale"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            "relative z-10 w-full max-w-md glass-card glowing-border rounded-2xl p-6 animate-fade-in-scale",
            className
          )}
        >
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-2xl font-bold gradient-text-primary mb-2">
              {title}
            </h3>
            {description && (
              <p className="text-muted text-base">
                {description}
              </p>
            )}
          </div>

          {/* Content */}
          {children && (
            <div className="mb-6">
              {children}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="border border-border bg-transparent"
            >
              {cancelText}
            </Button>
            {onConfirm && (
              <Button
                variant={variant === 'destructive' ? 'destructive' : 'primary'}
                onClick={handleConfirm}
                className={variant === 'default' ? 'shimmer-button' : ''}
              >
                {confirmText}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }
)

Modal.displayName = "Modal"

export { Modal }
