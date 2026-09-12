import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ServicesPage() {
  const services = [
    {
      id: 1,
      name: 'Optimización de OBS',
      slug: 'optimizacion-obs',
      description: 'Configuración profesional de OBS Studio para streaming de alta calidad',
      category: 'obs',
      benefits: ['Mejor calidad de video', 'Uso optimizado de CPU', 'Configuración de escenas', 'Transiciones suaves'],
      includes: ['Configuración de salida', 'Escenas y fuentes', 'Hotkeys personalizados', 'Optimización de bitrate'],
      price: 29.99,
      duration: '1-2 horas',
      featured: true
    },
    {
      id: 2,
      name: 'Configuración de Streaming',
      slug: 'configuracion-streaming',
      description: 'Setup completo para Twitch, YouTube u otras plataformas',
      category: 'streaming',
      benefits: ['Streaming estable', 'Alertas personalizadas', 'Chat integrado', 'Overlay profesional'],
      includes: ['Configuración de plataforma', 'Alertas y widgets', 'Overlay básico', 'Guía de uso'],
      price: 49.99,
      duration: '2-3 horas',
      featured: true
    },
    {
      id: 3,
      name: 'Optimización de PC/Windows',
      slug: 'optimizacion-pc-windows',
      description: 'Mejora del rendimiento del sistema para gaming y productividad',
      category: 'pc_windows',
      benefits: ['Sistema más rápido', 'Menos latencia', 'Mejor rendimiento en juegos', 'Eliminación de bloatware'],
      includes: ['Optimización de inicio', 'Limpieza de sistema', 'Configuración de energía', 'Actualización de drivers'],
      price: 39.99,
      duration: '1-2 horas',
      featured: false
    },
    {
      id: 4,
      name: 'Configuración Gaming',
      slug: 'configuracion-gaming',
      description: 'Optimización específica para tus juegos favoritos',
      category: 'gaming',
      benefits: ['Mejor FPS', 'Menos input lag', 'Configuración gráfica óptima', 'Sensibilidad ideal'],
      includes: ['Configuración gráfica', 'Sensibilidad y controles', 'Optimización de red', 'Configuración de perfiles'],
      price: 24.99,
      duration: '1 hora por juego',
      featured: false
    },
    {
      id: 5,
      name: 'Diseño de Overlays y Alertas',
      slug: 'diseno-overlays-alertas',
      description: 'Elementos visuales personalizados para tu stream',
      category: 'design',
      benefits: ['Diseño único', 'Animaciones profesionales', 'Branding personalizado', 'Elementos editables'],
      includes: ['Overlay principal', 'Alertas de follower/sub', 'Brb/Starting screens', 'Be thankful screens'],
      price: 59.99,
      duration: '3-5 días',
      featured: false
    },
    {
      id: 6,
      name: 'Soporte Técnico',
      slug: 'soporte-tecnico',
      description: 'Resolución de problemas técnicos y consultas',
      category: 'support',
      benefits: ['Solución rápida', 'Expertos técnicos', 'Guía paso a paso', 'Prevención de problemas'],
      includes: ['Diagnóstico del problema', 'Solución implementada', 'Guía de prevención', 'Soporte follow-up'],
      price: 19.99,
      duration: '30-60 minutos',
      featured: false
    },
    {
      id: 7,
      name: 'Servicios Personalizados',
      slug: 'servicios-personalizados',
      description: 'Soluciones a medida según tus necesidades',
      category: 'custom',
      benefits: ['Solución específica', 'Atención personalizada', 'Flexibilidad total', 'Soporte dedicado'],
      includes: ['Consultoría inicial', 'Desarrollo de solución', 'Implementación', 'Soporte post-entrega'],
      price: 99.99,
      duration: 'Según complejidad',
      featured: false
    }
  ]

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'obs', name: 'OBS' },
    { id: 'streaming', name: 'Streaming' },
    { id: 'pc_windows', name: 'PC/Windows' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'design', name: 'Diseño' },
    { id: 'support', name: 'Soporte' },
    { id: 'custom', name: 'Personalizado' }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nuestros Servicios</h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Soluciones profesionales para optimizar tu experiencia de streaming, gaming y soporte técnico
          </p>
        </div>
      </section>

      {/* Category Filters */}
      <section className="pb-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={category.id === 'all' ? 'primary' : 'outline'}
                size="sm"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className={`border-2 transition-all hover:scale-105 ${
                  service.featured
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {service.featured && (
                  <div className="bg-primary text-white text-xs font-bold px-3 py-1 text-center">
                    DESTACADO
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Beneficios:</h4>
                      <ul className="space-y-1">
                        {service.benefits.map((benefit, index) => (
                          <li key={index} className="text-sm text-muted flex items-start">
                            <span className="text-primary mr-2">✓</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2">Incluye:</h4>
                      <ul className="space-y-1">
                        {service.includes.map((item, index) => (
                          <li key={index} className="text-sm text-muted flex items-start">
                            <span className="text-secondary mr-2">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <div className="text-2xl font-bold">${service.price}</div>
                        <div className="text-xs text-muted">{service.duration}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" href={`/servicios/${service.slug}`}>
                          Ver detalles
                        </Button>
                        <Button variant="primary" size="sm" href="/contacto">
                          Solicitar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">¿No encuentras lo que buscas?</h2>
          <p className="text-muted mb-8 max-w-2xl mx-auto">
            Ofrecemos servicios personalizados adaptados a tus necesidades específicas. Contáctanos para discutir tu proyecto.
          </p>
          <Button variant="primary" size="lg" href="/contacto">
            Contactar para Servicio Personalizado
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  )
}