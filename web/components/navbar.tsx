'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSession, signOut } from '@/lib/auth-hybrid'
import { Button } from './ui/button'

type Session = {
  user: { full_name?: string; email: string; role?: string }
}
type NavItem = {
  href: string
  label: string
  emphasized?: boolean
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const loadSession = async () => setSession(await getSession())
    loadSession()
    const interval = setInterval(loadSession, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const handleLogout = async () => {
    await signOut()
    setSession(null)
    setIsOpen(false)
    router.push('/')
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  const navItems: NavItem[] = [
    { href: '/', label: 'Inicio' },
    { href: '/servicios', label: 'Servicios' },
    ...(session
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/pedidos', label: 'Mis pedidos' },
          { href: '/perfil', label: 'Perfil' },
          ...(['staff', 'admin', 'owner'].includes(session.user.role || '')
            ? [{ href: '/admin', label: session.user.role === 'staff' ? 'Soporte' : 'Admin', emphasized: true }]
            : []),
          ...(session.user.role === 'owner'
            ? [{ href: '/owner', label: 'Owner', emphasized: true }]
            : []),
        ]
      : [
          { href: '/pedidos', label: 'Mis pedidos' },
          { href: '/auth/login', label: 'Iniciar sesión' },
        ]),
  ]

  const linkClass = (item: NavItem, mobile = false) => {
    const active = isActive(item.href)
    return [
      'relative rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      mobile ? 'flex min-h-12 items-center px-4 text-base' : 'px-1 py-2 text-sm',
      active
        ? 'bg-primary/10 text-white md:bg-transparent md:text-white'
        : 'text-foreground/70 hover:bg-white/[.04] hover:text-white md:hover:bg-transparent',
      item.emphasized ? 'font-semibold text-primary' : '',
    ].join(' ')
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[.08] bg-[#090a0f]/85 shadow-[0_8px_35px_rgba(0,0,0,.2)] backdrop-blur-2xl" aria-label="Navegación principal">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link href="/" onClick={() => setIsOpen(false)} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="TheDulcanDesign, ir al inicio">
            <Image src="/icon.png" alt="" width={44} height={44} preload className="h-11 w-11 shrink-0 object-contain" />
            <span className="truncate text-lg font-bold gradient-text-primary sm:text-xl">TheDulcanDesign</span>
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={linkClass(item)} aria-current={isActive(item.href) ? 'page' : undefined}>
                {item.label}
                {isActive(item.href) && <span className="absolute inset-x-0 -bottom-[18px] mx-auto h-0.5 rounded-full bg-primary" aria-hidden="true" />}
              </Link>
            ))}
            {session && (
              <Button variant="outline" onClick={handleLogout} className="border-white/15 bg-white/[.03]">
                Cerrar sesión
              </Button>
            )}
            <Button variant="primary" href="/servicios" className="premium-button">
              Ver servicios
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-foreground transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {isOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          <button type="button" className="fixed inset-0 top-20 -z-10 bg-black/65 backdrop-blur-sm md:hidden" onClick={() => setIsOpen(false)} aria-label="Cerrar menú" />
          <div id="mobile-navigation" className="absolute inset-x-3 top-[calc(100%+.5rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#10121a]/98 p-3 shadow-[0_28px_80px_rgba(0,0,0,.6)] md:hidden">
            <div className="mb-2 flex items-center justify-between rounded-2xl bg-white/[.035] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[.16em] text-muted">Navegación</p>
                <p className="mt-1 text-sm font-semibold">{session?.user.full_name || session?.user.email || 'Bienvenido'}</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.8)]" aria-label="Servicio disponible" />
            </div>
            <div className="grid gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={linkClass(item, true)} aria-current={isActive(item.href) ? 'page' : undefined}>
                  <span>{item.label}</span>
                  <span className="ml-auto text-muted" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
              <Button variant="primary" href="/servicios" className="premium-button h-12 w-full">Ver servicios</Button>
              {session && <Button variant="outline" className="h-12 w-full border-white/15" onClick={handleLogout}>Cerrar sesión</Button>}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}


