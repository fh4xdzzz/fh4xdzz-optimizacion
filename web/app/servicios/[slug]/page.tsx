import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface ServiceDetails {
  name: string
  slug: string
  description: string
  category: string
  benefits: string[]
  includes: string[]
  price: number
  duration: string
  featured: boolean
  details: string
}

const services: Record<string, ServiceDetails> = {
  'optimizacion-obs': {
    name: 'Optimización de OBS',
    slug: 'optimizacion-obs',
    description: 'Configuración profesional de OBS Studio para streaming de alta calidad',
    category: 'obs',
    benefits: ['Mejor calidad de video', 'Uso optimizado de CPU', 'Configuración de escenas', 'Transiciones suaves'],
    includes: ['Configuración de salida', 'Escenas y fuentes', 'Hotkeys personalizados', 'Optimización de bitrate'],
    price: 29.99,
    duration: '1-2 horas',
    featured: true,
    details: 'Nuestro servicio de optimización de OBS te proporciona una configuración profesional ajustada a tu hardware y necesidades específicas. Optimizamos todos los parámetros para garantizar la mejor calidad posible sin sacrificar rendimiento.'
  },
  'configuracion-streaming': {
    name: 'Configuración de Streaming',
    slug: 'configuracion-streaming',
    description: 'Setup completo para Twitch, YouTube u otras plataformas',
    category: 'streaming',
    benefits: ['Streaming estable', 'Alertas personalizadas', 'Chat integrado', 'Overlay profesional'],
    includes: ['Configuración de plataforma', 'Alertas y widgets', 'Overlay básico', 'Guía de uso'],
    price: 49.99,
    duration: '2-3 horas',
    featured: true,
    details: 'Configuramos todo tu ecosistema de streaming desde cero. Incluye setup de plataforma, integración de alertas, chat en pantalla y un overlay profesional básico para que empieces a transmitir con calidad.'
  },
  'optimizacion-pc-windows': {
    name: 'Optimización de PC/Windows',
    slug: 'optimizacion-pc-windows',
    description: 'Mejora del rendimiento del sistema para gaming y productividad',
    category: 'pc_windows',
    benefits: ['Sistema más rápido', 'Menos latencia', 'Mejor rendimiento en juegos', 'Eliminación de bloatware'],
    includes: ['Optimización de inicio', 'Limpieza de sistema', 'Configuración de energía', 'Actualización de drivers'],
    price: 39.99,
    duration: '1-2 horas',
    featured: false,
    details: 'Optimizamos tu sistema Windows para máximo rendimiento. Eliminamos procesos innecesarios, configuramos el plan de energía para gaming, actualizamos drivers y realizamos una limpieza profunda del sistema.'
  },
  'configuracion-gaming': {
    name: 'Configuración Gaming',
    slug: 'configuracion-gaming',
    description: 'Optimización específica para tus juegos favoritos',
    category: 'gaming',
    benefits: ['Mejor FPS', 'Menos input lag', 'Configuración gráfica óptima', 'Sensibilidad ideal'],
    includes: ['Configuración gráfica', 'Sensibilidad y controles', 'Optimización de red', 'Configuración de perfiles'],
    price: 24.99,
    duration: '1 hora por juego',
    featured: false,
    details: 'Optimizamos cada juego específicamente para tu hardware. Ajustamos gráficos, sensibilidad, controles y configuramos perfiles de red para reducir lag y mejorar tu experiencia de juego.'
  },
  'diseno-overlays-alertas': {
    name: 'Diseño de Overlays y Alertas',
    slug: 'diseno-overlays-alertas',
    description: 'Elementos visuales personalizados para tu stream',
    category: 'design',
    benefits: ['Diseño único', 'Animaciones profesionales', 'Branding personalizado', 'Elementos editables'],
    includes: ['Overlay principal', 'Alertas de follower/sub', 'Brb/Starting screens', 'Be thankful screens'],
    price: 59.99,
    duration: '3-5 días',
    featured: false,
    details: 'Creamos elementos visuales personalizados que representan tu marca. Incluye overlay principal, alertas animadas, screens de intermission y todo lo necesario para un stream visualmente profesional.'
  },
  'soporte-tecnico': {
    name: 'Soporte Técnico',
    slug: 'soporte-tecnico',
    description: 'Resolución de problemas técnicos y consultas',
    category: 'support',
    benefits: ['Solución rápida', 'Expertos técnicos', 'Guía paso a paso', 'Prevención de problemas'],
    includes: ['Diagnóstico del problema', 'Solución implementada', 'Guía de prevención', 'Soporte follow-up'],
    price: 19.99,
    duration: '30-60 minutos',
    featured: false,
    details: 'Resolvemos cualquier problema técnico que tengas con tu setup de streaming, gaming o sistema. Nuestros expertos te guían paso a paso y te enseñan a prevenir problemas futuros.'
  },
  'servicios-personalizados': {
    name: 'Servicios Personalizados',
    slug: 'servicios-personalizados',
    description: 'Soluciones a medida según tus necesidades',
    category: 'custom',
    benefits: ['Solución específica', 'Atención personalizada', 'Flexibilidad total', 'Soporte dedicado'],
    includes: ['Consultoría inicial', 'Desarrollo de solución', 'Implementación', 'Soporte post-entrega'],
    price: 99.99,
    duration: 'Según complejidad',
    featured: false,
    details: 'Si necesitas algo que no está en nuestro catálogo estándar, podemos crear una solución personalizada para ti. Desde configuraciones complejas hasta integraciones específicas, lo hacemos posible.'
  }
}

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = services[params.slug]

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Servicio no encontrado</h1>
            <p className="text-muted mb-8">El servicio que buscas no existe o ha sido eliminado.</p>
            <Button variant="primary" href="/servicios">
              Volver a Servicios
            </Button>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted mb-4">
              <Link href="/servicios" className="hover:text-foreground">
                Servicios
              </Link>
              <span>/</span>
              <span className="text-foreground">{service.name}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{service.name}</h1>
            <p className="text-xl text-muted mb-6">{service.description}</p>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold">${service.price}</div>
              <div className="text-muted">• {service.duration}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Details */}
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del Servicio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted leading-relaxed">{service.details}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Beneficios</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.benefits.map((benefit: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-muted">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Qué Incluye</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.includes.map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-secondary" />
                        </div>
                        <span className="text-muted">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="border-primary/50">
                <CardHeader>
                  <CardTitle className="text-lg">Solicitar Servicio</CardTitle>
                  <CardDescription>
                    Completa el formulario y te contactaremos para coordinar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Precio</span>
                      <span className="font-bold">${service.price}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Duración</span>
                      <span>{service.duration}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Categoría</span>
                      <span className="capitalize">{service.category}</span>
                    </div>
                    <Button variant="primary" className="w-full" href="/contacto">
                      Solicitar Ahora
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">¿Tienes dudas?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted text-sm mb-4">
                    Únete a nuestro Discord para consultar con nuestro equipo antes de solicitar.
                  </p>
                  <Button variant="outline" className="w-full" href="https://discord.gg/your_invite_link" target="_blank" rel="noopener noreferrer">
                    Unirse a Discord
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}