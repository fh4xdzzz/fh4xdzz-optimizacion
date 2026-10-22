'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PackageCheck, KeyRound } from 'lucide-react'

const sections = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/dashboard/pedidos', label: 'Mis pedidos', icon: PackageCheck },
  { href: '/dashboard/keys', label: 'Mis keys', icon: KeyRound },
]

export default function DashboardNavigation() {
  const pathname = usePathname()
  return <nav aria-label="Secciones de Dashboard" className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-card/70 p-2">
    {sections.map(({ href, label, icon: Icon }) => {
      const active = pathname === href
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-none ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</Link>
    })}
  </nav>
}
