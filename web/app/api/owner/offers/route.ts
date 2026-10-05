import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

const couponSchema = z.object({
  action: z.literal('create_coupon'),
  couponKind: z.enum(['automatic', 'creator']),
  code: z.string().trim().min(3).max(30).regex(/^[A-Z0-9-]+$/),
  description: z.string().trim().max(160).optional(),
  discountType: z.literal('percent'),
  discountValue: z.coerce.number().refine((value) => [5, 10, 15, 20, 25, 30, 40, 50].includes(value)),
  minimumAmount: z.coerce.number().min(0).max(100000).default(0),
  maxRedemptions: z.coerce.number().int().positive().max(100000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
}).superRefine((value, context) => {
  const valid = value.couponKind === 'automatic'
    ? /^DULCAN-[A-Z0-9]{4,16}$/.test(value.code)
    : /^[A-Z0-9]{3,20}$/.test(value.code) && !value.code.startsWith('DULCAN')
  if (!valid) context.addIssue({ code: 'custom', path: ['code'], message: 'Formato de cupón inválido.' })
})

const packageSchema = z.object({
  action: z.literal('create_package'),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(240),
  discountPercent: z.coerce.number().positive().max(80),
  serviceIds: z.array(z.string().uuid()).min(2).max(10),
})

const toggleSchema = z.object({
  action: z.literal('toggle'),
  kind: z.enum(['coupon', 'package']),
  id: z.string().uuid(),
  isActive: z.boolean(),
})

const deleteSchema = z.object({ kind: z.enum(['coupon', 'package']), id: z.string().uuid() })

export async function GET() {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const [packages, coupons, services] = await Promise.all([
    auth.supabase.from('service_packages').select('*, service_package_items(service_id, services(id, name, price))').order('sort_order'),
    auth.supabase.from('discount_coupons').select('*').order('created_at', { ascending: false }),
    auth.supabase.from('services').select('id, name, price, billing_type, is_active').eq('is_active', true).eq('billing_type', 'one_time').order('name'),
  ])
  const failed = [packages, coupons, services].find((result) => result.error)
  if (failed?.error) return NextResponse.json({ error: 'No se pudieron cargar las ofertas.' }, { status: 500 })
  return NextResponse.json({ packages: packages.data || [], coupons: coupons.data || [], services: services.data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = await request.json().catch(() => null)
  const coupon = couponSchema.safeParse(body)
  if (coupon.success) {
    if (coupon.data.discountType === 'percent' && coupon.data.discountValue > 80) return NextResponse.json({ error: 'El descuento porcentual máximo es 80%.' }, { status: 400 })
    const { data, error } = await auth.supabase.from('discount_coupons').insert({
      code: coupon.data.code.toUpperCase(), description: coupon.data.description || null,
      discount_type: coupon.data.discountType, discount_value: coupon.data.discountValue,
      minimum_amount: coupon.data.minimumAmount, max_redemptions: coupon.data.maxRedemptions || null,
      expires_at: coupon.data.expiresAt || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'Ese código ya existe.' : 'No se pudo crear el cupón.' }, { status: 400 })
    return NextResponse.json({ coupon: data })
  }
  const offer = packageSchema.safeParse(body)
  if (offer.success) {
    const slug = `${offer.data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`
    const { data: created, error } = await auth.supabase.from('service_packages').insert({ name: offer.data.name, slug, description: offer.data.description, discount_percent: offer.data.discountPercent }).select('id').single()
    if (error || !created) return NextResponse.json({ error: 'No se pudo crear el paquete.' }, { status: 400 })
    const { error: itemError } = await auth.supabase.from('service_package_items').insert(offer.data.serviceIds.map((serviceId) => ({ package_id: created.id, service_id: serviceId })))
    if (itemError) { await auth.supabase.from('service_packages').delete().eq('id', created.id); return NextResponse.json({ error: 'No se pudieron guardar los servicios del paquete.' }, { status: 400 }) }
    return NextResponse.json({ packageId: created.id })
  }
  return NextResponse.json({ error: 'Los datos de la oferta no son válidos.' }, { status: 400 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const parsed = toggleSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const table = parsed.data.kind === 'coupon' ? 'discount_coupons' : 'service_packages'
  const { error } = await auth.supabase.from(table).update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() }).eq('id', parsed.data.id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la oferta.' }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  const table = parsed.data.kind === 'coupon' ? 'discount_coupons' : 'service_packages'
  const { error } = await auth.supabase.from(table).delete().eq('id', parsed.data.id)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar la oferta.' }, { status: 400 })
  return NextResponse.json({ ok: true })
}
