import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 hero-bg animated-gradient-bg">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-display gradient-text-primary hero-title-glow hero-title-stroke">
              Optimización Profesional para Streaming y Gaming
            </h1>
            <p className="text-xl md:text-2xl text-muted mb-8 max-w-2xl mx-auto text-headline">
              Expertos en configuración de OBS, streaming, optimización de PC y soporte técnico.
              Lleva tu setup al siguiente nivel con resultados profesionales.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button variant="primary" size="lg" href="/servicios" className="shimmer-button animate-bounce-subtle text-lg px-8 py-4">
                Ver Servicios
              </Button>
              <Button variant="secondary" size="lg" href="https://discord.gg/DXkEXrYRvM" target="_blank" rel="noopener noreferrer" className="hover-lift text-lg px-8 py-4">
                Unirse a Discord
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-24 px-4 bg-card/30">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-primary animate-fade-in-up">Servicios Destacados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-primary/50 hover:border-primary transition-all hover-lift hover-glow glowing-border glass-card">
              <CardHeader>
                <CardTitle className="text-2xl mb-2">Optimización de OBS</CardTitle>
                <CardDescription className="text-base">Configuración profesional para streaming de alta calidad</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted">
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Mejor calidad de video</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Uso optimizado de CPU</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Configuración de escenas</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Transiciones suaves</span></li>
                </ul>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-3xl font-bold gradient-text-primary">$29.99</span>
                  <Button variant="outline" size="lg" href="/servicios" className="shimmer-button">
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/50 hover:border-secondary transition-all hover-lift hover-glow glowing-border glass-card">
              <CardHeader>
                <CardTitle className="text-2xl mb-2">Configuración de Streaming</CardTitle>
                <CardDescription className="text-base">Setup completo para Twitch, YouTube u otras plataformas</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted">
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Streaming estable</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Alertas personalizadas</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Chat integrado</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Overlay profesional</span></li>
                </ul>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-3xl font-bold gradient-text-secondary">$49.99</span>
                  <Button variant="outline" size="lg" href="/servicios" className="shimmer-button">
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent/50 hover:border-accent transition-all hover-lift hover-glow glowing-border glass-card">
              <CardHeader>
                <CardTitle className="text-2xl mb-2">Optimización de PC</CardTitle>
                <CardDescription className="text-base">Mejora del rendimiento del sistema para gaming</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted">
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Sistema más rápido</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Menos latencia</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Mejor rendimiento en juegos</span></li>
                  <li className="flex items-center gap-2">✓ <span className="text-foreground">Eliminación de bloatware</span></li>
                </ul>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-3xl font-bold gradient-text-primary">$39.99</span>
                  <Button variant="outline" size="lg" href="/servicios" className="shimmer-button">
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 md:px-8">
        <div className="container mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-secondary animate-fade-in-up">Cómo Funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform cursor-pointer glowing-border">
                <span className="text-4xl md:text-5xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Selecciona Servicio</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Elige el servicio que necesitas de nuestro catálogo</p>
            </div>
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform cursor-pointer glowing-border">
                <span className="text-4xl md:text-5xl font-bold text-secondary">2</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Completa Formulario</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Proporciona los detalles de lo que necesitas</p>
            </div>
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform cursor-pointer glowing-border">
                <span className="text-4xl md:text-5xl font-bold text-accent">3</span>
              </div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Recibe Confirmación</h3>
              <p className="text-sm md:text-base text-muted leading-relaxed px-4">Te contactaremos para coordinar el servicio</p>
            </div>
            <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform cursor-pointer glowing-border">
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
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-secondary animate-fade-in-up">¿Por Qué Elegirnos?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center glass-card p-8 rounded-2xl hover-lift hover-glow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-6xl mb-6 animate-float">🎯</div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Expertos Certificados</h3>
              <p className="text-base text-muted leading-relaxed">Equipo con años de experiencia en streaming y gaming</p>
            </div>
            <div className="text-center glass-card p-8 rounded-2xl hover-lift hover-glow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-6xl mb-6 animate-float" style={{ animationDelay: '0.5s' }}>⚡</div>
              <h3 className="font-semibold mb-3 text-xl text-foreground">Resultados Rápidos</h3>
              <p className="text-base text-muted leading-relaxed">Optimizaciones eficientes en tiempo récord</p>
            </div>
            <div className="text-center glass-card p-8 rounded-2xl hover-lift hover-glow animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
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
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-primary animate-fade-in-up">Lo Que Dicen Nuestros Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="glass-card hover-lift hover-glow glowing-border animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-float">
                    <span className="font-bold text-2xl">CG</span>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Carlos Gaming</CardTitle>
                    <CardDescription className="text-base">Streamer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted mb-4 text-base leading-relaxed">
                  &ldquo;La optimización de OBS mejoró mucho mi stream, ahora tengo calidad profesional sin lag. ¡Muy recomendado!&rdquo;
                </p>
                <div className="flex text-primary text-2xl">★★★★★</div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift hover-glow glowing-border animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center animate-float" style={{ animationDelay: '0.5s' }}>
                    <span className="font-bold text-2xl">MS</span>
                  </div>
                  <div>
                    <CardTitle className="text-xl">Maria Streamer</CardTitle>
                    <CardDescription className="text-base">Content Creator</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted mb-4 text-base leading-relaxed">
                  &ldquo;Me ayudaron con todo el setup de streaming desde cero. El soporte fue increíble y muy paciente.&rdquo;
                </p>
                <div className="flex text-secondary text-2xl">★★★★★</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 md:px-8 bg-card/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-secondary animate-fade-in-up">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            <Card className="glass-card hover-lift hover-glow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-xl">¿Cuánto tiempo tardan los servicios?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-base leading-relaxed">
                  La mayoría de nuestros servicios se completan en 1-3 horas. Servicios más complejos como diseño de overlays pueden tomar 3-5 días.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift hover-glow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-xl">¿Ofrecen soporte después del servicio?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-base leading-relaxed">
                  Sí, ofrecemos soporte post-servicio para asegurar que todo funcione correctamente. Puedes contactarnos por Discord o email.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift hover-glow animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="text-xl">¿Qué métodos de pago aceptan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted text-base leading-relaxed">
                  Aceptamos PayPal, transferencia bancaria y criptomonedas. Los detalles se proporcionan al confirmar el servicio.
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
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text-primary">¿Listo para Optimizar tu Setup?</h2>
            <p className="text-xl text-muted mb-8 text-headline">
              Únete a cientos de clientes satisfechos que han mejorado su experiencia de streaming y gaming.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button variant="primary" size="lg" href="/servicios" className="shimmer-button text-lg px-10 py-5 hover-lift">
                Ver Servicios
              </Button>
              <Button variant="outline" size="lg" href="/contacto" className="text-lg px-10 py-5 hover-lift">
                Contactar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
