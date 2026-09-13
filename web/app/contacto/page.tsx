'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    discord: '',
    service: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [services, setServices] = useState<Array<{id: string, name: string, slug: string, price: number}>>([])
  const router = useRouter()

  // Cargar servicios desde Supabase
  useEffect(() => {
    const loadServices = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('services')
        .select('id, name, slug, price')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (data) setServices(data)
    }
    loadServices()
  }, [])

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

    setIsSubmitting(true)

    try {
      const service = services.find(s => s.name === formData.service)
      if (!service) {
        throw new Error('Servicio no encontrado')
      }

      // Obtener sesión actual para obtener user_id
      const session = await getSession()
      const userId = session?.user?.id

      // Guardar en Supabase
      const supabase = createClient()
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId || null,
          service_id: service.id,
          client_name: formData.name,
          client_email: formData.email,
          client_discord: formData.discord || null,
          description: formData.description,
          price: service.price,
          status: 'pending',
        })
        .select()
        .single()

      if (orderError) throw orderError

      setOrderNumber(orderData.order_number)
      setSubmitSuccess(true)
      setFormData({
        name: '',
        email: '',
        discord: '',
        service: '',
        description: ''
      })
    } catch (error) {
      console.error('Error al crear pedido:', error)
      setErrors({ general: 'Error al crear el pedido. Inténtalo de nuevo.' })
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

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-green-500/50">
              <CardHeader>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">¡Solicitud Creada!</CardTitle>
                  <CardDescription className="mt-2">
                    Tu pedido ha sido creado exitosamente
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted mb-1">Número de pedido</div>
                    <div className="text-2xl font-bold text-primary">{orderNumber}</div>
                  </div>

                  <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted mb-1">Estado actual</div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="font-medium">Pendiente</span>
                    </div>
                  </div>

                  <div className="text-center space-y-4 pt-4">
                    <p className="text-muted">
                      Te contactaremos pronto por email o Discord para coordinar tu servicio.
                    </p>
                    <Button variant="primary" href="https://discord.gg/EDaCnZgC6T" target="_blank" rel="noopener noreferrer">
                      Unirse a Discord
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/pedidos')}>
                      Ver mis pedidos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Solicitar Servicio</h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Completa el formulario para crear tu pedido. Te contactaremos pronto para coordinar el servicio.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card>
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
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'
                    }`}
                    placeholder="tu@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="discord" className="block text-sm font-medium mb-2">
                    Usuario de Discord (opcional)
                  </label>
                  <input
                    type="text"
                    id="discord"
                    name="discord"
                    value={formData.discord}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="usuario#1234"
                  />
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
                  {isSubmitting ? 'Creando pedido...' : 'Crear Pedido'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Alternative Contact Methods */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discord</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted mb-4">
                  Únete a nuestro servidor para soporte en tiempo real
                </p>
                <Button variant="outline" className="w-full" href="https://discord.gg/EDaCnZgC6T" target="_blank" rel="noopener noreferrer">
                  Unirse al Servidor
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Email</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted mb-4">
                  Envíanos un email para consultas formales
                </p>
                <Button variant="outline" className="w-full" href="mailto:contact@fh4xdzz.com">
                  contact@fh4xdzz.com
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
