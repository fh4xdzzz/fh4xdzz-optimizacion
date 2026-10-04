import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DISCORD_INVITE_URL,
  isDiscordInviteUrl,
  resolveDiscordInviteUrl,
} from '@/lib/site-config'

describe('Discord site configuration', () => {
  it('uses the new server invite by default', () => {
    expect(DEFAULT_DISCORD_INVITE_URL).toBe('https://discord.gg/XFJ5qTBjUa')
  })

  it('ignores the retired invite stored in existing settings', () => {
    expect(resolveDiscordInviteUrl('https://discord.gg/DXkEXrYRvM')).toBe(
      DEFAULT_DISCORD_INVITE_URL,
    )
  })

  it('accepts a future Discord invite configured by the owner', () => {
    expect(resolveDiscordInviteUrl('https://discord.gg/NuevoServidor/')).toBe(
      'https://discord.gg/NuevoServidor',
    )
  })

  it('rejects non-Discord and incomplete URLs', () => {
    expect(isDiscordInviteUrl('https://example.com/discord')).toBe(false)
    expect(isDiscordInviteUrl('https://discord.gg')).toBe(false)
  })
})
