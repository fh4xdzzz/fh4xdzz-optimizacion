import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(['client', 'staff', 'admin']),
})

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = roleSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  if (parsed.data.userId === auth.session.user.id) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
  }

  const { data: target } = await auth.supabase
    .from('users')
    .select('role')
    .eq('id', parsed.data.userId)
    .single()

  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (target.role === 'owner') return NextResponse.json({ error: 'No se puede modificar otro owner' }, { status: 403 })

  const { error } = await auth.supabase
    .from('users')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
