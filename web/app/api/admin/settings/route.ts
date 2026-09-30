import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

const settingsSchema = z.object({
  business_info: z.object({
    name: z.string().min(1).max(100),
    email: z.email(),
    phone: z.string().max(40),
    address: z.string().max(240),
    discord: z.union([z.url(), z.literal('')]),
  }),
  social_links: z.object({
    discord: z.union([z.url(), z.literal('')]),
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

  return NextResponse.json({
    settings: Object.fromEntries((data ?? []).map((row) => [row.setting_key, row.setting_value])),
  })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Configuración inválida' }, { status: 400 })

  const rows = Object.entries(parsed.data).map(([setting_key, setting_value]) => ({
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
