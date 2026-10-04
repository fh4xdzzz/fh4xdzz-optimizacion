import { randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import {
  DISCORD_OAUTH_NEXT_COOKIE,
  DISCORD_OAUTH_STATE_COOKIE,
  getDiscordRedirectUri,
  getSafeNextPath,
} from '@/lib/discord-oauth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

function statesMatch(received: string | null, stored: string | undefined) {
  if (!received || !stored) return false
  const receivedBuffer = Buffer.from(received)
  const storedBuffer = Buffer.from(stored)
  return receivedBuffer.length === storedBuffer.length && timingSafeEqual(receivedBuffer, storedBuffer)
}

function redirectToLogin(request: NextRequest, error: string) {
  const response = NextResponse.redirect(new URL(`/auth/login?error=${error}`, request.url))
  response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE)
  response.cookies.delete(DISCORD_OAUTH_NEXT_COOKIE)
  return response
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const storedState = request.cookies.get(DISCORD_OAUTH_STATE_COOKIE)?.value
    if (!statesMatch(state, storedState)) {
      return redirectToLogin(request, 'invalid_state')
    }

    if (!code) {
      return redirectToLogin(request, 'no_code')
    }

    const redirectUri = getDiscordRedirectUri(request.url)

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
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || tokenData.error || typeof tokenData.access_token !== 'string') {
      console.error('Discord token exchange failed:', tokenResponse.status)
      return redirectToLogin(request, 'token_error')
    }

    // Obtener información del usuario de Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const discordUser = await userResponse.json()
    if (!userResponse.ok || typeof discordUser.id !== 'string' || typeof discordUser.username !== 'string') {
      console.error('Discord user request failed:', userResponse.status)
      return redirectToLogin(request, 'token_error')
    }
    // Buscar usuario por Discord ID
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single()

    let userId: string = ''
    let userEmail: string = ''

    // Generar email temporal si Discord no proporciona email
    const userEmailToUse = discordUser.email || `${discordUser.id}@discord.temp`
    if (existingUser) {
      // Usuario encontrado, usar existente
      userId = existingUser.id
      userEmail = existingUser.email
      console.log('Using existing user:', userId)
    } else {
      // Usuario no encontrado, crear automáticamente usando generateLink con signup
      // Este método evita problemas de SMTP configuración en Supabase
      console.log('Creating new user from Discord OAuth using generateLink signup')
      // Generar contraseña temporal
      const tempPassword = `${randomBytes(24).toString('base64url')}!1A`
      
      // Usar generateLink con tipo signup para crear usuario y obtener token
      const { data: signupLink, error: signupError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: userEmailToUse,
        password: tempPassword,
        options: {
          data: {
            full_name: discordUser.global_name || discordUser.username,
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_avatar: discordUser.avatar,
            avatar_url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            real_email: discordUser.email || null,
          },
        },
      })

      let userHandled = false

      if (signupError && signupError.code === 'email_exists') {
        // El usuario ya existe en Supabase Auth, buscarlo por email
        console.log('User already exists in Supabase Auth, fetching by email:', userEmailToUse)
        
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          console.error('Error listing users:', listError)
          return redirectToLogin(request, 'list_users_error')
        }

        const existingAuthUser = users.users.find(u => u.email === userEmailToUse)
        
        if (!existingAuthUser) {
          console.error('User not found in Supabase Auth despite email_exists error')
          return redirectToLogin(request, 'user_not_found')
        }

        console.log('Found existing auth user:', existingAuthUser.id)

        // Verificar si el usuario ya existe en la tabla users
        const { data: existingDbUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', existingAuthUser.id)
          .single()

        if (existingDbUser) {
          // Usuario ya existe en tabla users, actualizar datos de Discord
          console.log('User already exists in database, updating Discord data:', existingDbUser.id)
          
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              discord_id: discordUser.id,
              discord_username: discordUser.username,
              discord_avatar: discordUser.avatar,
              avatar_url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            })
            .eq('id', existingDbUser.id)

          if (updateError) {
            console.error('Error updating Discord data:', updateError)
          }

          userId = existingDbUser.id
          userEmail = existingDbUser.email
          console.log('Using existing database user with updated Discord data:', userId)
        } else {
          // Crear registro en tabla users con el ID existente
          const { data: dbData, error: dbError } = await supabaseAdmin
            .from('users')
            .insert({
              id: existingAuthUser.id,
              email: userEmailToUse,
              full_name: discordUser.global_name || discordUser.username,
              discord_id: discordUser.id,
              discord_username: discordUser.username,
              discord_avatar: discordUser.avatar,
              avatar_url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
              role: 'client',
            })
            .select()

          console.log('DB insert result for existing auth user:', { dbData, dbError })

          if (dbError) {
            console.error('Error creating user in database:', dbError)
            return redirectToLogin(request, 'db_error')
          }

          userId = existingAuthUser.id
          userEmail = userEmailToUse
          console.log('User created successfully in database from existing auth user:', userId)
        }

        // Mark user as handled to skip the second insert attempt
        userHandled = true
      } else if (signupError || !signupLink?.user?.id) {
        console.error('Error creating Supabase user via signup link:', signupError)
        console.error('Error details:', JSON.stringify(signupError, null, 2))
        return redirectToLogin(request, 'create_user_error')
      }

      // Only execute this block if user was NOT handled in the email_exists block
      if (!userHandled) {
        userId = signupLink.user?.id || ''
        userEmail = userEmailToUse
        console.log('User created in Supabase Auth via signup:', userId)

        // El trigger de auth puede haber creado ya el perfil. Upsert garantiza
        // que los datos de Discord queden guardados desde el primer acceso.
        const { error: dbError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: userId,
            email: userEmailToUse,
            full_name: discordUser.global_name || discordUser.username,
            discord_id: discordUser.id,
            discord_username: discordUser.username,
            discord_avatar: discordUser.avatar,
            avatar_url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            role: 'client',
          }, { onConflict: 'id' })

        if (dbError) {
          console.error('Error creating or updating user profile:', dbError)
          return redirectToLogin(request, 'db_error')
        }

        console.log('User profile synchronized successfully')
      }
    }

    // Crear respuesta de redirección
    const next = getSafeNextPath(request.cookies.get(DISCORD_OAUTH_NEXT_COOKIE)?.value)
    const response = NextResponse.redirect(new URL(next, request.url))
    response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE)
    response.cookies.delete(DISCORD_OAUTH_NEXT_COOKIE)

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

    // Método mejorado: Generar magic link y verificar OTP para crear sesión
    // Esto es más robusto que signInWithPassword con contraseñas temporales
    console.log('Generating magic link for session creation...')
    const { data: magicLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    })

    if (linkError || !magicLink?.properties?.hashed_token) {
      console.error('Error generating magic link:', linkError)
      console.error('Link error details:', JSON.stringify(linkError, null, 2))
      return redirectToLogin(request, 'magiclink_error')
    }

    console.log('Magic link generated, verifying OTP...')
    // Verificar OTP para crear la sesión
    const { data: sessionData, error: sessionError } = await supabaseSSR.auth.verifyOtp({
      token_hash: magicLink.properties.hashed_token,
      type: 'email',
    })

    if (sessionError || !sessionData.session) {
      console.error('Error verifying OTP:', sessionError)
      console.error('Session error details:', JSON.stringify(sessionError, null, 2))
      return redirectToLogin(request, 'otp_error')
    }

    console.log('Session created successfully via Discord login')
    return response
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return redirectToLogin(request, 'oauth_error')
  }
}

