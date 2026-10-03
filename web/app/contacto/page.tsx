'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'
import { Modal } from '@/components/ui/modal'

interface CheckoutInvoice {
  code: string
  customerName: string
  customerEmail: string
  discordUsername: string
  serviceName: string
  description: string
  subtotal: number
  recurringAmount: number | null
  billingType: 'one_time' | 'subscription'
  total: number
  currency: string
}

type Questionnaire = {
  objective: string
  platform: string
  currentSetup: string
  mainIssue: string
  expectedResult: string
  availability: string
}

const EMPTY_QUESTIONNAIRE: Questionnaire = {
  objective: '',
  platform: '',
  currentSetup: '',
  mainIssue: '',
  expectedResult: '',
  availability: '',
}

const QUESTION_SETS = {
  obs: {
    objectiveLabel: '¿Qué quieres lograr con OBS?',
    objectives: [
      'Transmitir con mejor calidad',
      'Grabar contenido profesional',
      'Eliminar lag o pérdida de frames',
      'Configurar escenas, audio y cámara',
    ],
    platformLabel: 'Plataforma principal',
    platforms: [
      'Twitch',
      'YouTube',
      'Kick',
      'Facebook Gaming',
      'Solo grabación',
      'Otra',
    ],
    setupPlaceholder:
      'Ej.: Ryzen 5 5600X, RTX 3060, 16 GB RAM, internet 300/50 Mbps',
    issuePlaceholder:
      'Ej.: el directo pierde frames al iniciar el juego y el micrófono se escucha bajo.',
    resultPlaceholder:
      'Ej.: transmitir a 1080p/60 FPS con imagen estable y audio limpio.',
  },
  pc: {
    objectiveLabel: '¿Cuál es tu prioridad?',
    objectives: [
      'Más FPS en juegos',
      'Windows más rápido',
      'Menos temperatura y consumo',
      'Mejor rendimiento para trabajar',
      'Optimización completa',
    ],
    platformLabel: 'Uso principal del equipo',
    platforms: [
      'Gaming competitivo',
      'Gaming casual',
      'Streaming',
      'Edición de video',
      'Trabajo y estudio',
      'Uso mixto',
    ],
    setupPlaceholder:
      'Ej.: Windows 11, i5-12400F, RTX 4060, 16 GB RAM, SSD 1 TB',
    issuePlaceholder:
      'Ej.: tirones al jugar, inicio lento y uso alto del procesador.',
    resultPlaceholder:
      'Ej.: FPS estables, menos procesos en segundo plano y arranque más rápido.',
  },
  design: {
    objectiveLabel: '¿Qué pieza visual necesitas?',
    objectives: [
      'Overlay completo',
      'Alertas y transiciones',
      'Escenas para OBS',
      'Paquete de identidad visual',
      'Diseño personalizado',
    ],
    platformLabel: '¿Dónde lo utilizarás?',
    platforms: [
      'Twitch',
      'YouTube',
      'Kick',
      'TikTok',
      'Varias plataformas',
      'Otra',
    ],
    setupPlaceholder:
      'Indica tu nombre de canal, colores, estilo y referencias visuales.',
    issuePlaceholder:
      'Cuéntanos qué materiales tienes actualmente y qué deseas reemplazar.',
    resultPlaceholder: 'Describe cómo quieres que se vea el resultado final.',
  },
  support: {
    objectiveLabel: '¿Qué tipo de ayuda necesitas?',
    objectives: [
      'Resolver un error',
      'Instalar o configurar software',
      'Revisar compatibilidad',
      'Asesoría técnica',
      'Otro problema',
    ],
    platformLabel: 'Área afectada',
    platforms: [
      'Windows',
      'OBS o streaming',
      'Hardware',
      'Red o internet',
      'Audio y video',
      'Otra',
    ],
    setupPlaceholder:
      'Indica equipo, sistema operativo, programa y versión si la conoces.',
    issuePlaceholder:
      'Describe el error, cuándo comenzó y qué intentaste antes.',
    resultPlaceholder:
      'Explica qué debería funcionar al finalizar el servicio.',
  },
  discord: {
    objectiveLabel: '¿Qué quieres lograr con tu servidor?',
    objectives: [
      'Crear una comunidad desde cero',
      'Reorganizar un servidor existente',
      'Preparar un servidor para negocio o soporte',
      'Mejorar seguridad y moderación',
      'Configurar una comunidad de gaming',
    ],
    platformLabel: 'Tipo de servidor',
    platforms: [
      'Comunidad',
      'Gaming',
      'Creador de contenido',
      'Negocio o marca',
      'Soporte al cliente',
      'Educación',
      'Otro',
    ],
    setupPlaceholder:
      'Indica si el servidor es nuevo o existente, miembros aproximados y bots actuales.',
    issuePlaceholder:
      'Describe los canales, roles, permisos, bots, tickets o moderación que necesitas.',
    resultPlaceholder:
      'Ej.: un servidor organizado, seguro y listo para recibir a mi comunidad.',
  },
  discordBot: {
    objectiveLabel: '¿Qué debe hacer tu bot?',
    objectives: [
      'Moderación automática',
      'Tickets y soporte',
      'Bienvenida, roles y verificación',
      'Comandos personalizados',
      'Economía, niveles o comunidad',
      'Integraciones con servicios externos',
    ],
    platformLabel: 'Uso principal del bot',
    platforms: [
      'Comunidad',
      'Gaming',
      'Soporte al cliente',
      'Tienda o negocio',
      'Creador de contenido',
      'Otro',
    ],
    setupPlaceholder:
      'Indica si ya tienes servidor, bot o código previo y cuántos miembros aproximados atiende.',
    issuePlaceholder:
      'Describe los comandos, automatizaciones e integraciones que debe tener el bot.',
    resultPlaceholder:
      'Ej.: un bot estable 24/7 que modere y automatice las tareas de mi comunidad.',
  },
} as const

