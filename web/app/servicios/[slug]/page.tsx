import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DiscordInviteButton } from '@/components/discord-invite-button'

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="mx-auto w-full text-center">
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

  const processSteps = service.slug === 'pagina-web-profesional'
    ? [
        ['01', 'Definición', 'Acordamos el objetivo, las secciones, el contenido y el estilo visual de tu página.'],
        ['02', 'Diseño y desarrollo', 'Construimos una experiencia adaptable, rápida y alineada con tu marca.'],
        ['03', 'Revisión y publicación', 'Aplicamos tus ajustes, comprobamos la página y realizamos la publicación inicial.'],
      ]
    : service.slug === 'bot-de-discord'
    ? [
        ['01', 'Definición', 'Acordamos las funciones, comandos, permisos e integraciones que necesita el bot.'],
        ['02', 'Desarrollo', 'Creamos, configuramos y probamos el bot de forma segura en tu servidor.'],
        ['03', 'Alojamiento', 'Publicamos el bot en el hosting administrado y verificamos su funcionamiento 24/7.'],
      ]
    : service.category === 'discord'
    ? [
        ['01', 'Planificación', 'Definimos el objetivo, la comunidad, los roles y las funciones necesarias.'],
        ['02', 'Configuración', 'Creamos canales, permisos, bienvenida, moderación, tickets y bots existentes.'],
        ['03', 'Entrega', 'Probamos el servidor contigo, transferimos el control y explicamos su administración.'],
      ]
    : [
        ['01', 'Diagnóstico', 'Revisamos tu equipo, objetivos y problemas actuales.'],
        ['02', 'Optimización', 'Aplicamos la configuración y comprobamos cada cambio.'],
        ['03', 'Entrega', 'Validamos el resultado contigo y explicamos lo realizado.'],
      ]

  const isSubscription = service.billing_type === 'subscription' && service.recurring_price != null

  return (
    <div className="min-h-screen bg-background">
      <div className="animated-bg" />
      <div className="animated-bg-overlay" />
      <div className="relative z-10">
      <Navbar />

      {/* Header */}
      <section className="premium-grid relative overflow-hidden px-4 pb-14 pt-32 md:pt-40">
        <div className="pointer-events-none absolute right-1/4 top-16 h-80 w-80 rounded-full bg-primary/20 blur-[110px]" />
        <div className="mx-auto w-full">
          <div className="relative mx-auto w-full">
            <div className="mb-8 flex items-center gap-2 text-sm text-muted">
              <Link href="/servicios" className="transition hover:text-foreground">
                Servicios
              </Link>
              <span>/</span>
              <span className="text-foreground">{service.name}</span>
            </div>
            <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-5 inline-flex rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-primary">Configuración personalizada</div>
                <h1 className="mb-5 max-w-4xl text-5xl font-black tracking-[-.04em] md:text-7xl">{service.name}</h1>
                <p className="max-w-3xl text-lg leading-relaxed text-muted md:text-xl">{service.description}</p>
              </div>
              <div className="flex gap-3 lg:pb-2">
                <div className="rounded-2xl border border-white/10 bg-white/[.035] px-5 py-4"><p className="text-xs uppercase tracking-wider text-muted">Entrega</p><p className="mt-1 font-semibold">{service.duration_estimate}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[.035] px-5 py-4"><p className="text-xs uppercase tracking-wider text-muted">Soporte</p><p className="mt-1 font-semibold">Incluido</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="mx-auto w-full">
          <div className="mx-auto grid w-full grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Details */}
            <div className="min-w-0 space-y-8">
              {service.details && (
                <Card className="rounded-3xl border-white/10 bg-[#11131b]/85">
                  <CardHeader>
                    <CardTitle>Detalles del Servicio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted leading-relaxed">{service.details}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-3xl border-white/10 bg-[#11131b]/85">
                <CardHeader>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Resultados</p>
                  <CardTitle className="text-3xl">Lo que vas a mejorar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.benefits && service.benefits.length > 0 ? (
                      service.benefits.map((benefit: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-foreground/85">{benefit}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">No hay beneficios especificados</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-[#11131b]/85">
                <CardHeader>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Alcance claro</p>
                  <CardTitle className="text-3xl">Todo lo que incluye</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.includes && service.includes.length > 0 ? (
                      service.includes.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-secondary" />
                          </div>
                          <span className="text-foreground/85">{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">No hay detalles especificados</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-gradient-to-br from-primary/[.09] to-[#11131b]">
                <CardHeader><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Proceso</p><CardTitle className="text-3xl">Así trabajaremos</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-5 sm:grid-cols-3">
                    {processSteps.map(([number, title, text]) => (
                      <div key={number} className="rounded-2xl border border-white/10 bg-black/10 p-5"><span className="text-sm font-bold text-primary">{number}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{text}</p></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              <Card className="overflow-hidden rounded-3xl border-primary/35 bg-[#11131b]/95 shadow-[0_25px_80px_rgba(0,0,0,.4)] backdrop-blur-xl">
                <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
                <CardHeader>
                  <p className="text-sm text-muted">{isSubscription ? 'Creación inicial' : 'Inversión desde'}</p>
                  <CardTitle className="text-4xl">${Number(service.price).toFixed(2)} <span className="text-sm font-normal text-muted">USD</span></CardTitle>
                  {isSubscription && <p className="text-lg font-bold text-primary">+ ${Number(service.recurring_price).toFixed(2)}/mes de {service.slug === 'pagina-web-profesional' ? 'dominio y hosting' : 'hosting'}</p>}
                  <CardDescription>
                    {isSubscription
                      ? `Primer pago: $${(Number(service.price) + Number(service.recurring_price)).toFixed(2)}. Después, ${service.slug === 'pagina-web-profesional' ? 'el dominio y hosting se renuevan' : 'el hosting se renueva'} automáticamente por $${Number(service.recurring_price).toFixed(2)} al mes hasta cancelar.`
                      : 'Pago seguro. No aparecerá como pedido confirmado hasta completar el pago.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Diagnóstico</span>
                      <span className="font-semibold text-emerald-400">Incluido</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Duración</span>
                      <span>{service.duration_estimate}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Soporte posterior</span>
                      <span className="font-semibold text-emerald-400">Incluido</span>
                    </div>
                    {isSubscription && <div className="flex justify-between items-center py-2 border-b border-border"><span className="text-muted">{service.slug === 'pagina-web-profesional' ? 'Dominio y hosting' : 'Alojamiento'}</span><span className="font-semibold text-primary">Suscripción mensual</span></div>}
                    <Button variant="primary" size="lg" className="premium-button h-14 w-full" href={`/contacto?service=${service.id}`}>
                      Contratar servicio →
                    </Button>
                    <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted"><span className="text-emerald-400">●</span> Pago protegido mediante Stripe</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/10 bg-white/[.025]">
                <CardHeader>
                  <CardTitle className="text-lg">¿Tienes dudas?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted text-sm mb-4">
                    Consulta con nuestro equipo antes de contratar. Te ayudamos a elegir sin compromiso.
                  </p>
                  <DiscordInviteButton className="w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  )
}
