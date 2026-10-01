'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

function ContactFormContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    discord: '',
    service: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [services, setServices] = useState<Array<{id: string, name: string, slug: string, price: number}>>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled') === '1'
  const selectedService = services.find(item => item.name === formData.service)

  // Cargar servicios desde Supabase
  useEffect(() => {
    const loadServices = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('services')
        .select('id, name, slug, price')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (data) {
        setServices(data)

        // Pre-llenar servicio si se pasó en URL
        const serviceId = searchParams.get('service')
        if (serviceId) {
          const selectedService = data.find(s => s.id === serviceId)
          if (selectedService) {
            setFormData(prev => ({ ...prev, service: selectedService.name }))
          }
        }
      }
    }
    loadServices()

    // Cargar datos vinculados a la cuenta
    const loadUserProfile = async () => {
      const session = await getSession()
      if (session) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email,
          discord: session.user.discord_username || '',
        }))
      }
    }
    loadUserProfile()
  }, [searchParams])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    if (!formData.discord.trim()) {
      newErrors.discord = 'Debes vincular tu cuenta de Discord desde tu perfil antes de continuar'
    }

    if (!formData.service) {
      newErrors.service = 'Debes seleccionar un servicio'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida'
    } else if (formData.description.length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Verificar autenticación
    const session = await getSession()
    if (!session) {
      router.push('/auth/login?redirect=/contacto')
      return
    }

    setIsSubmitting(true)

    try {
      const service = services.find(s => s.name === formData.service)
      if (!service) {
        throw new Error('Servicio no encontrado')
      }

      const response = await fetch('/api/stripe/create-service-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          name: formData.name,
          description: formData.description,
        }),
      })
      const payload = await response.json() as { url?: string; error?: string }
      if (!response.ok || !payload.url) throw new Error(payload.error || 'No se pudo abrir el pago seguro')
      window.location.assign(payload.url)
    } catch (error) {
      console.error('Error al crear pedido:', error)
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : ''
      setErrors({
        general: message
          ? `No se pudo crear el pedido: ${message}`
          : 'Error al crear el pedido. Inténtalo de nuevo.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Contratación segura</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Cuéntanos qué necesitas</h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Revisaremos estos datos después de confirmar tu pago. Si cancelas, no se creará ningún pedido.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="pb-20 px-4">
        <div className="container mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
          <Card className="border-white/10 bg-card/80 shadow-2xl shadow-primary/5">
            <CardHeader>
              <CardTitle>Formulario de Solicitud</CardTitle>
              <CardDescription>
                Completa todos los campos requeridos marcados con *
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm">
                    {errors.general}
                  </div>
                )}
                {cancelled && (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                    Pago cancelado. No se realizó ningún cargo ni se creó un pedido.
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 ${
                      errors.name ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'
                    }`}
                    placeholder="Tu nombre"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    disabled
                    value={formData.email}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-muted-foreground focus:outline-none cursor-not-allowed"
                    placeholder="tu@email.com"
                  />
                  <p className="text-sm text-muted mt-1">Email de tu cuenta (no editable)</p>
                </div>

                <div>
                  <label htmlFor="discord" className="block text-sm font-medium mb-2">
                    Usuario de Discord *
                  </label>
                  <input
                    type="text"
                    id="discord"
                    name="discord"
                    required
                    disabled
                    value={formData.discord}
                    className={`w-full cursor-not-allowed rounded-lg border bg-muted px-4 py-2 text-muted-foreground focus:outline-none ${
                      errors.discord ? 'border-red-500' : 'border-border'
                    }`}
                    placeholder="Vincula Discord desde tu perfil"
                  />
                  <p className="mt-1 text-sm text-muted">Usuario vinculado a tu cuenta (no editable)</p>
                  {errors.discord && <p className="mt-1 text-sm text-red-500">{errors.discord}</p>}
                </div>

                <div>
                  <label htmlFor="service" className="block text-sm font-medium mb-2">
                    Servicio solicitado *
                  </label>
                  <select
                    id="service"
                    name="service"
                    required
                    value={formData.service}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 ${
                      errors.service ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'
                    }`}
                  >
                    <option value="">Selecciona un servicio</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.name}>
                        {service.name} - ${service.price}
                      </option>
                    ))}
                  </select>
                  {errors.service && <p className="text-red-500 text-sm mt-1">{errors.service}</p>}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Descripción del requerimiento *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 resize-none ${
                      errors.description ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'
                    }`}
                    placeholder="Describe detalladamente lo que necesitas, tu hardware actual, problemas que tienes, etc..."
                  />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Abriendo pago seguro…' : 'Continuar al pago seguro →'}
                </Button>
                <p className="text-center text-xs text-muted">Tu tarjeta se procesa directamente en Stripe. No almacenamos datos bancarios.</p>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-primary/25 bg-gradient-to-b from-primary/10 to-card lg:sticky lg:top-28">
              <CardHeader><CardTitle>Resumen</CardTitle><CardDescription>Todo claro antes de pagar.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {selectedService ? <>
                  <div><p className="text-xs uppercase tracking-wider text-muted">Servicio</p><p className="mt-1 font-semibold">{formData.service}</p></div>
                  <div className="flex items-end justify-between border-t border-white/10 pt-4"><span className="text-sm text-muted">Total</span><span className="text-3xl font-bold text-primary">${Number(selectedService.price).toFixed(2)}</span></div>
                </> : <p className="text-sm text-muted">Selecciona un servicio para ver el resumen.</p>}
                <ul className="space-y-3 border-t border-white/10 pt-4 text-sm">
                  <li>✓ Pago protegido por Stripe</li><li>✓ Pedido creado solo al pagar</li><li>✓ Soporte posterior incluido</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando...</p>
          </div>
        </section>
        <Footer />
      </div>
    }>
      <ContactFormContent />
    </Suspense>
  )
}

