'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { isDemoMode, getSession } from '@/lib/auth-hybrid'
import { SupportChatButton } from '@/components/support-chat-trigger'
import { addToCart } from '@/lib/cart'

interface Service {
  id: string
  name: string
  slug: string
  description: string
  category: string
  benefits: string[]
  includes: string[]
  price: number
  billing_type?: 'one_time' | 'subscription'
  recurring_price?: number | null
  billing_interval?: 'month' | null
  duration_estimate: string
  featured?: boolean
  is_active: boolean
  is_featured: boolean
}

const serviceIcons: Record<string, string> = {
  obs: '◫',
  streaming: '⌁',
  pc_windows: '⌁',
  discord: '◈',
  support: '?',
  custom: '◆',
}

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartMessage, setCartMessage] = useState('')
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
            name: 'Servidor de Discord',
            slug: 'creacion-servidor-discord',
            description: 'Servidor de Discord profesional, seguro y organizado para tu comunidad o negocio',
            category: 'discord',
            benefits: ['Comunidad organizada', 'Permisos seguros', 'Moderación automatizada', 'Experiencia profesional'],
            includes: ['Estructura de canales', 'Roles y permisos', 'Sistema de bienvenida y reglas', 'Bots, tickets y AutoMod', 'Capacitación administrativa', '7 días de soporte'],
            price: 20.99,
            duration_estimate: '2-4 días',
            is_active: true,
            is_featured: true
          },
          {
            id: '4',
            name: 'Bot de Discord',
            slug: 'bot-de-discord',
            description: 'Bot personalizado para automatizar, moderar y mejorar tu servidor, con alojamiento administrado 24/7',
            category: 'discord',
            benefits: ['Funciones personalizadas', 'Automatización 24/7', 'Alojamiento administrado', 'Mantenimiento continuo'],
            includes: ['Desarrollo inicial', 'Comandos personalizados', 'Integración con tu servidor', 'Hosting administrado'],
            price: 30.99,
            billing_type: 'subscription',
            recurring_price: 9.99,
            billing_interval: 'month',
            duration_estimate: '3-7 días',
            is_active: true,
            is_featured: false
          },
          {
            id: '5',
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
            id: '6',
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
            id: '7',
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
            id: '8',
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
            id: '9',
            name: 'Página web profesional',
            slug: 'pagina-web-profesional',
            description: 'Página web moderna, adaptable y lista para presentar tu marca, negocio o proyecto',
            category: 'custom',
            benefits: ['Diseño adaptable', 'Imagen profesional', 'Carga optimizada', 'Dominio y hosting administrados'],
            includes: ['Diseño de hasta 5 secciones', 'Adaptación para móvil y escritorio', 'Formulario de contacto', 'Enlaces a redes sociales', 'Configuración SEO básica', 'Publicación inicial'],
            price: 80.99,
            billing_type: 'subscription',
            recurring_price: 5.99,
            billing_interval: 'month',
            duration_estimate: '5-10 días',
            is_active: true,
            is_featured: false
          },
          {
            id: '10',
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
          .order('is_featured', { ascending: false })
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
    { id: 'discord', name: 'Discord' },
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

  const handleAddToCart = (service: Service) => {
    if (service.billing_type === 'subscription') {
      handleRequestService(service.id)
      return
    }
    addToCart({ id: service.id, name: service.name, slug: service.slug, price: Number(service.price) })
    setCartMessage(`${service.name} se agregó al carrito.`)
    window.setTimeout(() => setCartMessage(''), 2600)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        {cartMessage && <div role="status" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl border border-primary/35 bg-[#121522]/95 px-5 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl">✓ {cartMessage}</div>}
        <section className="px-4 pb-20 pt-36">
          <div className="container mx-auto">
            <div className="mx-auto mb-12 h-32 max-w-2xl animate-pulse rounded-3xl bg-white/[.04]" />
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[.04]" />)}
            </div>
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
      <section className="premium-grid relative overflow-hidden px-4 pb-14 pt-36 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
        <div className="container relative mx-auto text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[.22em] text-primary">Servicios profesionales</p>
          <h1 className="mx-auto mb-5 max-w-4xl text-5xl font-black uppercase tracking-[-.04em] md:text-7xl">La mejora correcta para <span className="gradient-text-primary">cada etapa de tu setup</span></h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
            Soluciones claras, precio transparente y configuración personalizada. Elige tu objetivo y nosotros nos encargamos de la parte técnica.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-muted">
            {['Diagnóstico incluido', 'Pago seguro', 'Soporte post-servicio'].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[.035] px-4 py-2">✓ {item}</span>)}
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="pb-8 px-4 relative z-30">
        <div className="container mx-auto">
          <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-[#0d0f17]/75 p-2 backdrop-blur-xl">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedCategory === category.id
                    ? 'bg-primary text-white shadow-[0_8px_24px_rgba(88,101,242,.3)]'
                    : 'text-muted hover:bg-white/[.05] hover:text-foreground'
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
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service, index) => (
              <Card
                key={service.id}
                className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-[#11131b]/90 transition duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-[0_24px_70px_rgba(0,0,0,.4)] animate-fade-in-up ${service.is_featured ? 'border-primary/40' : 'border-white/10'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {service.billing_type === 'subscription' ? (
                  <div className="absolute right-5 top-5 z-10 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Suscripción
                  </div>
                ) : service.is_featured ? (
                  <div className="absolute right-5 top-5 z-10 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    Recomendado
                  </div>
                ) : null}
                <CardHeader>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xl text-primary">{serviceIcons[service.category] || '◉'}</div>
                  <CardTitle className="mb-2 pr-20 text-2xl">{service.name}</CardTitle>
                  <CardDescription className="min-h-12 text-base leading-relaxed">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-7 space-y-3">
                    {(service.benefits || []).slice(0, 4).map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-sm"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-xs text-emerald-400">✓</span><span className="text-foreground/85">{benefit}</span></li>
                    ))}
                  </ul>
                  <div className="mt-auto border-t border-white/10 pt-6">
                    <div className="mb-5 flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted">{service.billing_type === 'subscription' ? 'Creación' : 'Desde'}</p>
                        <p className="mt-1 text-3xl font-bold text-foreground">${Number(service.price).toFixed(2)}</p>
                        {service.billing_type === 'subscription' && service.recurring_price != null && (
                          <p className="mt-1 text-sm font-semibold text-primary">+ ${Number(service.recurring_price).toFixed(2)}/mes de {service.slug === 'pagina-web-profesional' ? 'dominio y hosting' : 'hosting'}</p>
                        )}
                      </div>
                      <div className="text-right"><p className="text-xs uppercase tracking-wider text-muted">Entrega</p><p className="mt-1 text-sm font-medium">{service.duration_estimate}</p></div>
                    </div>
                    <Button variant="primary" href={`/servicios/${service.slug}`} className="premium-button h-12 w-full">
                      Ver servicio <span aria-hidden="true" className="ml-2">→</span>
                    </Button>
                    <button onClick={() => handleAddToCart(service)} className="mt-3 h-11 w-full rounded-xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary transition hover:bg-primary/20">{service.billing_type === 'subscription' ? 'Configurar suscripción' : '+ Agregar al carrito'}</button>
                    <button onClick={() => handleRequestService(service.id)} className="mt-3 w-full py-2 text-sm font-medium text-muted transition hover:text-foreground">Solicitar directamente</button>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6 uppercase gradient-text-secondary">¿No encuentras lo que buscas?</h2>
            <p className="text-xl text-muted mb-8 max-w-2xl mx-auto text-headline">
              Ofrecemos servicios personalizados adaptados a tus necesidades específicas. Contáctanos para discutir tu proyecto.
            </p>
            <SupportChatButton
              size="lg"
              className="h-14 px-10 text-lg shimmer-button"
              message="Hola, quiero información sobre un servicio personalizado."
            >
              Contactar para Servicio Personalizado
            </SupportChatButton>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  )
}
