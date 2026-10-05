export const DISCORD_OAUTH_STATE_COOKIE = 'discord_oauth_state'
export const DISCORD_OAUTH_NEXT_COOKIE = 'discord_oauth_next'

export function getDiscordRedirectUri(requestUrl: string) {
  const requestOrigin = new URL(requestUrl)
  if (requestOrigin.hostname === 'thedulcandesign.com' || requestOrigin.hostname === 'www.thedulcandesign.com') {
    return 'https://www.thedulcandesign.com/api/auth/discord/callback'
  }

  const configured = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI
  if (configured) return configured

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const origin = siteUrl ? new URL(siteUrl).origin : requestOrigin.origin
  return `${origin}/api/auth/discord/callback`
}

export function getSafeNextPath(value: string | null | undefined) {
  if (!value || !/^\/(?!\/)[^\\\r\n]*$/.test(value)) return '/dashboard'
  return value
}
