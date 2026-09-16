import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'href'> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  href?: string
  target?: string
  rel?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", href, target, rel, children, ...props }, ref) => {
    const buttonClasses = cn(
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
      {
        "bg-primary text-white hover:bg-primary/90": variant === "primary",
        "bg-secondary text-white hover:bg-secondary/90": variant === "secondary",
        "border border-border bg-transparent hover:bg-card": variant === "outline",
        "hover:bg-card/50": variant === "ghost",
        "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
        "h-8 px-3 text-sm": size === "sm",
        "h-10 px-4": size === "md",
        "h-12 px-6 text-lg": size === "lg",
      },
      className
    )

    if (href) {
      return (
        <Link href={href} className={buttonClasses} target={target} rel={rel}>
          {children}
        </Link>
      )
    }

    return (
      <button
        className={buttonClasses}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
