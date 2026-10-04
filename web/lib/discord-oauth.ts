export const DISCORD_OAUTH_STATE_COOKIE = 'discord_oauth_state'
export const DISCORD_OAUTH_NEXT_COOKIE = 'discord_oauth_next'

export function getDiscordRedirectUri(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI
  if (configured) return configured

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const origin = siteUrl ? new URL(siteUrl).origin : new URL(requestUrl).origin
  return `${origin}/api/auth/discord/callback`
}

export function getSafeNextPath(value: string | null | undefined) {
  if (!value || !/^\/(?!\/)[^\\\r\n]*$/.test(value)) return '/dashboard'
  return value
}
