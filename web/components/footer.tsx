import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-card/80 backdrop-blur-strong border-t border-border/50 mt-20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Image src="/logo.png" alt="TheDulcanDesign Logo" width={40} height={40} className="rounded-lg animate-float" />
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
                <Link href="/servicios/optimizacion-obs" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Optimización OBS
                </Link>
              </li>
              <li>
                <Link href="/servicios/configuracion-streaming" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Configuración Streaming
                </Link>
              </li>
              <li>
                <Link href="/servicios/optimizacion-pc-windows" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Optimización PC
                </Link>
              </li>
              <li>
                <Link href="/servicios/soporte-tecnico" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Soporte Técnico
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-6 text-lg text-foreground">Empresa</h3>
            <ul className="space-y-3 text-base text-muted">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Términos de Servicio
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-6 text-lg text-foreground">Contacto</h3>
            <ul className="space-y-3 text-base text-muted">
              <li>
                <a href="mailto:thedulcandesign@gmail.com" className="hover:text-foreground transition-colors hover:scale-105 transform inline-block">
                  thedulcandesign@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/DXkEXrYRvM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors hover:scale-105 transform inline-block"
                >
                  Discord Server
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-12 pt-8 text-center text-base text-muted">
          <p>&copy; {new Date().getFullYear()} TheDulcanDesign. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
