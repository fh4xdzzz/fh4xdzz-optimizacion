'use client'

import { useState } from 'react'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resetPassword, isDemoMode } from '@/lib/auth-hybrid'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const isDemo = isDemoMode()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await resetPassword(email)
      setSuccess(true)
    } catch {
      // No revelar si el email existe por seguridad
      setError('Si el email está registrado, recibirás instrucciones en tu bandeja de entrada.')
    } finally {
      setLoading(false)
    }
  }

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
                <CardDescription>
                  Esta función solo está disponible en modo Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-2 rounded-lg text-sm mb-4">
                  ⚠️ Modo demo activo - La recuperación de contraseña requiere Supabase
                </div>
                <div className="text-center">
                  <Button variant="outline" className="w-full" href="/auth/login">
                    Volver al Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md">
            <Card className="border-green-500/50">
              <CardHeader>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">Email Enviado</CardTitle>
                  <CardDescription className="mt-2">
                    Hemos enviado un email con instrucciones para restablecer tu contraseña. Por favor verifica tu bandeja de entrada y haz clic en el enlace. También revisa tu carpeta de spam.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Button variant="outline" className="w-full" href="/auth/login">
                    Volver al Login
                  </Button>
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

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
              <CardDescription>
                Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="tu@email.com"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar Instrucciones'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link href="/auth/login" className="text-muted hover:text-foreground">
                  ← Volver al login
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
