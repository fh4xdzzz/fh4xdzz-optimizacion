import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent hero-title-glow hero-title-stroke">
              Optimización Profesional para Streaming y Gaming
            </h1>
            <p className="text-xl text-muted mb-8 max-w-2xl mx-auto">
              Expertos en configuración de OBS, streaming, optimización de PC y soporte técnico.
              Lleva tu setup al siguiente nivel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg" href="/servicios">
                Ver Servicios
              </Button>
              <Button variant="secondary" size="lg" href="https://discord.gg/DXkEXrYRvM" target="_blank" rel="noopener noreferrer">
                Unirse a Discord
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Servicios Destacados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/50 hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle>Optimización de OBS</CardTitle>
                <CardDescription>Configuración profesional para streaming de alta calidad</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted">
                  <li>✓ Mejor calidad de video</li>
                  <li>✓ Uso optimizado de CPU</li>
                  <li>✓ Configuración de escenas</li>
                  <li>✓ Transiciones suaves</li>
                </ul>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold">$29.99</span>
                  <Button variant="outline" size="sm" href="/servicios">
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/50 hover:border-secondary transition-colors">
              <CardHeader>
                <CardTitle>Configuración de Streaming</CardTitle>
                <CardDescription>Setup completo para Twitch, YouTube u otras plataformas</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted">
                  <li>✓ Streaming estable</li>
                  <li>✓ Alertas personalizadas</li>
                  <li>✓ Chat integrado</li>
                  <li>✓ Overlay profesional</li>
                </ul>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold">$49.99</span>
                  <Button variant="outline" size="sm" href="/servicios">
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent/50 hover:border-accent transition-colors">
              <CardHeader>
                <CardTitle>Optimización de PC</CardTitle>
                <CardDescription>Mejora del rendimiento del sistema para gaming</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted">
                  <li>✓ Sistema más rápido</li>
                  <li>✓ Menos latencia</li>
                  <li>✓ Mejor rendimiento en juegos</li>
                  <li>✓ Eliminación de bloatware</li>
                </ul>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold">$39.99</span>
                  <Button variant="outline" size="sm" href="/servicios">
                    Ver detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Cómo Funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Selecciona Servicio</h3>
              <p className="text-sm text-muted">Elige el servicio que necesitas de nuestro catálogo</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-secondary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Completa Formulario</h3>
              <p className="text-sm text-muted">Proporciona los detalles de lo que necesitas</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-accent">3</span>
              </div>
              <h3 className="font-semibold mb-2">Recibe Confirmación</h3>
              <p className="text-sm text-muted">Te contactaremos para coordinar el servicio</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">4</span>
              </div>
              <h3 className="font-semibold mb-2">Disfruta Resultados</h3>
              <p className="text-sm text-muted">Tu setup optimizado y listo para usar</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">¿Por Qué Elegirnos?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-semibold mb-2">Expertos Certificados</h3>
              <p className="text-sm text-muted">Equipo con años de experiencia en streaming y gaming</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-semibold mb-2">Resultados Rápidos</h3>
              <p className="text-sm text-muted">Optimizaciones eficientes en tiempo récord</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="font-semibold mb-2">Soporte Dedicado</h3>
              <p className="text-sm text-muted">Asistencia continua antes, durante y después del servicio</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Lo Que Dicen Nuestros Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-bold">CG</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Carlos Gaming</CardTitle>
                    <CardDescription>Streamer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted mb-4">
                  &ldquo;La optimización de OBS mejoró mucho mi stream, ahora tengo calidad profesional sin lag. ¡Muy recomendado!&rdquo;
                </p>
                <div className="flex text-primary">★★★★★</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                    <span className="font-bold">MS</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Maria Streamer</CardTitle>
                    <CardDescription>Content Creator</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted mb-4">
                  &ldquo;Me ayudaron con todo el setup de streaming desde cero. El soporte fue increíble y muy paciente.&rdquo;
                </p>
                <div className="flex text-secondary">★★★★★</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">¿Cuánto tiempo tardan los servicios?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  La mayoría de nuestros servicios se completan en 1-3 horas. Servicios más complejos como diseño de overlays pueden tomar 3-5 días.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">¿Ofrecen soporte después del servicio?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Sí, ofrecemos soporte post-servicio para asegurar que todo funcione correctamente. Puedes contactarnos por Discord o email.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">¿Qué métodos de pago aceptan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted">
                  Aceptamos PayPal, transferencia bancaria y criptomonedas. Los detalles se proporcionan al confirmar el servicio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">¿Listo para Optimizar tu Setup?</h2>
            <p className="text-xl text-muted mb-8">
              Únete a cientos de clientes satisfechos que han mejorado su experiencia de streaming y gaming.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="primary" size="lg" href="/servicios">
                Ver Servicios
              </Button>
              <Button variant="outline" size="lg" href="/contacto">
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
