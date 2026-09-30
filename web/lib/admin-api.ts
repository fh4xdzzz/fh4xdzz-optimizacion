import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '@/lib/auth-server'

export async function requireAdminRole(ownerOnly = false) {
  const session = await getServerSession()

  if (!session) {
    return { error: 'No autorizado', status: 401 } as const
  }

  const role = session.user.role
  const allowed = ownerOnly ? role === 'owner' : role === 'owner' || role === 'admin'

  if (!allowed) {
    return { error: ownerOnly ? 'Solo el owner puede realizar esta acción' : 'Permisos insuficientes', status: 403 } as const
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return { error: 'Supabase no está configurado en el servidor', status: 500 } as const
  }

  return {
    session,
    supabase: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  } as const
}
