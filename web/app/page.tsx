'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { SupportChatButton } from '@/components/support-chat-trigger'
import { ResultDeliveryPreview } from '@/components/result-delivery-preview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  CreditCard,
  Gauge,
  Headphones,
  MonitorCheck,
  PanelsTopLeft,
  Quote,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'

interface Service {
  id: string
  name: string
  slug: string
  description: string
  price: number
  features: string[]
  is_featured: boolean
  billing_type?: 'one_time' | 'subscription'
  recurring_price?: number | null
}

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.thedulcandesign.com/#website',
      url: 'https://www.thedulcandesign.com/',
      name: 'TheDulcanDesign',
      alternateName: ['The Dulcan Design', 'thedulcandesign.com'],
      inLanguage: 'es',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.thedulcandesign.com/#organization',
      name: 'TheDulcanDesign',
      url: 'https://www.thedulcandesign.com/',
      logo: 'https://www.thedulcandesign.com/icon-512.png?v=3',
      email: 'thedulcandesign@gmail.com',
    },
  ],
}

interface Testimonial {
  id: string
  client_name: string
  rating: number
  title: string | null
  content: string
}

const fallbackFeaturedServices: Service[] = [
  {
    id: 'featured-obs',
    name: 'Optimización de OBS',
    slug: 'optimizacion-obs',
    description: 'Configuración profesional para transmitir con mayor estabilidad y calidad.',
    price: 29.99,
    features: ['Calidad ajustada a tu conexión', 'Menor uso innecesario de recursos', 'Escenas y salida configuradas'],
    is_featured: true,
    billing_type: 'one_time',
  },
  {
    id: 'featured-streaming',
    name: 'Configuración de streaming',
    slug: 'configuracion-streaming',
    description: 'Tu flujo completo preparado para Twitch, YouTube y otras plataformas.',
    price: 49.99,
    features: ['Alertas y widgets', 'Flujo de escenas organizado', 'Configuración lista para usar'],
    is_featured: true,
    billing_type: 'one_time',
  },
  {
    id: 'featured-web',
    name: 'Página web profesional',
    slug: 'pagina-web-profesional',
    description: 'Presencia digital moderna, adaptable y preparada para presentar tu marca.',
    price: 80.99,
    recurring_price: 5.99,
    features: ['Diseño adaptable', 'Formulario de contacto', 'Dominio y hosting administrados'],
    is_featured: true,
    billing_type: 'subscription',
  },
]

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

type SectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  tone?: 'primary' | 'secondary'
}

function SectionHeading({ eyebrow, title, description, tone = 'primary' }: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-14 max-w-3xl text-center">
      <p className={`mb-3 text-xs font-bold uppercase tracking-[.24em] ${tone === 'primary' ? 'text-primary' : 'text-secondary'}`}>
        {eyebrow}
      </p>
      <h2 className={`text-4xl font-black uppercase tracking-[-.035em] md:text-5xl ${tone === 'primary' ? 'gradient-text-primary' : 'gradient-text-secondary'}`}>
        {title}
      </h2>
      {description && <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">{description}</p>}
    </div>
  )
}

const processSteps = [
  { title: 'Elige tu servicio', description: 'Compara opciones y selecciona la solución que encaja con tu objetivo.', icon: SlidersHorizontal },
  { title: 'Cuéntanos tu caso', description: 'Responde un diagnóstico breve para preparar una solución precisa.', icon: Gauge },
  { title: 'Coordinamos contigo', description: 'Confirmamos alcance, horario, acceso y próximos pasos de forma privada.', icon: Clock3 },
  { title: 'Recibe el resultado', description: 'Entregamos, comprobamos contigo y dejamos soporte posterior disponible.', icon: BadgeCheck },
]

const benefits: Array<{ title: string; description: string; icon: LucideIcon }> = [
  { title: 'Diagnóstico real', description: 'La configuración se adapta a tu equipo, conexión, plataforma y objetivos.', icon: Gauge },
  { title: 'Proceso seguro', description: 'Pago protegido, atención privada y cambios explicados con claridad.', icon: ShieldCheck },
  { title: 'Acompañamiento', description: 'No desaparecemos después de entregar: verificamos que todo quede estable.', icon: Headphones },
]

