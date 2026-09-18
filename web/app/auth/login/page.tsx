'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const errorCode = searchParams.get('error')

  // Mapear códigos de error a mensajes
  const getErrorMessage = (code: string | null): string => {
    switch (code) {
      case 'no_code':
        return 'No se recibió el código de autorización de Discord'
      case 'token_error':
        return 'Error al intercambiar el código por un token de acceso'
      case 'create_user_error':
        return 'Error al crear el usuario en Supabase. Contacta al soporte.'
      case 'db_error':
        return 'Error al guardar el usuario en la base de datos. Contacta al soporte.'
      case 'magiclink_error':
        return 'Error al generar el enlace de sesión. Inténtalo de nuevo.'
      case 'otp_error':
        return 'Error al verificar la sesión. Inténtalo de nuevo.'
      case 'oauth_error':
        return 'Error general en el proceso de OAuth. Inténtalo de nuevo.'
      default:
        return code ? `Error desconocido: ${code}` : ''
    }
  }

  const errorMessage = getErrorMessage(errorCode)

  const handleDiscordLogin = () => {
    if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
      setError('Discord OAuth no está configurado')
      return
    }

    const scopes = ['identify', 'email']
    const redirectUri = 'https://www.thedulcandesign.com/api/auth/discord/callback'
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes.join(' ')}`

    window.location.href = authUrl
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar Sesión con Discord</CardTitle>
        <CardDescription>
          Usa tu cuenta de Discord para acceder a TheDulcanDesign
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(error || errorMessage) && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm mb-4">
            {error || errorMessage}
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/50 text-blue-500 px-4 py-2 rounded-lg text-sm mb-4">
          ℹ️ Al iniciar sesión con Discord, tu cuenta se creará automáticamente si no existe.
        </div>

        <button
          onClick={handleDiscordLogin}
          className="w-full inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 bg-[#5865F2] text-white pointer-events-auto cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.641 1.25a18.27 18.27 0 0 0-5.106 0c-.197-.386-.432-.874-.641-1.25a.074.074 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027c-2.612 4.762-3.388 9.376-3.525 13.946a.08.08 0 0 0 .031.057c2.078 1.523 4.09 2.417 6.062 3.025a.074.074 0 0 0 .084-.028c.47-.196.89-.434 1.284-.704a.074.074 0 0 0-.076-.122c-.274-.187-.532-.386-.777-.588a.074.074 0 0 1-.053-.089c.033-.05.068-.102.1-.154a.074.074 0 0 1 .076-.104c.162-.12.326-.246.484-.374a.074.074 0 0 0 .08-.011c3.28 1.545 6.843 1.545 10.082 0a.074.074 0 0 0 .08.011c.158.128.322.254.484.374a.074.074 0 0 1 .076.104c.032.052.067.104.1.154a.074.074 0 0 1-.053.089c-.245.202-.503.401-.777.588a.074.074 0 0 0-.076.122c.394.27.814.508 1.284.704a.074.074 0 0 0 .084.028c1.972-.608 3.984-1.502 6.062-3.025a.07.07 0 0 0 .031-.057c-.167-6.088-3.157-11.67-3.525-13.946a.069.069 0 0 0-.032-.027ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z"/>
          </svg>
          Iniciar sesión con Discord
        </button>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Suspense fallback={<div className="text-center">Cargando...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  )
}
