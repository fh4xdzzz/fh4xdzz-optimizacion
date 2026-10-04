export const DEFAULT_DISCORD_INVITE_URL = 'https://discord.gg/XFJ5qTBjUa'

const LEGACY_DISCORD_INVITE_URLS = new Set([
  'https://discord.gg/DXkEXrYRvM',
])

export function isDiscordInviteUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    return (
      url.protocol === 'https:' &&
      ((hostname === 'discord.gg' && url.pathname.length > 1) ||
        (hostname === 'discord.com' && url.pathname.startsWith('/invite/') && url.pathname.length > 8))
    )
  } catch {
    return false
  }
}

export function resolveDiscordInviteUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== 'string') continue

    const candidate = value.trim().replace(/\/$/, '')
    if (LEGACY_DISCORD_INVITE_URLS.has(candidate)) continue
    if (isDiscordInviteUrl(candidate)) return candidate
  }

  return DEFAULT_DISCORD_INVITE_URL
}
