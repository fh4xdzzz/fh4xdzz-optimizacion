import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

const updateSchema = z.object({
  creatorId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email().max(255).or(z.literal('')),
  commissionRate: z.coerce.number().min(0).max(50),
  status: z.enum(['active', 'paused']),
})

const payoutSchema = z.object({
  action: z.literal('mark_paid'),
  creatorId: z.string().uuid(),
  payoutCutoff: z.string().datetime(),
})

export async function GET() {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const generatedAt = new Date().toISOString()

  const [creatorsResult, visitsResult, conversionsResult] = await Promise.all([
    auth.supabase.from('affiliate_creators')
      .select('id, coupon_id, display_name, slug, contact_email, commission_rate, status, notes, created_at, discount_coupons(code, discount_value, is_active, max_redemptions, redemption_count, expires_at)')
      .order('created_at', { ascending: false }),
    auth.supabase.from('affiliate_visits').select('id, creator_id, created_at'),
    auth.supabase.from('affiliate_conversions')
      .select('id, creator_id, gross_revenue, discount_amount, commission_amount, commission_rate, status, paid_at, created_at')
      .order('created_at', { ascending: false }),
  ])
  const failed = [creatorsResult, visitsResult, conversionsResult].find(result => result.error)
  if (failed?.error) {
    console.error('[owner/affiliates] Error cargando afiliados', failed.error)
    return NextResponse.json({ error: 'No se pudo cargar el programa de afiliados.' }, { status: 500 })
  }

  const visits = visitsResult.data || []
  const conversions = conversionsResult.data || []
  const creators = (creatorsResult.data || []).map(creator => {
    const coupon = Array.isArray(creator.discount_coupons) ? creator.discount_coupons[0] : creator.discount_coupons
    const creatorConversions = conversions.filter(item => item.creator_id === creator.id)
    const revenue = creatorConversions.filter(item => item.status !== 'cancelled').reduce((sum, item) => sum + Number(item.gross_revenue), 0)
    const pendingCommission = creatorConversions.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.commission_amount), 0)
    const paidCommission = creatorConversions.filter(item => item.status === 'paid').reduce((sum, item) => sum + Number(item.commission_amount), 0)
    return {
      ...creator,
      coupon,
      visits: visits.filter(item => item.creator_id === creator.id).length,
      sales: creatorConversions.filter(item => item.status !== 'cancelled').length,
      revenue,
      pendingCommission,
      paidCommission,
      conversions: creatorConversions.slice(0, 8),
    }
  })

  return NextResponse.json({
    generatedAt,
    summary: {
      creators: creators.length,
      active: creators.filter(creator => creator.status === 'active').length,
      visits: visits.length,
      sales: conversions.filter(item => item.status !== 'cancelled').length,
      revenue: conversions.filter(item => item.status !== 'cancelled').reduce((sum, item) => sum + Number(item.gross_revenue), 0),
      pendingCommission: conversions.filter(item => item.status === 'pending').reduce((sum, item) => sum + Number(item.commission_amount), 0),
    },
    creators,
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Los datos del afiliado no son válidos.' }, { status: 400 })

  const { error } = await auth.supabase.rpc('update_affiliate_creator', {
    p_creator_id: parsed.data.creatorId,
    p_display_name: parsed.data.displayName,
    p_contact_email: parsed.data.contactEmail,
    p_commission_rate: parsed.data.commissionRate,
    p_status: parsed.data.status,
  })
  if (error) return NextResponse.json({ error: 'No se pudo actualizar el afiliado.' }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const parsed = payoutSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })

  const paidAt = new Date().toISOString()
  const { data, error } = await auth.supabase.from('affiliate_conversions')
    .update({ status: 'paid', paid_at: paidAt, updated_at: paidAt })
    .eq('creator_id', parsed.data.creatorId).eq('status', 'pending')
    .lte('created_at', parsed.data.payoutCutoff).select('id')
  if (error) return NextResponse.json({ error: 'No se pudieron marcar las comisiones como pagadas.' }, { status: 400 })
  return NextResponse.json({ ok: true, updated: data?.length || 0 })
}
