'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSession, signOut } from '@/lib/auth-hybrid'
import { Button } from './ui/button'
import { usePublicSiteSettings } from '@/components/public-site-settings-provider'

type Session = {
  user: { full_name?: string; email: string; role?: string }
}
type NavItem = {
  href: string
  label: string
  emphasized?: boolean
}

function DiscordIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.54 5.34A17.35 17.35 0 0 0 15.22 4l-.53 1.08a15.8 15.8 0 0 0-5.35 0L8.8 4a17.28 17.28 0 0 0-4.33 1.35C1.73 9.38.98 13.3 1.35 17.16a17.5 17.5 0 0 0 5.3 2.68l1.3-1.78a10.7 10.7 0 0 1-2.04-.98l.5-.39a12.42 12.42 0 0 0 11.17 0l.5.39c-.65.38-1.33.7-2.04.98l1.3 1.78a17.46 17.46 0 0 0 5.3-2.68c.44-4.47-.75-8.35-3.1-11.82ZM8.52 14.82c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Zm6.96 0c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Z" />
    </svg>
  )
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { discordInviteUrl } = usePublicSiteSettings()

  useEffect(() => {
    const loadSession = async () => setSession(await getSession())
    loadSession()
    const interval = setInterval(loadSession, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const updateNavbar = () => setIsScrolled(window.scrollY > 24)
    updateNavbar()
    window.addEventListener('scroll', updateNavbar, { passive: true })
    return () => window.removeEventListener('scroll', updateNavbar)
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
        ]),
  ]

  const linkClass = (item: NavItem, mobile = false) => {
    const active = isActive(item.href)
    return [
      'relative rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      mobile ? 'flex min-h-12 items-center px-4 text-base' : 'px-3 py-2 text-sm',
      active
        ? 'border border-white/10 bg-white/[.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'
        : 'border border-transparent text-foreground/70 hover:border-white/[.06] hover:bg-white/[.04] hover:text-white',
      item.emphasized ? 'font-semibold text-primary' : '',
    ].join(' ')
  }

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 px-3 transition-all duration-300 ${isScrolled ? 'pt-2' : 'pt-3'}`} aria-label="Navegación principal">
      <div className={`container mx-auto rounded-2xl border px-4 backdrop-blur-2xl transition-all duration-300 ${isScrolled ? 'border-white/10 bg-[#090a10]/95 shadow-[0_14px_45px_rgba(0,0,0,.5)]' : 'border-primary/25 bg-[#0b0c12]/90 shadow-[0_18px_55px_rgba(0,0,0,.48),inset_0_1px_0_rgba(255,255,255,.04)]'}`}>
        <div className={`flex items-center justify-between gap-4 transition-all duration-300 ${isScrolled ? 'h-14' : 'h-16'}`}>
          <Link href="/" onClick={() => setIsOpen(false)} className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="TheDulcanDesign, ir al inicio">
            <Image src="/thedulcandesign-icon.png" alt="" width={40} height={40} preload className="shrink-0 object-contain" />
            <span className="truncate text-lg font-bold gradient-text-primary sm:text-xl">TheDulcanDesign</span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
            {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)} className={linkClass(item)} aria-current={isActive(item.href) ? 'page' : undefined}>{item.label}</Link>)}
          </div>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <a
              href={discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Unirse a nuestro servidor de Discord"
              title="Discord"
              className="group flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7289da]/70 hover:bg-[#5865f2] hover:shadow-[0_12px_28px_rgba(88,101,242,.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7289da]"
            >
              <DiscordIcon className="h-[21px] w-[21px] transition-transform group-hover:scale-110" />
            </a>
            {session && <Button variant="outline" onClick={handleLogout} className="border-white/15 bg-white/[.03]">Cerrar sesión</Button>}
            {!session && <Button variant="primary" href="/auth/login" className="premium-button">Iniciar sesión</Button>}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[.06] text-foreground transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:hidden"
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
          <button type="button" className="fixed inset-0 top-20 -z-10 bg-black/65 backdrop-blur-sm xl:hidden" onClick={() => setIsOpen(false)} aria-label="Cerrar menú" />
          <div id="mobile-navigation" className="absolute inset-x-3 top-[calc(100%+.5rem)] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#10121a]/98 p-3 shadow-[0_28px_80px_rgba(0,0,0,.6)] xl:hidden">
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
              <Button variant="outline" href={discordInviteUrl} target="_blank" rel="noopener noreferrer" className="h-12 w-full gap-2 border-[#7289da]/40 bg-[#5865f2]/10 text-white hover:bg-[#5865f2]/20">
                <DiscordIcon /> Unirme a Discord
              </Button>
              {!session && <Button variant="primary" href="/auth/login" className="premium-button h-12 w-full">Iniciar sesión</Button>}
              {session && <Button variant="outline" className="h-12 w-full border-white/15" onClick={handleLogout}>Cerrar sesión</Button>}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}


