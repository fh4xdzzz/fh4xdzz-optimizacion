import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseMode, isDemoMode } from './lib/auth-hybrid'

export async function middleware(request: NextRequest) {
  // En modo demo, no aplicar middleware de autenticación
  // El cliente maneja la autenticación demo
  if (isDemoMode()) {
    return NextResponse.next()
  }

  // En modo Supabase, validar la sesión
  if (isSupabaseMode()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            request.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // Rutas protegidas que requieren autenticación
    const protectedPaths = ['/dashboard', '/perfil', '/pedidos']
    const isProtectedPath = protectedPaths.some(path =>
      request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath && !session) {
      // Redirigir a login con la URL original como redirect
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Verificar rol de admin o owner para rutas de administración
    if (request.nextUrl.pathname.startsWith('/admin') && session) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
        // Redirigir a dashboard si no es admin ni owner
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
