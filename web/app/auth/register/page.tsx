'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUp, isDemoMode, isSupabaseMode } from '@/lib/auth-hybrid'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const isDemo = isDemoMode()
  const isSupabase = isSupabaseMode()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signUp(formData.email, formData.password, formData.fullName)
      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (err) {
      // Log detallado para diagnóstico
      console.error('Error de registro:', err)
      setError('Error al registrarse. Verifica tus datos e intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animated-bg"></div>
        <div className="animated-bg-overlay"></div>
        <div className="relative z-10">
          <Navbar />
          <section className="pt-32 pb-20 px-4">
            <div className="container mx-auto max-w-md">
              <Card className="border-green-500/50 glass-card hover-glow animate-fade-in-scale">
                <CardHeader>
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-float">
                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <CardTitle className="text-3xl gradient-text-primary">¡Registro Exitoso!</CardTitle>
                    <CardDescription className="mt-4 text-base">
                      {isSupabase 
                        ? (
                          <div className="space-y-3">
                            <p className="text-foreground font-medium">📧 Verificación de correo electrónico requerida</p>
                            <p className="text-muted">
                              Hemos enviado un email de confirmación a <strong>{formData.email}</strong>. 
                              Por favor verifica tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                            </p>
                            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-3 rounded-xl text-sm">
                              ⚠️ <strong>Importante:</strong> También revisa tu carpeta de spam o correo no deseado.
                            </div>
                            <p className="text-muted text-sm mt-4">
                              Una vez verificado, serás redirigido automáticamente a la página de login...
                            </p>
                          </div>
                        )
                        : 'Cuenta demo creada exitosamente. Serás redirigido al login...'
                      }
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-muted mb-4">Serás redirigido a la página de login en 3 segundos...</p>
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="animated-bg"></div>
      <div className="animated-bg-overlay"></div>
      <div className="relative z-10">
        <Navbar />

        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md">
            <Card className="glass-card hover-glow animate-fade-in-up">
              <CardHeader>
                <CardTitle className="text-3xl gradient-text-primary">Crear Cuenta</CardTitle>
                <CardDescription className="text-base">
                  {isSupabase 
                    ? (
                      <div className="space-y-2">
                        <p>Regístrate para comenzar a solicitar servicios</p>
                        <div className="bg-blue-500/10 border border-blue-500/50 text-blue-500 px-4 py-2 rounded-lg text-sm">
                          📧 <strong>Requiere verificación de correo electrónico</strong>
                        </div>
                      </div>
                    )
                    : 'Modo demo: Crea una cuenta de prueba'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  {isDemo && (
                    <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-3 rounded-xl text-sm">
                      ⚠️ Modo demo activo - Usando localStorage (no es autenticación real)
                    </div>
                  )}

                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="tu@email.com"
                    />
                    <p className="text-xs text-muted mt-1">
                      📧 Se enviará un enlace de verificación a este correo
                    </p>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 w-full bg-primary text-white hover:bg-primary/90 pointer-events-auto cursor-pointer shimmer-button hover-lift ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : 'Crear Cuenta'}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <span className="text-muted">¿Ya tienes cuenta? </span>
                  <Link href="/auth/login" className="text-primary hover:underline font-medium">
                    Inicia sesión
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </div>
    </div>
  )
}
