// Sistema de autenticación con modo explícito
// Modos: 'demo' (localStorage) o 'supabase' (autenticación real)

import { createClient } from './supabase/client'

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

// Obtener modo de autenticación configurado
export function getAuthMode(): 'demo' | 'supabase' {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE?.toLowerCase()
  if (mode === 'demo' || mode === 'supabase') {
    return mode
  }
  // Por defecto, modo demo para desarrollo
  return 'demo'
}

// Verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key'
  )
}

// Verificar si el sistema está en modo demo
export function isDemoMode(): boolean {
  return getAuthMode() === 'demo'
}

// Verificar si el sistema está en modo Supabase
export function isSupabaseMode(): boolean {
  return getAuthMode() === 'supabase'
}

// Sistema localStorage (demo)
const DEMO_USER_KEY = 'demo_user'
const DEMO_SESSION_KEY = 'demo_session'

// Guardar usuario demo en localStorage
export function saveDemoUser(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user))
}

// Obtener usuario demo de localStorage
export function getDemoUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem(DEMO_USER_KEY)
  return userStr ? JSON.parse(userStr) : null
}

// Guardar sesión demo en localStorage
export function saveDemoSession(session: Session): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
}

// Obtener sesión demo de localStorage
export function getDemoSession(): Session | null {
  if (typeof window === 'undefined') return null
  const sessionStr = localStorage.getItem(DEMO_SESSION_KEY)
  return sessionStr ? JSON.parse(sessionStr) : null
}

// Limpiar sesión demo
export function clearDemoSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_USER_KEY)
  localStorage.removeItem(DEMO_SESSION_KEY)
}

// Crear usuario demo (para sistema localStorage)
export function createDemoUser(email: string, full_name: string): User {
  return {
    id: `demo_${Date.now()}`,
    email,
    full_name,
    role: 'client',
    discord_id: undefined,
    discord_username: undefined,
  }
}

// Obtener sesión actual (según modo configurado)
export async function getSession(): Promise<Session | null> {
  if (isSupabaseMode()) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }
    
    const supabase = createClient()
    // Usar getUser() en lugar de getSession() para autenticación segura
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error obteniendo usuario:', error)
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
    // Modo demo - usar localStorage
    return getDemoSession()
  }
}

// Iniciar sesión con Discord OAuth
export function signInWithDiscord() {
  if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
    throw new Error('Discord OAuth no está configurado')
  }

  const scopes = ['identify', 'email']
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 
                      'https://www.thedulcandesign.com/api/auth/discord/callback'
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes.join(' ')}`

  window.location.href = authUrl
}

// Cerrar sesión (según modo configurado)
export async function signOut(): Promise<void> {
  if (isSupabaseMode()) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }
    
    const supabase = createClient()
    await supabase.auth.signOut()
  } else {
    clearDemoSession()
  }
}
