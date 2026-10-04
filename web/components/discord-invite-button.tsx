'use client'

import { Button } from '@/components/ui/button'
import { usePublicSiteSettings } from '@/components/public-site-settings-provider'

export function DiscordInviteButton({ className }: { className?: string }) {
  const { discordInviteUrl } = usePublicSiteSettings()

  return (
    <Button
      variant="outline"
      className={className}
      href={discordInviteUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Unirse a Discord
    </Button>
  )
}
