import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-bold">TheDulcanDesign</span>
            </div>
            <p className="text-muted text-sm">
              Servicios profesionales de optimización y configuración para streaming, gaming y soporte técnico.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold mb-4">Servicios</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/servicios" className="hover:text-foreground transition-colors">
                  Optimización OBS
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-foreground transition-colors">
                  Configuración Streaming
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-foreground transition-colors">
                  Optimización PC
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="hover:text-foreground transition-colors">
                  Soporte Técnico
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  Sobre Nosotros
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-foreground transition-colors">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Términos de Servicio
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <a href="mailto:contact@fh4xdzz.com" className="hover:text-foreground transition-colors">
                  contact@fh4xdzz.com
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/your_invite_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Discord Server
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} TheDulcanDesign. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
