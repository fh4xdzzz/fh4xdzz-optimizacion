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
  role?: 'client' | 'admin' | 'staff'
}

export interface Session {
  user: User
  access_token: string
}

// Obtener sesión del lado del servidor
export async function getServerSession(): Promise<Session | null> {
  if (isSupabaseMode()) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      // Obtener perfil adicional
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      return {
        user: {
          id: session.user.id,
          email: session.user.email!,
          full_name: profile?.full_name || session.user.user_metadata?.full_name,
          avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
          discord_id: profile?.discord_id,
          discord_username: profile?.discord_username,
          role: profile?.role || 'client',
        },
        access_token: session.access_token,
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
  
  const supabase = createClient()
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
  
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()
  
  return data?.role === 'staff' || data?.role === 'admin'
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