const showcaseItems: Array<{ title: string; description: string; detail: string; icon: LucideIcon }> = [
  {
    title: 'OBS optimizado',
    description: 'Escenas, codificador y salida preparados para el hardware y la conexión disponibles.',
    detail: 'Configuración y comprobación',
    icon: Gauge,
  },
  {
    title: 'Streaming organizado',
    description: 'Un flujo visual limpio para transmitir, controlar alertas y cambiar escenas con confianza.',
    detail: 'Flujo listo para usar',
    icon: MonitorCheck,
  },
  {
    title: 'Presencia profesional',
    description: 'Páginas y recursos visuales coherentes con la marca, adaptados a móvil y escritorio.',
    detail: 'Diseño adaptable',
    icon: PanelsTopLeft,
  },
]

const faqs = [
  {
    question: '¿Cuánto tiempo tardan los servicios?',
    answer: 'La mayoría se completa entre 1 y 3 horas. Los trabajos de diseño, desarrollo o configuración avanzada pueden requerir varios días; siempre verás el estimado antes de pagar.',
  },
  {
    question: '¿Ofrecen soporte después del servicio?',
    answer: 'Sí. Revisamos contigo el resultado y ofrecemos soporte posterior según el servicio contratado. Puedes escribirnos desde la burbuja de soporte o mediante Discord.',
  },
  {
    question: '¿Cómo se realiza el pago?',
    answer: 'El pago se procesa de forma segura mediante Stripe. Antes de confirmar verás el precio, si es un pago único o recurrente y qué incluye exactamente.',
  },
  {
    question: '¿Trabajan de forma remota?',
    answer: 'Sí. Coordinamos una sesión privada y te indicamos cada paso. Nunca pedimos contraseñas personales y puedes observar el proceso completo.',
  },
]

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
    const requestController = new AbortController()
    const requestTimeout = window.setTimeout(() => requestController.abort(), 6000)

    const loadHomeContent = async () => {
      try {
        const supabase = createClient()

        const [servicesResult, testimonialsResult] = await Promise.all([
          supabase
            .from('services')
            .select('*')
            .eq('is_featured', true)
            .order('sort_order', { ascending: true })
            .limit(3)
            .abortSignal(requestController.signal),
          supabase
            .from('testimonials')
            .select('id, client_name, rating, title, content')
            .eq('is_displayed', true)
            .order('created_at', { ascending: false })
            .limit(6)
            .abortSignal(requestController.signal),
        ])

        if (!isActive) return

        setFeaturedServices(
          servicesResult.error || !servicesResult.data?.length
            ? fallbackFeaturedServices
            : servicesResult.data,
        )

        if (!testimonialsResult.error && testimonialsResult.data?.length) {
          setTestimonials(testimonialsResult.data)
        }
      } catch {
        if (isActive) setFeaturedServices(fallbackFeaturedServices)
      } finally {
        window.clearTimeout(requestTimeout)
        if (isActive) setLoading(false)
      }
    }

    void loadHomeContent()

    return () => {
      isActive = false
      window.clearTimeout(requestTimeout)
      requestController.abort()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
      />
      <div className="animated-bg"></div>
      <div className="animated-bg-overlay"></div>
      <div className="relative z-10">
        <Navbar />

      {/* Hero Section */}
      <section className="premium-grid relative overflow-hidden px-4 pb-16 pt-32 md:pb-24 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative mx-auto grid w-full items-center gap-14 lg:grid-cols-[1.08fr_.92fr]">
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
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-primary/25 bg-primary/10 p-1">
                  <Image src="/thedulcandesign-icon.png" alt="TheDulcanDesign" width={32} height={32} loading="eager" className="object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[.07] bg-[#0d0f16]/80 px-4 py-6 backdrop-blur-xl" aria-label="Garantías del servicio">
        <div className="mx-auto grid w-full grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {[
            { label: 'Atención', value: 'Personalizada', icon: Headphones },
            { label: 'Pago', value: 'Protegido', icon: CreditCard },
            { label: 'Proceso', value: 'Transparente', icon: BadgeCheck },
            { label: 'Resultado', value: 'Comprobado', icon: Sparkles },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center justify-center gap-3 rounded-2xl px-2 py-2 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span><span className="block text-sm font-bold text-foreground md:text-base">{value}</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[.16em] text-muted">{label}</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-24 px-4 bg-card/30">
        <div className="mx-auto w-full">
          <SectionHeading
            eyebrow="Soluciones especializadas"
            title="Servicios creados para rendir más"
            description="Elige el punto de partida. Cada servicio se adapta a tu hardware, plataforma y objetivos."
          />
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
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[.16em] text-muted">{service.billing_type === 'subscription' ? 'Creación inicial' : 'Desde'}</span>
                          <span className="mt-1 block text-3xl font-black text-foreground">${Number(service.price).toFixed(2)}</span>
                          {service.billing_type === 'subscription' && service.recurring_price != null && (
                            <span className="mt-1 block text-xs font-semibold text-primary">+ ${Number(service.recurring_price).toFixed(2)}/mes</span>
                          )}
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                          {service.billing_type === 'subscription' ? 'Servicio continuo' : 'Pago único'}
                        </span>
                      </div>
                      <Button variant="outline" size="lg" href={`/servicios/${service.slug}`} className="border-white/15 group-hover:border-primary/50 group-hover:bg-primary/10">
                        Ver detalles <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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
      <section className="px-4 py-24 md:px-8">
        <div className="mx-auto w-full">
          <SectionHeading
            eyebrow="Un proceso simple"
            title="Cómo funciona"
            description="Sabes qué ocurrirá en cada etapa, desde el diagnóstico inicial hasta la comprobación final."
            tone="secondary"
          />
          <div className="relative grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block" aria-hidden="true" />
            {processSteps.map(({ title, description, icon: Icon }, index) => (
              <article key={title} className="group relative rounded-3xl border border-white/10 bg-[#10121a]/78 p-6 shadow-[0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/35">
                <div className="mb-6 flex items-center justify-between">
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-[#121624] text-primary shadow-[0_0_30px_rgba(88,101,242,.14)]"><Icon className="h-7 w-7" aria-hidden="true" /></span>
                  <span className="text-3xl font-black text-white/[.08]">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-card/30 px-4 py-24 md:px-8">
        <div className="mx-auto w-full">
          <SectionHeading
            eyebrow="Hecho con cuidado"
            title="¿Por qué elegirnos?"
            description="Menos promesas vagas y más claridad sobre el trabajo, el precio y el resultado que recibirás."
            tone="secondary"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map(({ title, description, icon: Icon }) => (
              <article key={title} className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/[.055] to-white/[.018] p-8 transition duration-300 hover:border-primary/35 hover:bg-primary/[.055]">
                <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary transition group-hover:scale-105"><Icon className="h-7 w-7" aria-hidden="true" /></span>
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Before / after */}
      <section className="px-4 py-24 md:px-8">
        <div className="mx-auto w-full">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0f17]/88 shadow-[0_28px_90px_rgba(0,0,0,.38)]">
            <div className="grid lg:grid-cols-[.78fr_1.22fr]">
              <div className="border-b border-white/10 p-8 md:p-12 lg:border-b-0 lg:border-r">
                <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">Resultados visibles</p>
                <h2 className="mt-4 text-4xl font-black uppercase tracking-[-.035em] md:text-5xl">Antes y después, sin adivinar</h2>
                <p className="mt-5 text-base leading-relaxed text-muted">Analizamos el punto de partida, realizamos los cambios necesarios y comprobamos el resultado contigo.</p>
                <Button href="/servicios" variant="outline" size="lg" className="mt-8 border-white/15 bg-white/[.03]">
                  Encontrar mi servicio <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                <div className="bg-[#12141d] p-8 md:p-10">
                  <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-300">Antes</span>
                  <ul className="mt-7 space-y-4 text-sm text-muted">
                    {['Ajustes genéricos', 'Caídas de rendimiento', 'Escenas y flujo desordenados', 'Sin una ruta clara de soporte'].map((item) => <li key={item} className="flex gap-3"><span className="text-red-300/80">—</span>{item}</li>)}
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-primary/[.12] to-[#12141d] p-8 md:p-10">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">Después</span>
                  <ul className="mt-7 space-y-4 text-sm text-foreground/85">
                    {['Configuración para tu equipo', 'Rendimiento comprobado', 'Flujo limpio y fácil de usar', 'Soporte posterior disponible'].map((item) => <li key={item} className="flex gap-3"><Check className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Work samples */}
      <section className="border-y border-white/[.07] bg-[#0b0d14]/75 px-4 py-24 md:px-8">
        <div className="mx-auto w-full">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[.24em] text-primary">Muestras de trabajo</p>
              <h2 className="text-4xl font-black uppercase tracking-[-.035em] gradient-text-primary md:text-5xl">Así se ve una entrega cuidada</h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">Ejemplos visuales del tipo de organización, claridad y acabado que buscamos en cada servicio.</p>
            </div>
            <Button href="/resultados" variant="outline" size="lg" className="shrink-0 border-white/15 bg-white/[.035]">
              Ver resultados <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {showcaseItems.map(({ title, description, detail, icon: Icon }, index) => (
              <article key={title} className="group overflow-hidden rounded-3xl border border-white/10 bg-[#11131b] transition duration-300 hover:-translate-y-1 hover:border-primary/35">
                <div className="relative h-56 overflow-hidden border-b border-white/[.07] bg-gradient-to-br from-primary/[.18] via-[#111522] to-secondary/[.1] p-5">
                  <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
                  <div className="relative h-full rounded-2xl border border-white/10 bg-[#0b0d14]/80 p-4 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between"><Icon className="h-6 w-6 text-primary" aria-hidden="true" /><span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-300">Preparado</span></div>
                    <ResultDeliveryPreview index={index} accent="from-primary to-secondary" compact />
                  </div>
                </div>
                <div className="p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">{detail}</p>
                  <h3 className="mt-3 text-xl font-bold text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 md:px-8">
        <div className="mx-auto w-full">
          <SectionHeading
            eyebrow="Experiencias compartidas"
            title="Lo que dicen nuestros clientes"
            description="Opiniones publicadas por personas que confiaron en TheDulcanDesign para mejorar su experiencia."
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => {
              const rating = Math.min(5, Math.max(1, testimonial.rating || 5))

              return (
                <Card
                  key={testimonial.id}
                  className="group relative overflow-hidden rounded-3xl border-white/10 bg-[#11131b]/85 transition duration-300 hover:-translate-y-1 hover:border-primary/30"
                  style={{ animationDelay: `${(index + 1) * 0.1}s` }}
                >
                  <Quote className="absolute right-6 top-6 h-9 w-9 text-primary/15" aria-hidden="true" />
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                        <span className="text-2xl font-bold">{getInitials(testimonial.client_name)}</span>
                      </div>
                      <div>
                        <CardTitle className="text-xl">{testimonial.client_name}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1.5 text-sm text-emerald-300"><BadgeCheck className="h-4 w-4" aria-hidden="true" /> Cliente verificado</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {testimonial.title && <p className="mb-2 text-sm font-bold text-foreground">{testimonial.title}</p>}
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
        <div className="mx-auto w-full max-w-4xl">
          <SectionHeading
            eyebrow="Todo claro antes de empezar"
            title="Preguntas frecuentes"
            description="Respuestas rápidas sobre tiempos, soporte, pagos y cómo trabajamos contigo."
            tone="secondary"
          />
          <div className="space-y-3">
            {faqs.map(({ question, answer }, index) => (
              <details key={question} className="group rounded-2xl border border-white/10 bg-[#11131b]/80 px-6 open:border-primary/30 open:bg-primary/[.055]" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 text-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-primary transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="border-t border-white/[.07] pb-6 pt-5 text-base leading-relaxed text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary/15 via-[#11131b] to-secondary/10 px-4 py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" aria-hidden="true" />
        <div className="mx-auto w-full text-center">
          <div className="relative mx-auto max-w-3xl animate-fade-in-scale">
            <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary"><Zap className="h-7 w-7" aria-hidden="true" /></span>
            <h2 className="mb-6 text-4xl font-black uppercase tracking-[-.035em] gradient-text-primary md:text-5xl">¿Listo para optimizar tu setup?</h2>
            <p className="mb-8 text-lg leading-relaxed text-muted md:text-xl">
              Cuéntanos qué quieres mejorar y te ayudaremos a elegir el servicio correcto, sin compromiso.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button variant="primary" size="lg" href="/servicios" className="premium-button h-14 px-10 text-base">
                Ver servicios <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              <SupportChatButton variant="outline" size="lg" className="h-14 border-white/15 bg-white/[.035] px-10 text-base">
                Hablar con soporte
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

