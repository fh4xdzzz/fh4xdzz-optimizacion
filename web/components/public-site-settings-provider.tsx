'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_DISCORD_INVITE_URL, resolveDiscordInviteUrl } from '@/lib/site-config'

type PublicSiteSettings = {
  discordInviteUrl: string
}

const PublicSiteSettingsContext = createContext<PublicSiteSettings>({
  discordInviteUrl: DEFAULT_DISCORD_INVITE_URL,
})

export function PublicSiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings>({
    discordInviteUrl: DEFAULT_DISCORD_INVITE_URL,
  })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/public/site-settings', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return
        const body = await response.json()
        setSettings({
          discordInviteUrl: resolveDiscordInviteUrl(body.discordInviteUrl),
        })
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  return (
    <PublicSiteSettingsContext.Provider value={settings}>
      {children}
    </PublicSiteSettingsContext.Provider>
  )
}

export function usePublicSiteSettings() {
  return useContext(PublicSiteSettingsContext)
}
