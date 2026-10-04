import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isDemoMode, isSupabaseMode } from './lib/auth-hybrid'

const protectedPaths = ['/dashboard', '/perfil', '/pedidos', '/admin', '/owner']

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach(cookie => target.cookies.set(cookie))
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = source.headers.get(header)
    if (value) target.headers.set(header, value)
  }
  return target
}

export async function proxy(request: NextRequest) {
  if (isDemoMode() || !isSupabaseMode()) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsError ? null : claimsData?.claims?.sub
  const pathname = request.nextUrl.pathname
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !userId) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return copySessionCookies(supabaseResponse, NextResponse.redirect(loginUrl))
  }

  if (userId && (pathname.startsWith('/admin') || pathname.startsWith('/owner'))) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', userId).maybeSingle()
    const allowed = pathname.startsWith('/owner')
      ? profile?.role === 'owner'
      : ['staff', 'admin', 'owner'].includes(profile?.role || '')

    if (!allowed) {
      return copySessionCookies(supabaseResponse, NextResponse.redirect(new URL('/dashboard', request.url)))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
