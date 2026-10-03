'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { SupportChatButton } from '@/components/support-chat-trigger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  name: string
  slug: string
  description: string
  price: number
  features: string[]
  is_featured: boolean
}

interface Testimonial {
  id: string
  client_name: string
  rating: number
  title: string | null
  content: string
}

const fallbackTestimonials: Testimonial[] = [
  {
    id: 'carlos-gaming',
    client_name: 'Carlos Gaming',
    rating: 5,
    title: 'Excelente servicio',
    content: 'La optimización de OBS mejoró mucho mi stream, ahora tengo calidad profesional sin lag. ¡Muy recomendado!',
  },
  {
    id: 'maria-streamer',
    client_name: 'Maria Streamer',
    rating: 5,
    title: 'Perfecto para empezar',
    content: 'Me ayudaron con todo el setup de streaming desde cero. El soporte fue increíble y muy paciente.',
  },
]

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase()

type AnimatedMetricProps = {
  label: string
  target: number
  prefix?: string
  suffix?: string
  color: string
}

function AnimatedMetric({ label, target, prefix = '', suffix = '', color }: AnimatedMetricProps) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0

    if (reduceMotion) {
      animationFrame = window.requestAnimationFrame(() => setValue(target))
      return () => window.cancelAnimationFrame(animationFrame)
    }

    const duration = 1400
    const startedAt = performance.now()

    const countUp = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * easedProgress))

      if (progress < 1) animationFrame = window.requestAnimationFrame(countUp)
    }

    animationFrame = window.requestAnimationFrame(countUp)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [target])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <p className="mb-2 text-xs text-muted">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`} aria-label={`${label}: ${prefix}${target}${suffix}`}>
        {prefix}{value}{suffix}
      </p>
    </div>
  )
}

export default function Home() {
  const [featuredServices, setFeaturedServices] = useState<Service[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadHomeContent = async () => {
      const supabase = createClient()

      const [servicesResult, testimonialsResult] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('is_featured', true)
          .order('sort_order', { ascending: true })
          .limit(3),
        supabase
          .from('testimonials')
          .select('id, client_name, rating, title, content')
          .eq('is_displayed', true)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      if (!isActive) return

      if (servicesResult.error) {
        console.error('Error loading featured services:', servicesResult.error)
      } else {
        setFeaturedServices(servicesResult.data || [])
      }

      if (testimonialsResult.error) {
        console.error('Error loading testimonials:', testimonialsResult.error)
      } else if (testimonialsResult.data?.length) {
        setTestimonials(testimonialsResult.data)
      }

      setLoading(false)
    }

    void loadHomeContent()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="animated-bg"></div>
      <div className="animated-bg-overlay"></div>
      <div className="relative z-10">
        <Navbar />

      {/* Hero Section */}
      <section className="premium-grid relative overflow-hidden px-4 pb-16 pt-32 md:pb-24 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="container relative mx-auto grid items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
          <div className="animate-fade-in-up text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Atención personalizada disponible
            </div>
            <h1 className="mb-6 text-5xl font-black uppercase leading-[1.02] tracking-[-0.045em] text-foreground md:text-7xl">
              Tu setup, más rápido.
              <span className="mt-2 block gradient-text-primary">Tu contenido, más profesional.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted md:text-xl lg:mx-0">
              Optimizamos OBS, Windows y tu flujo de streaming con una configuración hecha para tu equipo, tus juegos y tus objetivos.
            </p>
            <div className="relative z-30 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <Button variant="primary" size="lg" href="/servicios" className="premium-button h-14 px-8 text-base shadow-[0_16px_45px_rgba(88,101,242,.32)]">
                Optimizar mi setup
                <span aria-hidden="true" className="ml-2">→</span>
              </Button>
              <SupportChatButton variant="outline" size="lg" className="h-14 border-white/15 bg-white/[.03] px-8 text-base hover:bg-white/[.07]">
                Hablar con un especialista
              </SupportChatButton>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted lg:justify-start">
              {['Pago seguro con Stripe', 'Soporte privado', 'Configuración personalizada'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/10 text-xs text-emerald-400">✓</span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl animate-fade-in-scale">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-primary/25 via-transparent to-secondary/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0f17]/90 p-4 shadow-[0_35px_100px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:p-6">
              <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></div>
                  <span className="text-xs font-medium uppercase tracking-[.22em] text-muted">Performance Center</span>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-400">Optimizado</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <AnimatedMetric label="FPS estable" target={38} prefix="+" suffix="%" color="text-emerald-400" />
                <AnimatedMetric label="Latencia" target={27} prefix="-" suffix="%" color="text-cyan-300" />
                <AnimatedMetric label="Calidad OBS" target={1080} suffix="p" color="text-primary" />
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/[.08] to-transparent p-5">
                <div className="mb-5 flex items-center justify-between"><span className="text-sm font-semibold">Rendimiento del sistema</span><span className="text-xs text-muted">En tiempo real</span></div>
                <div className="flex h-32 items-end gap-2" aria-hidden="true">
                  {[42, 55, 48, 70, 62, 79, 68, 88, 76, 94, 84, 100].map((height, index) => (
                    <div
                      key={index}
                      className="performance-bar flex-1 rounded-t-md bg-gradient-to-t from-primary/30 to-primary"
                      style={{
                        height: `${height}%`,
                        opacity: .45 + index * .045,
                        animationDelay: `${index * -0.16}s`,
                        animationDuration: `${1.7 + (index % 4) * .18}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] px-5 py-4">
                <div><p className="text-sm font-semibold">Diagnóstico personalizado</p><p className="mt-1 text-xs text-muted">Configuración basada en tu hardware</p></div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">✦</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-white/[.02] px-4 py-6">
        <div className="container mx-auto grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[['Atención', '1 a 1'], ['Pago', '100% seguro'], ['Soporte', 'Antes y después'], ['Enfoque', 'Resultados reales']].map(([label, value]) => (
            <div key={label}><p className="text-lg font-bold text-foreground">{value}</p><p className="mt-1 text-xs uppercase tracking-[.16em] text-muted">{label}</p></div>
          ))}
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-24 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[.2em] text-primary">Soluciones especializadas</p>
            <h2 className="text-4xl font-bold uppercase tracking-tight md:text-5xl">Servicios creados para rendir más</h2>
            <p className="mt-4 text-lg text-muted">Elige el punto de partida. Cada servicio se adapta a tu hardware, plataforma y objetivos.</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3" aria-label="Cargando servicios destacados">
              {[0, 1, 2].map((item) => <div key={item} className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/[.04]" />)}
            </div>
          ) : featuredServices.length === 0 ? (
            <div className="text-center text-muted">No hay servicios destacados aún.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredServices.map((service, index) => (
                <Card key={service.id} className="group relative overflow-hidden rounded-3xl border-white/10 bg-[#11131b]/85 transition duration-300 hover:-translate-y-2 hover:border-primary/40 hover:shadow-[0_25px_70px_rgba(0,0,0,.38)]">
                  <div className={`absolute inset-x-0 top-0 h-1 ${index === 1 ? 'bg-secondary' : 'bg-primary'}`} />
                  <CardHeader>
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-xl text-primary">{index === 0 ? '◫' : index === 1 ? '⌁' : '◉'}</div>
                    <CardTitle className="text-2xl mb-2">{service.name}</CardTitle>
                    <CardDescription className="text-base">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted">
                      {service.features && service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">✓ <span className="text-foreground">{feature}</span></li>
                      ))}
                    </ul>
                    <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
                      <span className="text-3xl font-bold text-foreground">
                        ${service.price.toFixed(2)}
                      </span>
                      <Button variant="outline" size="lg" href={`/servicios/${service.slug}`} className="border-white/15 group-hover:border-primary/50 group-hover:bg-primary/10">
                        Explorar <span aria-hidden="true" className="ml-2">→</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 md:px-8">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 uppercase gradient-text-secondary animate-fade-in-up">Cómo Funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 transition-transform cursor-pointer">
                <span className="text-4xl md:text-5xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Selecciona Servicio</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Elige el servicio que necesitas de nuestro catálogo</p>
            </div>
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6 transition-transform cursor-pointer">
                <span className="text-4xl md:text-5xl font-bold text-secondary">2</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Completa Formulario</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Proporciona los detalles de lo que necesitas</p>
            </div>
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6 transition-transform cursor-pointer">
                <span className="text-4xl md:text-5xl font-bold text-accent">3</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Recibe Confirmación</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Te contactaremos para coordinar el servicio</p>
            </div>
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 transition-transform cursor-pointer">
                <span className="text-4xl md:text-5xl font-bold text-primary">4</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Disfruta Resultados</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Tu setup optimizado y listo para usar</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-4 md:px-8 bg-card/30">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 uppercase gradient-text-secondary animate-fade-in-up">¿Por Qué Elegirnos?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center glass-card p-8 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-6xl mb-6 animate-float">🎯</div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Expertos Certificados</h3>
              <p className="text-base text-muted leading-relaxed">Equipo con años de experiencia en streaming y gaming</p>
            </div>
            <div className="text-center glass-card p-8 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-6xl mb-6 animate-float" style={{ animationDelay: '0.5s' }}>⚡</div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Resultados Rápidos</h3>
              <p className="text-base text-muted leading-relaxed">Optimizaciones eficientes en tiempo récord</p>
            </div>
            <div className="text-center glass-card p-8 rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-6xl mb-6 animate-float" style={{ animationDelay: '1s' }}>🛡️</div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Soporte Dedicado</h3>
              <p className="text-base text-muted leading-relaxed">Asistencia continua antes, durante y después del servicio</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 md:px-8">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 uppercase gradient-text-primary animate-fade-in-up">Lo Que Dicen Nuestros Clientes</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => {
              const rating = Math.min(5, Math.max(1, testimonial.rating || 5))

              return (
                <Card
                  key={testimonial.id}
                  className="glass-card animate-fade-in-up"
                  style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <span className="text-2xl font-bold">{getInitials(testimonial.client_name)}</span>
                      </div>
                      <div>
                        <CardTitle className="text-xl">{testimonial.client_name}</CardTitle>
                        {testimonial.title && (
                          <CardDescription className="text-base">{testimonial.title}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-base leading-relaxed text-muted">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    <div
                      className="flex text-2xl text-primary"
                      aria-label={`${rating} de 5 estrellas`}
                    >
                      <span aria-hidden="true">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 md:px-8 bg-card/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 uppercase gradient-text-secondary animate-fade-in-up">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-xl">¿Cuánto tiempo tardan los servicios?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-base leading-relaxed">
                  La mayoría de nuestros servicios se completan en 1-3 horas. Servicios más complejos como diseño de overlays pueden tomar 3-5 días.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-xl">¿Ofrecen soporte después del servicio?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-base leading-relaxed">
                  Sí, ofrecemos soporte post-servicio para asegurar que todo funcione correctamente. Puedes contactarnos por Discord o email.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="text-xl">¿Qué métodos de pago aceptan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-base leading-relaxed">
                  Aceptamos tarjetas de crédito y débito mediante Stripe. Los métodos adicionales disponibles se muestran en el pago seguro.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto animate-fade-in-scale">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 uppercase gradient-text-primary">¿Listo para Optimizar tu Setup?</h2>
            <p className="text-xl text-muted mb-8 text-headline">
              Únete a cientos de clientes satisfechos que han mejorado su experiencia de streaming y gaming.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button variant="primary" size="lg" href="/servicios" className="shimmer-button text-lg px-10 py-5">
                Ver Servicios
              </Button>
              <SupportChatButton variant="outline" size="lg" className="text-lg px-10 py-5">
                Contactar
              </SupportChatButton>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  )
}

