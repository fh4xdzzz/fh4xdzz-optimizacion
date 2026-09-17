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

  const handleDiscordRegister = () => {
    if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
      setError('Discord OAuth no está configurado')
      return
    }

    const scopes = ['identify', 'email']
    const redirectUri = 'https://www.thedulcandesign.com/api/auth/discord/register'
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes.join(' ')}`

    window.location.href = authUrl
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
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Crear Cuenta</CardTitle>
              <div className="text-base text-muted-foreground">
                {isSupabase
                  ? (
                    <div className="space-y-2">
                      <div>Regístrate para comenzar a solicitar servicios</div>
                      <div className="bg-blue-500/10 border border-blue-500/50 text-blue-500 px-4 py-2 rounded-lg text-sm">
                        📧 <strong>Requiere verificación de correo electrónico</strong>
                      </div>
                    </div>
                  )
                  : 'Modo demo: Crea una cuenta de prueba'
                }
              </div>
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

                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted">O regístrate con</span>
                  </div>
                </div>

                <button
                  onClick={handleDiscordRegister}
                  className="mt-6 w-full inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 bg-[#5865F2] text-white hover:bg-[#4752C4] pointer-events-auto cursor-pointer hover-lift"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.641 1.25a18.27 18.27 0 0 0-2.007.34c-.41.686-.844 1.348-1.319 1.997a13.316 13.316 0 0 0-1.767.085 19.004 19.004 0 0 0-1.596.34c-.004.003-.007.004-.011.005a.074.074 0 0 0-.037.069c-.388.755-.764 1.521-1.126 2.296a.074.074 0 0 0-.014.08c.47.816.984 1.515 1.53 2.097a.074.074 0 0 0 .041.02c1.608.763 3.356.775 5.064.02a.074.074 0 0 0 .042-.02c.546-.582 1.06-1.281 1.53-2.097a.074.074 0 0 0-.014-.08c-.362-.775-.738-1.541-1.126-2.296a.074.074 0 0 0-.037-.069c-.004-.001-.007-.002-.011-.005a18.999 18.999 0 0 0-1.596-.34c-.475-.649-.909-1.311-1.319-1.997a.074.074 0 0 0-.079-.037c-.363.246-.748.544-1.125.857-.463.346-.865.693-1.086.864a.074.074 0 0 0-.069.009c-.59.934-1.076 1.974-1.405 3.082a.074.074 0 0 0-.03.081c.43.699.884 1.371 1.355 2.014a.074.074 0 0 0 .054.028c1.319.73 2.812.748 4.168.036a.074.074 0 0 0 .054-.028c.471-.643.925-1.315 1.355-2.014a.074.074 0 0 0-.03-.081c-.329-1.108-.815-2.148-1.405-3.082a.074.074 0 0 0-.069-.009c-.221-.171-.623-.518-1.086-.864-.377-.313-.762-.611-1.125-.857a.074.074 0 0 0-.079-.037c-2.03.637-4.246.945-6.38 1.026a.074.074 0 0 0-.083.044c-.654.98-1.096 2.106-1.366 3.337a.074.074 0 0 0 .07.075c1.487.295 3.02.286 4.5-.033a.074.074 0 0 0 .07-.075c-.27-1.231-.712-2.357-1.366-3.337a.074.074 0 0 0-.083-.044c-2.134-.081-4.35-.389-6.38-1.026a.074.074 0 0 0-.079-.037c-.363-.246-.748-.544-1.125-.857z"/>
                  </svg>
                  Registrarse con Discord
                </button>

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
    )
}
