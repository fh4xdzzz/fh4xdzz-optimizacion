import { createClient } from './supabase/client'

export async function getSession() {
  const supabase = createClient()
  // Usar getUser() para autenticación segura
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error obteniendo usuario:', error)
    return null
  }

  if (!user) {
    return null
  }

  // Obtener la sesión actual para el access_token
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return null
  }
  return session
}
