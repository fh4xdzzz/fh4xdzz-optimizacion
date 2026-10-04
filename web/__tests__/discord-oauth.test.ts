import { afterEach, describe, expect, it } from 'vitest'
import { getDiscordRedirectUri, getSafeNextPath } from '../lib/discord-oauth'

describe('Discord OAuth helpers', () => {
  const originalRedirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  afterEach(() => {
    if (originalRedirectUri === undefined) delete process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI
    else process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI = originalRedirectUri

    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
  })

  it('only accepts local return paths', () => {
    expect(getSafeNextPath('/pedidos')).toBe('/pedidos')
    expect(getSafeNextPath('https://example.com')).toBe('/dashboard')
    expect(getSafeNextPath('//example.com')).toBe('/dashboard')
    expect(getSafeNextPath('/\\example.com')).toBe('/dashboard')
  })

  it('builds the callback from the configured site URL', () => {
    delete process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.thedulcandesign.com/path'

    expect(getDiscordRedirectUri('http://localhost:3000/api/auth/discord/start')).toBe(
      'https://www.thedulcandesign.com/api/auth/discord/callback',
    )
  })
})
