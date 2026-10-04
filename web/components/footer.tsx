'use client'

import Link from 'next/link'
import Image from 'next/image'
import { SupportChatLink } from '@/components/support-chat-trigger'
import { usePublicSiteSettings } from '@/components/public-site-settings-provider'
import { BadgeCheck, CreditCard, Mail, MessageCircle, ShieldCheck } from 'lucide-react'

export default function Footer() {
  const { discordInviteUrl } = usePublicSiteSettings()

  return (
    <footer className="mt-20 border-t border-white/10 bg-[#0d0f17]/92 backdrop-blur-strong">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-14 grid gap-3 rounded-3xl border border-white/10 bg-white/[.025] p-4 sm:grid-cols-3">
          {[
            { label: 'Pago protegido', icon: CreditCard },
            { label: 'Atención privada', icon: ShieldCheck },
            { label: 'Soporte posterior', icon: BadgeCheck },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/85">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" /> {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Image
                src="/thedulcandesign-icon.png"
                alt="TheDulcanDesign Logo"
                width={44}
                height={44}
                className="shrink-0 object-contain"
              />
              <span className="font-bold text-xl gradient-text-primary">TheDulcanDesign</span>
            </div>
            <p className="text-muted text-base leading-relaxed">
              Servicios profesionales de optimización y configuración para streaming, gaming y soporte técnico.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-6 text-lg text-foreground">Servicios</h3>
            <ul className="space-y-3 text-base text-muted">
              <li>
                <Link href="/servicios/optimizacion-obs" className="inline-block transition-colors hover:text-foreground">
                  Optimización OBS
                </Link>
              </li>
              <li>
                <Link href="/servicios/configuracion-streaming" className="inline-block transition-colors hover:text-foreground">
                  Configuración Streaming
                </Link>
              </li>
              <li>
                <Link href="/servicios/creacion-servidor-discord" className="inline-block transition-colors hover:text-foreground">
                  Servidor de Discord
                </Link>
              </li>
              <li>
                <Link href="/servicios/optimizacion-pc-windows" className="inline-block transition-colors hover:text-foreground">
                  Optimización PC
                </Link>
              </li>
              <li>
                <Link href="/servicios/soporte-tecnico" className="inline-block transition-colors hover:text-foreground">
                  Soporte Técnico
                </Link>
              </li>
              <li>
                <Link href="/servicios/pagina-web-profesional" className="inline-block transition-colors hover:text-foreground">
                  Página web profesional
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-6 text-lg text-foreground">Empresa</h3>
            <ul className="space-y-3 text-base text-muted">
              <li>
                <Link href="/about" className="inline-block transition-colors hover:text-foreground">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/resultados" className="inline-block transition-colors hover:text-foreground">
                  Resultados
                </Link>
              </li>
              <li>
                <SupportChatLink className="inline-block transition-colors hover:text-foreground">
                  Contacto
                </SupportChatLink>
              </li>
              <li>
                <Link href="/terms" className="inline-block transition-colors hover:text-foreground">
                  Términos de servicio
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-block transition-colors hover:text-foreground">
                  Política de privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-6 text-lg text-foreground">Contacto</h3>
            <ul className="space-y-3 text-base text-muted">
              <li>
                <a href="mailto:thedulcandesign@gmail.com" className="inline-flex items-center gap-2 transition-colors hover:text-foreground">
                  <Mail className="h-4 w-4 text-primary" aria-hidden="true" /> thedulcandesign@gmail.com
                </a>
              </li>
              <li>
                <a
                  href={discordInviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <MessageCircle className="h-4 w-4 text-primary" aria-hidden="true" /> Servidor de Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-sm text-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TheDulcanDesign. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)]" /> Atención disponible</p>
        </div>
      </div>
    </footer>
  )
}

