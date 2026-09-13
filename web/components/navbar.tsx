'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, signOut } from '@/lib/auth-hybrid'
import { Button } from './ui/button'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState<{ user: { full_name?: string; email: string } } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession()
      setSession(session)
    }

    loadSession()

    // Revisar sesión cada 30 segundos (para modo demo)
    const interval = setInterval(loadSession, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await signOut()
    setSession(null)
    router.push('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-lg">FH4XDZzz OPTIMIZACION</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-foreground/80 hover:text-foreground transition-colors">
              Inicio
            </Link>
            <Link href="/servicios" className="text-foreground/80 hover:text-foreground transition-colors">
              Servicios
            </Link>
            {session ? (
              <>
                <Link href="/dashboard" className="text-foreground/80 hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link href="/pedidos" className="text-foreground/80 hover:text-foreground transition-colors">
                  Mis Pedidos
                </Link>
                <Link href="/perfil" className="text-foreground/80 hover:text-foreground transition-colors">
                  Perfil
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Link href="/pedidos" className="text-foreground/80 hover:text-foreground transition-colors">
                  Mis Pedidos
                </Link>
                <Link href="/auth/login" className="text-foreground/80 hover:text-foreground transition-colors">
                  Login
                </Link>
                <Button variant="primary" href="/auth/register">
                  Registrarse
                </Button>
              </>
            )}
            <Button variant="primary" href="/contacto">
              Solicitar Servicio
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-card/50 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              href="/"
              className="block text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/servicios"
              className="block text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Servicios
            </Link>
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/pedidos"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Mis Pedidos
                </Link>
                <Link
                  href="/perfil"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Perfil
                </Link>
                <Button variant="outline" className="w-full" onClick={() => { handleLogout(); setIsOpen(false); }}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/pedidos"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Mis Pedidos
                </Link>
                <Link
                  href="/auth/login"
                  className="block text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
                <Button variant="primary" href="/auth/register" className="w-full" onClick={() => setIsOpen(false)}>
                  Registrarse
                </Button>
              </>
            )}
            <Button variant="primary" href="/contacto" className="w-full" onClick={() => setIsOpen(false)}>
              Solicitar Servicio
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}