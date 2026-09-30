import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

const updateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(120),
  price: z.number().min(0).max(100000),
  is_active: z.boolean(),
})

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos del servicio inválidos' }, { status: 400 })

  const { id, ...changes } = parsed.data
  const { data, error } = await auth.supabase
    .from('services')
    .update(changes)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, service: data })
}
