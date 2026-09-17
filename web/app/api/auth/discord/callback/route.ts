import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { getSession } from '@/lib/auth-hybrid'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.redirect(new URL('/perfil?error=no_code', request.url))
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
      return NextResponse.redirect(new URL('/perfil?error=token_error', request.url))
    }

    // Obtener información del usuario de Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const discordUser = await userResponse.json()

    // Obtener sesión del usuario
    const session = await getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/perfil', request.url))
    }

    // Actualizar usuario en Supabase con datos de Discord
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({
        discord_id: discordUser.id,
        discord_username: `${discordUser.username}#${discordUser.discriminator}`,
      })
      .eq('id', session.user.id)

    if (error) {
      console.error('Error updating user with Discord data:', error)
      return NextResponse.redirect(new URL('/perfil?error=update_error', request.url))
    }

    return NextResponse.redirect(new URL('/perfil?success=discord_linked', request.url))
  } catch (error) {
    console.error('Discord OAuth error:', error)
    return NextResponse.redirect(new URL('/perfil?error=oauth_error', request.url))
  }
}