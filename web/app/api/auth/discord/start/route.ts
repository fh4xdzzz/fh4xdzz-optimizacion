import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  DISCORD_OAUTH_NEXT_COOKIE,
  DISCORD_OAUTH_STATE_COOKIE,
  getDiscordRedirectUri,
  getSafeNextPath,
} from '@/lib/discord-oauth'

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth_error', request.url))
  }

  const state = randomBytes(32).toString('hex')
  const next = getSafeNextPath(request.nextUrl.searchParams.get('next'))
  const authorizationUrl = new URL('https://discord.com/oauth2/authorize')
  authorizationUrl.searchParams.set('client_id', clientId)
  authorizationUrl.searchParams.set('redirect_uri', getDiscordRedirectUri(request.url))
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('scope', 'identify email')
  authorizationUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authorizationUrl)
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60,
  }
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, state, cookieOptions)
  response.cookies.set(DISCORD_OAUTH_NEXT_COOKIE, next, cookieOptions)
  return response
}
