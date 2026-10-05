'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ShieldCheck, X } from "lucide-react"

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
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-scale"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            "relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-primary/25 bg-[#12121c] p-6 shadow-2xl shadow-black/70 animate-fade-in-scale",
            className
          )}
        >
          {/* Header */}
          <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 rounded-xl border border-white/10 p-2 text-muted hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          <div className="mb-5 flex gap-4 pr-10">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border', variant === 'destructive' ? 'border-red-400/30 bg-red-500/10 text-red-300' : 'border-primary/30 bg-primary/10 text-primary')}>
              {variant === 'destructive' ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div><h3 id="confirmation-title" className="mb-2 text-2xl font-bold text-white">
              {title}
            </h3>
            {description && (
              <p className="text-muted text-base">
                {description}
              </p>
            )}</div>
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
