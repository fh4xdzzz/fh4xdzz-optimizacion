// Sistema híbrido de autenticación
// Supabase cuando está configurado, localStorage cuando no

import { createClient } from './supabase/client'

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

// Verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key'
  )
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

// Obtener sesión actual (híbrido)
export async function getSession(): Promise<Session | null> {
  if (isSupabaseConfigured()) {
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
          role: profile?.role || 'client',
        },
        access_token: session.access_token,
      }
    }
    return null
  } else {
    return getDemoSession()
  }
}

// Iniciar sesión (híbrido)
export async function signIn(email: string, password: string): Promise<Session> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    if (!data.user) throw new Error('No user data returned')
    
    // Obtener perfil
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        full_name: profile?.full_name || data.user.user_metadata?.full_name,
        avatar_url: profile?.avatar_url || data.user.user_metadata?.avatar_url,
        discord_id: profile?.discord_id,
        discord_username: profile?.discord_username,
        role: profile?.role || 'client',
      },
      access_token: data.session.access_token,
    }
  } else {
    // Sistema demo - cualquier email/password funciona
    const user = createDemoUser(email, email.split('@')[0])
    const session: Session = {
      user,
      access_token: 'demo_token',
    }
    saveDemoUser(user)
    saveDemoSession(session)
    return session
  }
}

// Registrarse (híbrido)
export async function signUp(email: string, password: string, full_name: string): Promise<Session> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    })
    
    if (error) throw error
    
    if (!data.user) throw new Error('No user data returned')
    
    // Obtener perfil
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        full_name: profile?.full_name || full_name,
        avatar_url: profile?.avatar_url || data.user.user_metadata?.avatar_url,
        discord_id: profile?.discord_id,
        discord_username: profile?.discord_username,
        role: profile?.role || 'client',
      },
      access_token: data.session?.access_token || '',
    }
  } else {
    // Sistema demo
    const user = createDemoUser(email, full_name)
    const session: Session = {
      user,
      access_token: 'demo_token',
    }
    saveDemoUser(user)
    saveDemoSession(session)
    return session
  }
}

// Cerrar sesión (híbrido)
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    await supabase.auth.signOut()
  } else {
    clearDemoSession()
  }
}

// Recuperar contraseña (solo Supabase)
export async function resetPassword(email: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    
    if (error) throw error
  } else {
    throw new Error('La recuperación de contraseña requiere Supabase configurado')
  }
}

// Actualizar contraseña (solo Supabase)
export async function updatePassword(newPassword: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    
    if (error) throw error
  } else {
    throw new Error('La actualización de contraseña requiere Supabase configurado')
  }
}