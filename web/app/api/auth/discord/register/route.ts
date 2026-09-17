import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(new URL('/auth/register?error=no_code', request.url))
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
        redirect_uri: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Discord token error:', tokenData)
      return NextResponse.redirect(new URL('/auth/register?error=token_error', request.url))
    }

    // Obtener información del usuario de Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const discordUser = await userResponse.json()

    // Crear o actualizar usuario en Supabase
    // Verificar si el usuario ya existe por Discord ID
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single()

    if (existingUser) {
      // Usuario ya existe, actualizar datos y redirigir a login
      const { error } = await supabase
        .from('users')
        .update({
          discord_username: `${discordUser.username}#${discordUser.discriminator}`,
          full_name: existingUser.full_name || discordUser.username,
        })
        .eq('id', existingUser.id)

      if (error) {
        console.error('Error updating user:', error)
        return NextResponse.redirect(new URL('/auth/register?error=update_error', request.url))
      }

      return NextResponse.redirect(new URL('/auth/login?discord_linked=true', request.url))
    }

    // Verificar si existe usuario con el mismo email de Discord
    if (discordUser.email) {
      const { data: emailUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', discordUser.email)
        .single()

      if (emailUser) {
        // Usuario existe con ese email, vincular Discord
        const { error } = await supabase
          .from('users')
          .update({
            discord_id: discordUser.id,
            discord_username: `${discordUser.username}#${discordUser.discriminator}`,
          })
          .eq('id', emailUser.id)

        if (error) {
          console.error('Error linking Discord:', error)
          return NextResponse.redirect(new URL('/auth/register?error=link_error', request.url))
        }

        return NextResponse.redirect(new URL('/auth/login?discord_linked=true', request.url))
      }
    }

    // Crear nuevo usuario con Discord
    // Primero crear en Supabase Auth
    // Generar una contraseña segura que cumpla con los requisitos de Supabase (mínimo 6 caracteres)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + '!1A'
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: discordUser.email || `${discordUser.username}@discord.temp`,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: discordUser.username,
        discord_id: discordUser.id,
        discord_username: `${discordUser.username}#${discordUser.discriminator}`,
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.redirect(new URL('/auth/register?error=create_error', request.url))
    }

    // Luego crear en la tabla public.users
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: discordUser.email || `${discordUser.username}@discord.temp`,
        full_name: discordUser.username,
        discord_id: discordUser.id,
        discord_username: `${discordUser.username}#${discordUser.discriminator}`,
        role: 'client',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.redirect(new URL('/auth/register?error=create_error', request.url))
    }

    // Esperar un momento para asegurar que el usuario esté completamente creado en Supabase
    await new Promise(resolve => setTimeout(resolve, 500))

    // Crear sesión usando signInWithPassword con la contraseña temporal
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: discordUser.email || `${discordUser.username}@discord.temp`,
      password: tempPassword,
    })

    if (sessionError || !sessionData.session) {
      console.error('Error creating session:', sessionError)
      // Si falla la sesión, redirigir al login con mensaje
      return NextResponse.redirect(new URL('/auth/login?discord_registered=true', request.url))
    }

    // Crear respuesta de redirección
    const response = NextResponse.redirect(new URL('/perfil', request.url))

    // Usar createServerClient con el patrón setAll para establecer las cookies
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

    // Establecer la sesión usando los tokens
    await supabaseSSR.auth.setSession({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    })

    return response
  } catch (error) {
    console.error('Discord register error:', error)
    return NextResponse.redirect(new URL('/auth/register?error=oauth_error', request.url))
  }
}