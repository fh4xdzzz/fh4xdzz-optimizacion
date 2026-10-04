import type { Metadata } from 'next'
import { ArrowRight, BadgeCheck, Check, Gauge, MonitorCheck, PanelsTopLeft, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { SupportChatButton } from '@/components/support-chat-trigger'
import { ResultDeliveryPreview } from '@/components/result-delivery-preview'

export const metadata: Metadata = {
  title: 'Resultados y muestras de trabajo | TheDulcanDesign',
  description: 'Conoce cómo presentamos las entregas de optimización, streaming y diseño web de TheDulcanDesign.',
}

const samples = [
  {
    category: 'Optimización',
    title: 'Configuración de OBS',
    description: 'Una entrega enfocada en estabilidad, claridad y facilidad de uso para que el cliente pueda transmitir con confianza.',
    icon: Gauge,
    accent: 'from-cyan-400 to-blue-600',
    deliverables: ['Ajustes adaptados al equipo', 'Escenas y salida organizadas', 'Comprobación final guiada'],
  },
  {
    category: 'Streaming',
    title: 'Flujo profesional',
    description: 'Escenas, alertas y controles organizados para reducir pasos innecesarios durante una transmisión.',
    icon: MonitorCheck,
    accent: 'from-violet-400 to-indigo-600',
    deliverables: ['Estructura fácil de entender', 'Alertas y elementos conectados', 'Guía de uso incluida'],
  },
  {
    category: 'Diseño y web',
    title: 'Presencia digital',
    description: 'Una experiencia coherente con la marca, clara para el visitante y adaptada a teléfonos, tabletas y computadoras.',
    icon: PanelsTopLeft,
    accent: 'from-fuchsia-400 to-violet-600',
    deliverables: ['Diseño adaptable', 'Llamadas a la acción claras', 'Entrega lista para publicar'],
  },
]

export default function ResultadosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="animated-bg" />
      <div className="animated-bg-overlay" />
      <div className="relative z-10">
        <Navbar />

        <main>
          <section className="premium-grid relative overflow-hidden px-4 pb-20 pt-36 md:px-8 md:pb-28 md:pt-44">
            <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" aria-hidden="true" />
            <div className="container relative mx-auto text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-primary">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Calidad visible
              </span>
              <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black uppercase leading-[.95] tracking-[-.055em] md:text-7xl">
                Resultados claros, <span className="gradient-text-primary">entregas cuidadas</span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
                Estas vistas representan cómo organizamos y presentamos el trabajo. Cada proyecto final se adapta al equipo, la marca y los objetivos del cliente.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href="/servicios" variant="primary" size="lg" className="premium-button h-14 px-9">
                  Explorar servicios <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
                <SupportChatButton variant="outline" size="lg" className="h-14 border-white/15 bg-white/[.035] px-9">Consultar mi proyecto</SupportChatButton>
              </div>
            </div>
          </section>

          <section className="px-4 py-24 md:px-8">
            <div className="container mx-auto space-y-10">
              {samples.map(({ category, title, description, icon: Icon, accent, deliverables }, index) => (
                <article key={title} className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e1018]/90 shadow-[0_30px_90px_rgba(0,0,0,.3)] lg:grid-cols-2">
                  <div className={`relative min-h-[320px] overflow-hidden bg-gradient-to-br ${accent} p-6 md:p-10 ${index % 2 ? 'lg:order-2' : ''}`}>
                    <div className="absolute inset-0 bg-[#080a10]/55" aria-hidden="true" />
                    <div className="relative flex h-full min-h-[260px] flex-col rounded-3xl border border-white/15 bg-[#0b0d14]/85 p-6 shadow-2xl backdrop-blur-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-5">
                        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Icon className="h-6 w-6" aria-hidden="true" /></span><div><p className="text-sm font-bold">TheDulcanDesign</p><p className="text-xs text-muted">Vista de entrega</p></div></div>
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Completado</span>
                      </div>
                      <ResultDeliveryPreview index={index} accent={accent} />
                    </div>
                  </div>
                  <div className={`flex flex-col justify-center p-8 md:p-12 ${index % 2 ? 'lg:order-1' : ''}`}>
                    <p className="text-xs font-bold uppercase tracking-[.22em] text-primary">{category}</p>
                    <h2 className="mt-4 text-4xl font-black uppercase tracking-[-.04em]">{title}</h2>
                    <p className="mt-5 text-base leading-relaxed text-muted">{description}</p>
                    <ul className="mt-7 space-y-3">
                      {deliverables.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-foreground/85"><Check className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />{item}</li>)}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="border-y border-white/10 bg-primary/[.065] px-4 py-20 md:px-8">
            <div className="container mx-auto grid gap-6 md:grid-cols-3">
              {[
                { title: 'Alcance definido', description: 'Sabes qué incluye el servicio antes de comenzar.', icon: BadgeCheck },
                { title: 'Proceso protegido', description: 'La atención y el pago se realizan de forma segura.', icon: ShieldCheck },
                { title: 'Resultado comprobado', description: 'Revisamos la entrega contigo antes de cerrar.', icon: MonitorCheck },
              ].map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-[#10121a]/75 p-7"><Icon className="h-7 w-7 text-primary" aria-hidden="true" /><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{description}</p></div>
              ))}
            </div>
          </section>

          <section className="px-4 py-24 text-center md:px-8">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-4xl font-black uppercase tracking-[-.04em] gradient-text-primary md:text-5xl">Tu proyecto puede ser el próximo</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">Cuéntanos qué quieres mejorar y te recomendaremos el punto de partida correcto.</p>
              <SupportChatButton variant="primary" size="lg" className="premium-button mt-8 h-14 px-10">Hablar sobre mi proyecto <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></SupportChatButton>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  )
}
