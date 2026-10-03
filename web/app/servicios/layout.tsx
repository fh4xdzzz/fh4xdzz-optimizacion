import type { Metadata } from 'next'
import { socialMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Servicios de optimización y streaming',
  description: 'Explora servicios de OBS, Windows, gaming y diseño. Consulta precios, duración y lo que incluye cada servicio.',
  alternates: { canonical: '/servicios' },
  ...socialMetadata('Servicios de optimización y streaming', 'Mejora tu setup con configuración personalizada de OBS, Windows y gaming.', '/servicios'),
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children
}
