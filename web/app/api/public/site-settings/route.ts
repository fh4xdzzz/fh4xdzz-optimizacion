import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_DISCORD_INVITE_URL, resolveDiscordInviteUrl } from '@/lib/site-config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ discordInviteUrl: DEFAULT_DISCORD_INVITE_URL })
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('business_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['business_info', 'social_links'])

  if (error) {
    console.error('No se pudo cargar la configuración pública:', error.message)
    return NextResponse.json({ discordInviteUrl: DEFAULT_DISCORD_INVITE_URL })
  }

  const settings = Object.fromEntries(
    (data ?? []).map((row) => [row.setting_key, row.setting_value]),
  ) as Record<string, { discord?: unknown } | undefined>

  return NextResponse.json({
    discordInviteUrl: resolveDiscordInviteUrl(
      settings.social_links?.discord,
      settings.business_info?.discord,
    ),
  })
}
