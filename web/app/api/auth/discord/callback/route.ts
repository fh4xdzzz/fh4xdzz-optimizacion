import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
    }

    // Intercambiar el código por un token de acceso de Discord
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://www.thedulcandesign.com/api/auth/discord/callback',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Discord token error:', tokenData)
      return NextResponse.redirect(new URL('/auth/login?error=token_error', request.url))
    }

    // Obtener información del usuario de Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const discordUser = await userResponse.json()
    console.log('Discord user info:', discordUser)

    // Buscar usuario por Discord ID
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single()

    if (!existingUser) {
      // Usuario no encontrado con Discord ID, redirigir a registro
      return NextResponse.redirect(new URL('/auth/register?error=discord_not_found', request.url))
    }

    // Usuario encontrado, crear sesión
    // Generar una contraseña temporal (el usuario ya debería tener una del registro)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + '!1A'

    // Actualizar la contraseña del usuario para asegurar que tenga una válida
    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: tempPassword,
    })

    // Crear respuesta de redirección
    const response = NextResponse.redirect(new URL('/perfil', request.url))

    // Usar createServerClient para establecer la sesión
    const supabaseSSR = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({ name, value, ...options })
            })
          },
        },
      }
    )

    // Iniciar sesión con la contraseña temporal
    const { data: sessionData, error: sessionError } = await supabaseSSR.auth.signInWithPassword({
      email: existingUser.email,
      password: tempPassword,
    })

    if (sessionError || !sessionData.session) {
      console.error('Error creating session:', sessionError)
      return NextResponse.redirect(new URL('/auth/login?error=session_error', request.url))
    }

    console.log('Session created successfully via Discord login')
    return response
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=oauth_error', request.url))
  }
}