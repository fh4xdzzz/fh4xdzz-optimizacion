'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth-hybrid'

function LoginForm() {
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

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
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/50 text-blue-500 px-4 py-2 rounded-lg text-sm mb-4">
          ℹ️ Al iniciar sesión con Discord, tu cuenta se creará automáticamente si no existe.
        </div>

        <button
          onClick={handleDiscordLogin}
          className="w-full inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-12 px-6 bg-[#5865F2] text-white hover:bg-[#4752C4] pointer-events-auto cursor-pointer"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.641 1.25a18.27 18.27 0 0 0-2.007.34c-.41.686-.844 1.348-1.319 1.997a13.316 13.316 0 0 0-1.767.085 19.004 19.004 0 0 0-1.596.34c-.004.003-.007.004-.011.005a.074.074 0 0 0-.037.069c-.388.755-.764 1.521-1.126 2.296a.074.074 0 0 0-.014.08c.47.816.984 1.515 1.53 2.097a.074.074 0 0 0 .041.02c1.608.763 3.356.775 5.064.02a.074.074 0 0 0 .042-.02c.546-.582 1.06-1.281 1.53-2.097a.074.074 0 0 0-.014-.08c-.362-.775-.738-1.541-1.126-2.296a.074.074 0 0 0-.037-.069c-.004-.001-.007-.002-.011-.005a18.999 18.999 0 0 0-1.596-.34c-.475-.649-.909-1.311-1.319-1.997a.074.074 0 0 0-.079-.037c-.363.246-.748.544-1.125.857-.463.346-.865.693-1.086.864a.074.074 0 0 0-.069.009c-.59.934-1.076 1.974-1.405 3.082a.074.074 0 0 0-.03.081c.43.699.884 1.371 1.355 2.014a.074.074 0 0 0 .054.028c1.319.73 2.812.748 4.168.036a.074.074 0 0 0 .054-.028c.471-.643.925-1.315 1.355-2.014a.074.074 0 0 0-.03-.081c-.329-1.108-.815-2.148-1.405-3.082a.074.074 0 0 0-.069-.009c-.221-.171-.623-.518-1.086-.864-.377-.313-.762-.611-1.125-.857a.074.074 0 0 0-.079-.037c-2.03.637-4.246.945-6.38 1.026a.074.074 0 0 0-.083.044c-.654.98-1.096 2.106-1.366 3.337a.074.074 0 0 0 .07.075c1.487.295 3.02.286 4.5-.033a.074.074 0 0 0 .07-.075c-.27-1.231-.712-2.357-1.366-3.337a.074.074 0 0 0-.083-.044c-2.134-.081-4.35-.389-6.38-1.026a.074.074 0 0 0-.079-.037c-.363-.246-.748-.544-1.125-.857z"/>
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
          <LoginForm />
        </div>
      </section>

      <Footer />
    </div>
  )
}
