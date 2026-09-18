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

    let userId: string
    let userEmail: string

    // Generar email temporal si Discord no proporciona email
    // Esto es necesario porque Supabase requiere email para crear usuarios
    // y algunos usuarios de Discord no tienen email público
    const userEmailToUse = discordUser.email || `${discordUser.id}@discord.temp`
    console.log('Email to use for user creation:', userEmailToUse)

    if (!existingUser) {
      // Usuario no encontrado, crear automáticamente usando generateLink con signup
      // Este método evita problemas de SMTP configuración en Supabase
      console.log('Creating new user from Discord OAuth using generateLink signup')
      console.log('Discord user data:', discordUser)
      
      // Generar contraseña temporal
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + '!1A'
      
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
            real_email: discordUser.email || null,
          },
        },
      })

      console.log('Signup link result:', { signupLink, signupError })

      if (signupError && signupError.code === 'email_exists') {
        // El usuario ya existe en Supabase Auth, buscarlo por email
        console.log('User already exists in Supabase Auth, fetching by email:', userEmailToUse)
        
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          console.error('Error listing users:', listError)
          return NextResponse.redirect(new URL('/auth/login?error=list_users_error', request.url))
        }

        const existingAuthUser = users.users.find(u => u.email === userEmailToUse)
        
        if (!existingAuthUser) {
          console.error('User not found in Supabase Auth despite email_exists error')
          return NextResponse.redirect(new URL('/auth/login?error=user_not_found', request.url))
        }

        console.log('Found existing auth user:', existingAuthUser.id)

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
            role: 'client',
          })
          .select()

        console.log('DB insert result for existing auth user:', { dbData, dbError })

        if (dbError) {
          console.error('Error creating user in database:', dbError)
          return NextResponse.redirect(new URL('/auth/login?error=db_error', request.url))
        }

        userId = existingAuthUser.id
        userEmail = userEmailToUse
        console.log('User created successfully in database from existing auth user:', userId)
      } else if (signupError || !signupLink?.user?.id) {
        console.error('Error creating Supabase user via signup link:', signupError)
        console.error('Error details:', JSON.stringify(signupError, null, 2))
        return NextResponse.redirect(new URL('/auth/login?error=create_user_error', request.url))
      }

      userId = signupLink.user?.id || ''
      userEmail = userEmailToUse
      console.log('User created in Supabase Auth via signup:', userId)

      // Crear usuario en la tabla users
      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: userEmailToUse,
          full_name: discordUser.global_name || discordUser.username,
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          discord_avatar: discordUser.avatar,
          role: 'client',
        })
        .select()

      console.log('DB insert result:', { dbData, dbError })

      if (dbError) {
        console.error('Error creating user in database:', dbError)
        console.error('DB Error details:', JSON.stringify(dbError, null, 2))
        return NextResponse.redirect(new URL('/auth/login?error=db_error', request.url))
      }

      console.log('User created successfully in database:', userId)
    } else {
      // Usuario encontrado, usar existente
      userId = existingUser.id
      userEmail = existingUser.email
      console.log('Using existing user:', userId)
    }

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
      return NextResponse.redirect(new URL('/auth/login?error=magiclink_error', request.url))
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
      return NextResponse.redirect(new URL('/auth/login?error=otp_error', request.url))
    }

    console.log('Session created successfully via Discord login')
    return response
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=oauth_error', request.url))
  }
}