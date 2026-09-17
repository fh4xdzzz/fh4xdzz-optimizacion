'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession, signOut, isDemoMode, isSupabaseMode } from '@/lib/auth-hybrid'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const [session, setSession] = useState<{ user: { id?: string; full_name?: string; email: string; discord_id?: string | null; discord_username?: string | null; role?: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    discord_id: '',
    discord_username: '',
  })
  const router = useRouter()
  const isDemo = isDemoMode()
  const isSupabase = isSupabaseMode()

  // Verificar mensajes de éxito/error de URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const success = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (success === 'discord_linked') {
      setSuccess('¡Cuenta de Discord vinculada exitosamente!')
      // Limpiar URL
      window.history.replaceState({}, '', '/perfil')
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        no_code: 'Error de autenticación: Código no proporcionado',
        token_error: 'Error al obtener token de Discord',
        update_error: 'Error al actualizar tu perfil',
        oauth_error: 'Error en el proceso de OAuth',
      }
      setError(errorMessages[errorParam] || 'Error al vincular cuenta de Discord')
      window.history.replaceState({}, '', '/perfil')
    }
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      const session = await getSession()
      if (!session) {
        router.push('/auth/login?redirect=/perfil')
        return
      }

      setSession(session)
      setFormData({
        full_name: session.user?.full_name || '',
        discord_id: session.user?.discord_id || '',
        discord_username: session.user?.discord_username || '',
      })
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // En modo demo, no permitir actualización
      if (isDemo) {
        setError('La actualización de perfil solo está disponible en modo Supabase')
      } else {
        // Implementar actualización en Supabase cuando esté conectado
        setError('Función de actualización pendiente de implementación')
      }
    } catch {
      setError('Error al actualizar perfil. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const handleLinkDiscord = () => {
    if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
      setError('Discord OAuth no está configurado')
      return
    }

    const scopes = ['identify', 'email']
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback'
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes.join(' ')}`
    
    window.location.href = authUrl
  }

  const handleUnlinkDiscord = async () => {
    if (!session?.user?.id) {
      setError('No hay sesión activa')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({
          discord_id: null,
          discord_username: null,
        })
        .eq('id', session.user.id)

      if (error) throw error

      setSuccess('Cuenta de Discord desvinculada')
      setSession({
        ...session,
        user: {
          ...session.user,
          discord_id: null,
          discord_username: null,
        }
      })
    } catch (err) {
      setError('Error al desvincular cuenta de Discord')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto text-center">
            <p>Cargando perfil...</p>
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
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Mi Perfil</h1>

          {isDemo && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 px-4 py-2 rounded-lg text-sm mb-8">
              ⚠️ Modo demo activo - Usando localStorage (no es autenticación real)
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Información Personal</CardTitle>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ID de Discord (opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.discord_id}
                        onChange={(e) => setFormData({ ...formData, discord_id: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Usuario de Discord (opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.discord_username}
                        onChange={(e) => setFormData({ ...formData, discord_username: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="usuario#1234"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted mb-1">Nombre</div>
                      <div className="font-medium">{session?.user?.full_name || 'No especificado'}</div>
                    </div>

                    <div>
                      <div className="text-sm text-muted mb-1">Email</div>
                      <div className="font-medium">{session?.user?.email}</div>
                    </div>

                    <div>
                      <div className="text-sm text-muted mb-1">Discord ID</div>
                      <div className="font-medium">{session?.user?.discord_id || 'No vinculado'}</div>
                    </div>

                    <div>
                      <div className="text-sm text-muted mb-1">Usuario Discord</div>
                      <div className="font-medium">{session?.user?.discord_username || 'No vinculado'}</div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      {session?.user?.discord_id ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleUnlinkDiscord}
                          disabled={loading}
                        >
                          {loading ? 'Desvinculando...' : 'Desvincular Discord'}
                        </Button>
                      ) : (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={handleLinkDiscord}
                        >
                          Vincular Discord
                        </Button>
                      )}
                    </div>

                    <div>
                      <div className="text-sm text-muted mb-1">Rol</div>
                      <div className="font-medium capitalize">{session?.user?.role || 'client'}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Card */}
            <Card>
              <CardHeader>
                <CardTitle>Cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted mb-1">Rol</div>
                    <div className="font-medium capitalize">{session?.user?.role || 'client'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-muted mb-1">Tipo de Autenticación</div>
                    <div className="font-medium">{isSupabase ? 'Supabase (Real)' : 'LocalStorage (Demo)'}</div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                      Cerrar Sesión
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
