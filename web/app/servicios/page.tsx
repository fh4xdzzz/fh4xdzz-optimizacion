'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { isDemoMode, getSession } from '@/lib/auth-hybrid'

interface Service {
  id: string
  name: string
  slug: string
  description: string
  category: string
  benefits: string[]
  includes: string[]
  price: number
  duration_estimate: string
  featured?: boolean
  is_active: boolean
  is_featured: boolean
}

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isDemo = isDemoMode()
  const router = useRouter()

  useEffect(() => {
    const loadServices = async () => {
      if (isDemo) {
        // Modo demo: usar datos de ejemplo
        setServices([
          {
            id: '1',
            name: 'Optimización de OBS',
            slug: 'optimizacion-obs',
            description: 'Configuración profesional de OBS Studio para streaming de alta calidad',
            category: 'obs',
            benefits: ['Mejor calidad de video', 'Uso optimizado de CPU', 'Configuración de escenas', 'Transiciones suaves'],
            includes: ['Configuración de salida', 'Escenas y fuentes', 'Hotkeys personalizados', 'Optimización de bitrate'],
            price: 29.99,
            duration_estimate: '1-2 horas',
            is_active: true,
            is_featured: true
          },
          {
            id: '2',
            name: 'Configuración de Streaming',
            slug: 'configuracion-streaming',
            description: 'Setup completo para Twitch, YouTube u otras plataformas',
            category: 'streaming',
            benefits: ['Streaming estable', 'Alertas personalizadas', 'Chat integrado', 'Overlay profesional'],
            includes: ['Configuración de plataforma', 'Alertas y widgets', 'Overlay básico', 'Guía de uso'],
            price: 49.99,
            duration_estimate: '2-3 horas',
            is_active: true,
            is_featured: true
          },
          {
            id: '3',
            name: 'Optimización de PC/Windows',
            slug: 'optimizacion-pc-windows',
            description: 'Mejora del rendimiento del sistema para gaming y productividad',
            category: 'pc_windows',
            benefits: ['Sistema más rápido', 'Menos latencia', 'Mejor rendimiento en juegos', 'Eliminación de bloatware'],
            includes: ['Optimización de inicio', 'Limpieza de sistema', 'Configuración de energía', 'Actualización de drivers'],
            price: 39.99,
            duration_estimate: '1-2 horas',
            is_active: true,
            is_featured: false
          },
          {
            id: '4',
            name: 'Configuración Gaming',
            slug: 'configuracion-gaming',
            description: 'Optimización específica para tus juegos favoritos',
            category: 'gaming',
            benefits: ['Mejor FPS', 'Menos input lag', 'Configuración gráfica óptima', 'Sensibilidad ideal'],
            includes: ['Configuración gráfica', 'Sensibilidad y controles', 'Optimización de red', 'Configuración de perfiles'],
            price: 24.99,
            duration_estimate: '1 hora por juego',
            is_active: true,
            is_featured: false
          },
          {
            id: '5',
            name: 'Diseño de Overlays y Alertas',
            slug: 'diseno-overlays-alertas',
            description: 'Elementos visuales personalizados para tu stream',
            category: 'design',
            benefits: ['Diseño único', 'Animaciones profesionales', 'Branding personalizado', 'Elementos editables'],
            includes: ['Overlay principal', 'Alertas de follower/sub', 'Brb/Starting screens', 'Be thankful screens'],
            price: 59.99,
            duration_estimate: '3-5 días',
            is_active: true,
            is_featured: false
          },
          {
            id: '6',
            name: 'Soporte Técnico',
            slug: 'soporte-tecnico',
            description: 'Resolución de problemas técnicos y consultas',
            category: 'support',
            benefits: ['Solución rápida', 'Expertos técnicos', 'Guía paso a paso', 'Prevención de problemas'],
            includes: ['Diagnóstico del problema', 'Solución implementada', 'Guía de prevención', 'Soporte follow-up'],
            price: 19.99,
            duration_estimate: '30-60 minutos',
            is_active: true,
            is_featured: false
          },
          {
            id: '7',
            name: 'Servicios Personalizados',
            slug: 'servicios-personalizados',
            description: 'Soluciones a medida según tus necesidades',
            category: 'custom',
            benefits: ['Solución específica', 'Atención personalizada', 'Flexibilidad total', 'Soporte dedicado'],
            includes: ['Consultoría inicial', 'Desarrollo de solución', 'Implementación', 'Soporte post-entrega'],
            price: 99.99,
            duration_estimate: 'Según complejidad',
            is_active: true,
            is_featured: false
          }
        ])
        setLoading(false)
        return
      }

      // Modo Supabase: cargar desde la base de datos
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (error) throw error
        setServices(data || [])
      } catch (err) {
        setError('Error al cargar servicios. Por favor, intenta nuevamente.')
        console.error('Error loading services:', err)
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [isDemo])

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

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(service => service.category === selectedCategory)

  const handleRequestService = async (serviceId: string) => {
    const session = await getSession()
    if (!session) {
      // No autenticado: redirigir a login con el servicio
      router.push(`/auth/login?redirect=/contacto?service=${serviceId}`)
    } else {
      // Autenticado: redirigir directamente a contacto con el servicio
      router.push(`/contacto?service=${serviceId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando servicios...</p>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm mb-4">
              {error}
            </div>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Intentar nuevamente
            </Button>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="animated-bg"></div>
      <div className="animated-bg-overlay"></div>
      <div className="relative z-10">
        <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-primary animate-fade-in-up">Nuestros Servicios</h1>
          <p className="text-xl md:text-2xl text-muted max-w-2xl mx-auto text-headline animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Soluciones profesionales para optimizar tu experiencia de streaming, gaming y soporte técnico
          </p>
        </div>
      </section>

      {/* Category Filters */}
      <section className="pb-8 px-4 relative z-30">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-10 px-4 text-sm pointer-events-auto cursor-pointer ${
                  selectedCategory === category.id 
                    ? 'bg-primary text-white hover:bg-primary/90' 
                    : 'border border-border bg-transparent hover:bg-card'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredServices.map((service, index) => (
              <Card
                key={service.id}
                className={`border-2 transition-all hover-lift hover-glow glass-card glowing-border animate-fade-in-up ${
                  service.featured
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border/50 hover:border-primary/50'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {service.is_featured && (
                  <div className="bg-primary text-white text-xs font-bold px-4 py-2 text-center rounded-b-xl">
                    ⭐ DESTACADO
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl mb-2">{service.name}</CardTitle>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-border/50 rounded-xl glass-card">
                      <h4 className="font-semibold text-base mb-3">Beneficios:</h4>
                      <ul className="space-y-2">
                        {service.benefits && service.benefits.length > 0 ? (
                          service.benefits.map((benefit, index) => (
                            <li key={index} className="text-sm text-muted flex items-start">
                              <span className="text-primary mr-2 text-base">✓</span>
                              <span className="text-foreground">{benefit}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted">No hay beneficios especificados</li>
                        )}
                      </ul>
                    </div>

                    <div className="p-4 border border-border/50 rounded-xl glass-card">
                      <h4 className="font-semibold text-base mb-3">Incluye:</h4>
                      <ul className="space-y-2">
                        {service.includes && service.includes.length > 0 ? (
                          service.includes.map((item, index) => (
                            <li key={index} className="text-sm text-muted flex items-start">
                              <span className="text-secondary mr-2 text-base">•</span>
                              <span className="text-foreground">{item}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted">No hay detalles especificados</li>
                        )}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div>
                        <div className="text-3xl font-bold gradient-text-primary">${service.price}</div>
                        <div className="text-sm text-muted">{service.duration_estimate}</div>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href={`/servicios/${service.slug}`}
                          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-10 px-4 border border-border bg-transparent hover:bg-card pointer-events-auto cursor-pointer"
                        >
                          Ver detalles
                        </a>
                        <button
                          onClick={() => handleRequestService(service.id)}
                          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-10 px-4 bg-primary text-white hover:bg-primary/90 pointer-events-auto cursor-pointer shimmer-button"
                        >
                          Solicitar
                        </button>
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
      <section className="py-24 px-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto animate-fade-in-scale">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text-secondary">¿No encuentras lo que buscas?</h2>
            <p className="text-xl text-muted mb-8 max-w-2xl mx-auto text-headline">
              Ofrecemos servicios personalizados adaptados a tus necesidades específicas. Contáctanos para discutir tu proyecto.
            </p>
            <a
              href="/contacto"
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-14 px-10 text-lg bg-primary text-white hover:bg-primary/90 pointer-events-auto cursor-pointer shimmer-button hover-lift"
            >
              Contactar para Servicio Personalizado
            </a>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  )
}
