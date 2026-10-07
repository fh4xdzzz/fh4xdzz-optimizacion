'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function LoginForm() {
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const errorCode = searchParams.get('error')

  // Mapear códigos de error a mensajes
  const getErrorMessage = (code: string | null): string => {
    switch (code) {
      case 'no_code':
        return 'No se recibió el código de autorización de Discord'
      case 'invalid_state':
        return 'La solicitud de acceso expiró o no es válida. Inténtalo de nuevo.'
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

    const next = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'
    window.location.assign(new URL(`/api/auth/discord/start?next=${encodeURIComponent(next)}`, window.location.origin))
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
          <svg className="mr-2 h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.54 5.34A17.35 17.35 0 0 0 15.22 4l-.53 1.08a15.8 15.8 0 0 0-5.35 0L8.8 4a17.28 17.28 0 0 0-4.33 1.35C1.73 9.38.98 13.3 1.35 17.16a17.5 17.5 0 0 0 5.3 2.68l1.3-1.78a10.7 10.7 0 0 1-2.04-.98l.5-.39a12.42 12.42 0 0 0 11.17 0l.5.39c-.65.38-1.33.7-2.04.98l1.3 1.78a17.46 17.46 0 0 0 5.3-2.68c.44-4.47-.75-8.35-3.1-11.82ZM8.52 14.82c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Zm6.96 0c-1.03 0-1.87-.95-1.87-2.12s.82-2.12 1.87-2.12 1.89.96 1.87 2.12c0 1.17-.82 2.12-1.87 2.12Z" />
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
        <div className="mx-auto w-full max-w-md">
          <Suspense fallback={<div className="text-center">Cargando...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  )
}
