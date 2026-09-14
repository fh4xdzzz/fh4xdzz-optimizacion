import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  details?: string
  is_active: boolean
  is_featured: boolean
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

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
            
            {/* Image */}
            {service.image_url && (
              <div className="mb-8 rounded-lg overflow-hidden border border-border">
                <img 
                  src={service.image_url} 
                  alt={service.name}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{service.name}</h1>
            <p className="text-xl text-muted mb-6">{service.description}</p>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold">${service.price}</div>
              <div className="text-muted">• {service.duration_estimate}</div>
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
              {service.details && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detalles del Servicio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted leading-relaxed">{service.details}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Beneficios</CardTitle>
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
                          <span className="text-muted">{benefit}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">No hay beneficios especificados</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Qué Incluye</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {service.includes && service.includes.length > 0 ? (
                      service.includes.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-secondary" />
                          </div>
                          <span className="text-muted">{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted">No hay detalles especificados</li>
                    )}
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
                      <span>{service.duration_estimate}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-muted">Categoría</span>
                      <span className="capitalize">{service.category}</span>
                    </div>
                    <Button variant="primary" className="w-full" href={`/contacto?service=${service.id}`}>
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
                  <Button variant="outline" className="w-full" href="https://discord.gg/EDaCnZgC6T" target="_blank" rel="noopener noreferrer">
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