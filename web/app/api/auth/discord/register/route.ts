import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

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
    const supabase = createClient()
    
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
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
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

    // Crear sesión en Supabase Auth
    // Nota: Esto requeriría configuración adicional de Supabase Auth
    // Por ahora, redirigimos al login para que el usuario complete el proceso
    
    return NextResponse.redirect(new URL('/auth/login?discord_registered=true', request.url))
  } catch (error) {
    console.error('Discord register error:', error)
    return NextResponse.redirect(new URL('/auth/register?error=oauth_error', request.url))
  }
}