function getQuestionSet(service?: { name: string; slug: string }) {
  const value = `${service?.name || ''} ${service?.slug || ''}`.toLowerCase()
  if (value.includes('bot')) return QUESTION_SETS.discordBot
  if (value.includes('discord') || value.includes('servidor'))
    return QUESTION_SETS.discord
  if (value.includes('obs') || value.includes('stream'))
    return QUESTION_SETS.obs
  if (
    value.includes('pc') ||
    value.includes('windows') ||
    value.includes('gaming') ||
    value.includes('juego')
  )
    return QUESTION_SETS.pc
  if (
    value.includes('dise') ||
    value.includes('overlay') ||
    value.includes('visual')
  )
    return QUESTION_SETS.design
  return QUESTION_SETS.support
}

function buildRequestDescription(answers: Questionnaire) {
  return [
    `Objetivo: ${answers.objective}`,
    `Plataforma/uso: ${answers.platform}`,
    `Equipo actual: ${answers.currentSetup.trim()}`,
    `Situación: ${answers.mainIssue.trim()}`,
    `Resultado esperado: ${answers.expectedResult.trim()}`,
    `Disponibilidad: ${answers.availability}`,
  ].join('\n')
}

function ContactFormContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    discord: '',
    service: '',
  })
  const [questionnaire, setQuestionnaire] =
    useState<Questionnaire>(EMPTY_QUESTIONNAIRE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [services, setServices] = useState<
    Array<{
      id: string
      name: string
      slug: string
      price: number
      billing_type: 'one_time' | 'subscription'
      recurring_price: number | null
    }>
  >([])
  const [checkoutPreview, setCheckoutPreview] = useState<{
    url: string
    invoice: CheckoutInvoice
  } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const cancelled = searchParams.get('cancelled') === '1'
  const selectedService = services.find(
    (item) => item.name === formData.service,
  )
  const questionSet = getQuestionSet(selectedService)

  // Cargar servicios desde Supabase
  useEffect(() => {
    const loadServices = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('services')
        .select('id, name, slug, price, billing_type, recurring_price')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
      if (data) {
        setServices(data)

        // Pre-llenar servicio si se pasó en URL
        const serviceId = searchParams.get('service')
        if (serviceId) {
          const selectedService = data.find((s) => s.id === serviceId)
          if (selectedService) {
            setFormData((prev) => ({ ...prev, service: selectedService.name }))
          }
        }
      }
    }
    loadServices()

    // Cargar datos vinculados a la cuenta
    const loadUserProfile = async () => {
      const session = await getSession()
      if (session) {
        setFormData((prev) => ({
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
      newErrors.discord =
        'Debes vincular tu cuenta de Discord desde tu perfil antes de continuar'
    }

    if (!formData.service) {
      newErrors.service = 'Debes seleccionar un servicio'
    }

    if (!questionnaire.objective)
      newErrors.objective = 'Selecciona tu objetivo principal'
    if (!questionnaire.platform)
      newErrors.platform = 'Selecciona la plataforma o uso principal'
    if (questionnaire.currentSetup.trim().length < 10)
      newErrors.currentSetup =
        'Incluye al menos 10 caracteres sobre tu equipo o configuración'
    if (questionnaire.mainIssue.trim().length < 15)
      newErrors.mainIssue = 'Explícanos el problema con un poco más de detalle'
    if (questionnaire.expectedResult.trim().length < 10)
      newErrors.expectedResult = 'Indica el resultado que esperas obtener'
    if (!questionnaire.availability)
      newErrors.availability = 'Selecciona tu disponibilidad'

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
      const service = services.find((s) => s.name === formData.service)
      if (!service) {
        throw new Error('Servicio no encontrado')
      }

      const description = buildRequestDescription(questionnaire)
      const response = await fetch('/api/stripe/create-service-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          name: formData.name,
          description,
        }),
      })
      const payload = (await response.json()) as {
        url?: string
        invoice?: CheckoutInvoice
        error?: string
      }
      if (!response.ok || !payload.url || !payload.invoice)
        throw new Error(payload.error || 'No se pudo preparar el pago seguro')
      setCheckoutPreview({ url: payload.url, invoice: payload.invoice })
    } catch (error) {
      console.error('Error al crear pedido:', error)
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message || '')
            : ''
      setErrors({
        general: message
          ? `No se pudo crear el pedido: ${message}`
          : 'Error al crear el pedido. Inténtalo de nuevo.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const proceedToPayment = () => {
    if (!checkoutPreview || isSubmitting) return
    setIsSubmitting(true)
    window.location.assign(checkoutPreview.url)
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      })
    }
  }

  const handleQuestionChange = (field: keyof Questionnaire, value: string) => {
    setQuestionnaire((previous) => ({ ...previous, [field]: value }))
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: '' }))
  }

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(e)
    setQuestionnaire(EMPTY_QUESTIONNAIRE)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Contratación segura
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Cuéntanos qué necesitas
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Revisaremos estos datos después de confirmar tu pago. Si cancelas,
            no se creará ningún pedido.
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
              <form onSubmit={handleSubmit} className="space-y-8">
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm">
                    {errors.general}
                  </div>
                )}
                {cancelled && (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                    Pago cancelado. No se realizó ningún cargo ni se creó un
                    pedido.
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      1
                    </span>
                    <div>
                      <h3 className="font-semibold">Datos de contacto</h3>
                      <p className="text-xs text-muted">
                        Información vinculada a tu cuenta.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium mb-2"
                      >
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
                          errors.name
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-border focus:ring-primary'
                        }`}
                        placeholder="Tu nombre"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-2"
                      >
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
                      <p className="text-sm text-muted mt-1">
                        Email de tu cuenta (no editable)
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="discord"
                        className="block text-sm font-medium mb-2"
                      >
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
                      <p className="mt-1 text-sm text-muted">
                        Usuario vinculado a tu cuenta (no editable)
                      </p>
                      {errors.discord && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.discord}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      2
                    </span>
                    <div>
                      <h3 className="font-semibold">Servicio y diagnóstico</h3>
                      <p className="text-xs text-muted">
                        Las preguntas cambian según el servicio seleccionado.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="service"
                        className="block text-sm font-medium mb-2"
                      >
                        Servicio solicitado *
                      </label>
                      <select
                        id="service"
                        name="service"
                        required
                        value={formData.service}
                        onChange={handleServiceChange}
                        className={`w-full px-4 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 ${
                          errors.service
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-border focus:ring-primary'
                        }`}
                      >
                        <option value="">Selecciona un servicio</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.name}>
                            {service.name} - ${service.price}
                            {service.billing_type === 'subscription' &&
                            service.recurring_price != null
                              ? ` + $${service.recurring_price}/mes`
                              : ''}
                          </option>
                        ))}
                      </select>
                      {errors.service && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.service}
                        </p>
                      )}
                    </div>

                    {selectedService ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="objective"
                            className="mb-2 block text-sm font-medium"
                          >
                            {questionSet.objectiveLabel} *
                          </label>
                          <select
                            id="objective"
                            value={questionnaire.objective}
                            onChange={(event) =>
                              handleQuestionChange(
                                'objective',
                                event.target.value,
                              )
                            }
                            className={`w-full rounded-lg border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 ${errors.objective ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                          >
                            <option value="">Selecciona una opción</option>
                            {questionSet.objectives.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {errors.objective && (
                            <p className="mt-1 text-sm text-red-500">
                              {errors.objective}
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="platform"
                            className="mb-2 block text-sm font-medium"
                          >
                            {questionSet.platformLabel} *
                          </label>
                          <select
                            id="platform"
                            value={questionnaire.platform}
                            onChange={(event) =>
                              handleQuestionChange(
                                'platform',
                                event.target.value,
                              )
                            }
                            className={`w-full rounded-lg border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 ${errors.platform ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                          >
                            <option value="">Selecciona una opción</option>
                            {questionSet.platforms.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {errors.platform && (
                            <p className="mt-1 text-sm text-red-500">
                              {errors.platform}
                            </p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="currentSetup"
                            className="mb-2 block text-sm font-medium"
                          >
                            {questionSet === QUESTION_SETS.discordBot
                              ? 'Servidor, bot o código actual'
                              : questionSet === QUESTION_SETS.discord
                              ? 'Servidor actual o punto de partida'
                              : 'Equipo o configuración actual'}{' '}
                            *
                          </label>
                          <input
                            id="currentSetup"
                            maxLength={80}
                            value={questionnaire.currentSetup}
                            onChange={(event) =>
                              handleQuestionChange(
                                'currentSetup',
                                event.target.value,
                              )
                            }
                            className={`w-full rounded-lg border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 ${errors.currentSetup ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                            placeholder={questionSet.setupPlaceholder}
                          />
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-red-500">
                              {errors.currentSetup}
                            </span>
                            <span className="text-muted">
                              {questionnaire.currentSetup.length}/80
                            </span>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="mainIssue"
                            className="mb-2 block text-sm font-medium"
                          >
                            {questionSet === QUESTION_SETS.discordBot
                              ? '¿Qué funciones debe tener el bot?'
                              : questionSet === QUESTION_SETS.discord
                              ? '¿Qué estructura y funciones necesitas?'
                              : '¿Qué está ocurriendo actualmente?'}{' '}
                            *
                          </label>
                          <textarea
                            id="mainIssue"
                            rows={3}
                            maxLength={120}
                            value={questionnaire.mainIssue}
                            onChange={(event) =>
                              handleQuestionChange(
                                'mainIssue',
                                event.target.value,
                              )
                            }
                            className={`w-full resize-none rounded-lg border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 ${errors.mainIssue ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                            placeholder={questionSet.issuePlaceholder}
                          />
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-red-500">
                              {errors.mainIssue}
                            </span>
                            <span className="text-muted">
                              {questionnaire.mainIssue.length}/120
                            </span>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="expectedResult"
                            className="mb-2 block text-sm font-medium"
                          >
                            Resultado que esperas obtener *
                          </label>
                          <textarea
                            id="expectedResult"
                            rows={2}
                            maxLength={80}
                            value={questionnaire.expectedResult}
                            onChange={(event) =>
                              handleQuestionChange(
                                'expectedResult',
                                event.target.value,
                              )
                            }
                            className={`w-full resize-none rounded-lg border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 ${errors.expectedResult ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                            placeholder={questionSet.resultPlaceholder}
                          />
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-red-500">
                              {errors.expectedResult}
                            </span>
                            <span className="text-muted">
                              {questionnaire.expectedResult.length}/80
                            </span>
                          </div>
                        </div>
                        <fieldset className="sm:col-span-2">
                          <legend className="mb-3 text-sm font-medium">
                            ¿Cuándo puedes recibir el servicio? *
                          </legend>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {[
                              'Lo antes posible',
                              'Esta semana',
                              'Fecha flexible',
                            ].map((option) => (
                              <label
                                key={option}
                                className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm transition ${questionnaire.availability === option ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-black/10 text-muted hover:border-primary/50'}`}
                              >
                                <input
                                  type="radio"
                                  name="availability"
                                  value={option}
                                  checked={
                                    questionnaire.availability === option
                                  }
                                  onChange={(event) =>
                                    handleQuestionChange(
                                      'availability',
                                      event.target.value,
                                    )
                                  }
                                  className="sr-only"
                                />
                                {option}
                              </label>
                            ))}
                          </div>
                          {errors.availability && (
                            <p className="mt-2 text-sm text-red-500">
                              {errors.availability}
                            </p>
                          )}
                        </fieldset>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/15 bg-black/10 px-5 py-8 text-center text-sm text-muted">
                        Selecciona un servicio para ver las preguntas
                        específicas de diagnóstico.
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Preparando factura…'
                    : 'Revisar código y factura →'}
                </Button>
                <p className="text-center text-xs text-muted">
                  Tu tarjeta se procesa directamente en Stripe. No almacenamos
                  datos bancarios.
                </p>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-primary/25 bg-gradient-to-b from-primary/10 to-card lg:sticky lg:top-28">
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
                <CardDescription>Todo claro antes de pagar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedService ? (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted">
                        Servicio
                      </p>
                      <p className="mt-1 font-semibold">{formData.service}</p>
                    </div>
                    {selectedService.billing_type === 'subscription' &&
                    selectedService.recurring_price != null ? (
                      <div className="space-y-3 border-t border-white/10 pt-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted">Creación inicial</span>
                          <span>
                            ${Number(selectedService.price).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Hosting mensual</span>
                          <span>
                            $
                            {Number(selectedService.recurring_price).toFixed(2)}
                            /mes
                          </span>
                        </div>
                        <div className="flex items-end justify-between border-t border-white/10 pt-3">
                          <span className="font-semibold">Primer pago</span>
                          <span className="text-3xl font-bold text-primary">
                            $
                            {(
                              Number(selectedService.price) +
                              Number(selectedService.recurring_price)
                            ).toFixed(2)}
                          </span>
                        </div>
                        <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs leading-relaxed text-muted">
                          Luego se renueva automáticamente por $
                          {Number(selectedService.recurring_price).toFixed(2)}{' '}
                          al mes hasta cancelar.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between border-t border-white/10 pt-4">
                        <span className="text-sm text-muted">Total</span>
                        <span className="text-3xl font-bold text-primary">
                          ${Number(selectedService.price).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    Selecciona un servicio para ver el resumen.
                  </p>
                )}
                <ul className="space-y-3 border-t border-white/10 pt-4 text-sm">
                  <li>✓ Pago protegido por Stripe</li>
                  <li>✓ Pedido creado solo al pagar</li>
                  <li>✓ Soporte posterior incluido</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Modal
        isOpen={Boolean(checkoutPreview)}
        onClose={() => setCheckoutPreview(null)}
        title="Revisa tu factura proforma"
        description="Confirma los datos antes de ir al pago seguro. El pedido se creará únicamente después de pagar."
        className="max-w-2xl"
      >
        {checkoutPreview && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Código de solicitud
              </p>
              <p className="mt-2 font-mono text-2xl font-black tracking-wider text-white">
                {checkoutPreview.invoice.code}
              </p>
              <p className="mt-2 text-xs text-muted">
                Guarda este código. Será el número de tu pedido después del
                pago.
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-muted">
                  Cliente
                </p>
                <p className="mt-1 font-semibold">
                  {checkoutPreview.invoice.customerName}
                </p>
                <p className="mt-1 break-all text-xs text-muted">
                  {checkoutPreview.invoice.customerEmail}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-muted">
                  Servicio
                </p>
                <p className="mt-1 font-semibold">
                  {checkoutPreview.invoice.serviceName}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Discord: {checkoutPreview.invoice.discordUsername}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-muted">
                Solicitud
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                {checkoutPreview.invoice.description}
              </p>
            </div>
            <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">
                  {checkoutPreview.invoice.billingType === 'subscription'
                    ? 'Creación inicial'
                    : 'Subtotal'}
                </span>
                <span>
                  ${checkoutPreview.invoice.subtotal.toFixed(2)}{' '}
                  {checkoutPreview.invoice.currency}
                </span>
              </div>
              {checkoutPreview.invoice.billingType === 'subscription' &&
                checkoutPreview.invoice.recurringAmount != null && (
                  <div className="flex justify-between">
                    <span className="text-muted">Hosting mensual</span>
                    <span>
                      ${checkoutPreview.invoice.recurringAmount.toFixed(2)}{' '}
                      {checkoutPreview.invoice.currency}/mes
                    </span>
                  </div>
                )}
              <div className="flex items-end justify-between border-t border-white/10 pt-3">
                <span className="font-semibold">
                  {checkoutPreview.invoice.billingType === 'subscription'
                    ? 'Primer pago'
                    : 'Total a pagar'}
                </span>
                <span className="text-3xl font-black text-primary">
                  ${checkoutPreview.invoice.total.toFixed(2)}
                </span>
              </div>
              {checkoutPreview.invoice.billingType === 'subscription' &&
                checkoutPreview.invoice.recurringAmount != null && (
                  <p className="rounded-lg border border-primary/25 bg-primary/10 p-3 text-xs leading-relaxed text-muted">
                    Después del primer pago, el hosting se renovará
                    automáticamente por $
                    {checkoutPreview.invoice.recurringAmount.toFixed(2)} al mes
                    hasta cancelar.
                  </p>
                )}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckoutPreview(null)}
              >
                Corregir información
              </Button>
              <Button
                type="button"
                onClick={proceedToPayment}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Abriendo Stripe…'
                  : 'Proceder al pago seguro →'}
              </Button>
            </div>
            <p className="text-center text-xs text-muted">
              Esto no es un comprobante de pago. Stripe emitirá la confirmación
              cuando el cargo sea aprobado.
            </p>
          </div>
        )}
      </Modal>

      <Footer />
    </div>
  )
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar />
          <section className="pt-32 pb-20 px-4">
            <div className="container mx-auto text-center">
              <p>Cargando...</p>
            </div>
          </section>
          <Footer />
        </div>
      }
    >
      <ContactFormContent />
    </Suspense>
  )
}
