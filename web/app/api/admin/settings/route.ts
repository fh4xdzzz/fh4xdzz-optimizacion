import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'
import { isDiscordInviteUrl, resolveDiscordInviteUrl } from '@/lib/site-config'

const discordInviteSchema = z.string().url().refine(isDiscordInviteUrl, {
  message: 'Debe ser un enlace de invitación válido de Discord',
})

const settingsSchema = z.object({
  business_info: z.object({
    name: z.string().min(1).max(100),
    email: z.email(),
    phone: z.string().max(40),
    address: z.string().max(240),
    discord: discordInviteSchema,
  }),
  social_links: z.object({
    discord: discordInviteSchema,
    twitter: z.union([z.url(), z.literal('')]),
    youtube: z.union([z.url(), z.literal('')]),
    instagram: z.union([z.url(), z.literal('')]),
  }),
  contact_form: z.object({ enabled: z.boolean(), recaptcha_enabled: z.boolean() }),
  payment_settings: z.object({
    currency: z.enum(['USD', 'EUR', 'MXN', 'COP']),
    paypal_enabled: z.boolean(),
    stripe_enabled: z.boolean(),
  }),
})

export async function GET() {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('business_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['business_info', 'social_links', 'contact_form', 'payment_settings'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = Object.fromEntries((data ?? []).map((row) => [row.setting_key, row.setting_value])) as Record<string, Record<string, unknown> | undefined>
  const discord = resolveDiscordInviteUrl(
    settings.social_links?.discord,
    settings.business_info?.discord,
  )

  return NextResponse.json({
    settings: {
      ...settings,
      business_info: { ...settings.business_info, discord },
      social_links: { ...settings.social_links, discord },
    },
  })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Configuración inválida' },
      { status: 400 },
    )
  }

  const discord = resolveDiscordInviteUrl(
    parsed.data.social_links.discord,
    parsed.data.business_info.discord,
  )
  const normalizedSettings = {
    ...parsed.data,
    business_info: { ...parsed.data.business_info, discord },
    social_links: { ...parsed.data.social_links, discord },
  }

  const rows = Object.entries(normalizedSettings).map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await auth.supabase
    .from('business_settings')
    .upsert(rows, { onConflict: 'setting_key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
