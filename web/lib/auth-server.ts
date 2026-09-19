// Servicios de autenticación del lado del servidor
// Para uso en Server Components y API Routes

import { createClient } from './supabase/server'
import { isSupabaseMode, isDemoMode } from './auth-hybrid'

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  discord_id?: string
  discord_username?: string
  role?: 'client' | 'admin' | 'staff' | 'owner'
}

export interface Session {
  user: User
  access_token: string
}

// Obtener sesión del lado del servidor
export async function getServerSession(): Promise<Session | null> {
  if (isSupabaseMode()) {
    const supabase = await createClient()
    // Usar getUser() para autenticación segura
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('Error obteniendo usuario en servidor:', error)
      return null
    }

    if (user) {
      // Obtener perfil adicional
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      // Obtener la sesión actual para el access_token
      const { data: { session } } = await supabase.auth.getSession()

      return {
        user: {
          id: user.id,
          email: user.email!,
          full_name: profile?.full_name || user.user_metadata?.full_name,
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
          discord_id: profile?.discord_id,
          discord_username: profile?.discord_username,
          role: profile?.role || 'client',
        },
        access_token: session?.access_token || '',
      }
    }
    return null
  } else {
    // En modo demo, no hay sesión del lado del servidor
    // El cliente maneja la autenticación demo
    return null
  }
}

// Verificar si el usuario actual es admin (lado del servidor)
export async function isAdmin(): Promise<boolean> {
  if (isDemoMode()) {
    return false // En modo demo, no hay roles reales
  }
  
  const session = await getServerSession()
  if (!session) return false
  
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  return data?.role === 'admin'
}

// Verificar si el usuario actual es staff o admin (lado del servidor)
export async function isStaffOrAdmin(): Promise<boolean> {
  if (isDemoMode()) {
    return false // En modo demo, no hay roles reales
  }

  const session = await getServerSession()
  if (!session) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  return data?.role === 'staff' || data?.role === 'admin' || data?.role === 'owner'
}

// Middleware para verificar autenticación en Server Components
export async function requireAuth(): Promise<Session> {
  const session = await getServerSession()
  
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  
  return session
}

// Middleware para verificar rol de admin en Server Components
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth()
  
  if (!await isAdmin()) {
    throw new Error('FORBIDDEN')
  }
  
  return session
}

// Middleware para verificar rol de staff o admin en Server Components
export async function requireStaffOrAdmin(): Promise<Session> {
  const session = await requireAuth()
  
  if (!await isStaffOrAdmin()) {
    throw new Error('FORBIDDEN')
  }
  
  return session
}
