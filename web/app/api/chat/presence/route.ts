import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// POST /api/chat/presence - Actualizar estado online del usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { online } = body

    if (typeof online !== 'boolean') {
      return NextResponse.json({ error: 'online must be a boolean' }, { status: 400 })
    }

    const supabase = await createClient()
    const userRole = session.user.role

    // Solo admin/staff/owner pueden actualizar su estado online
    if (!['admin', 'staff', 'owner'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('users')
      .update({ online })
      .eq('id', session.user.id)

    if (error) {
      console.error('Error updating online status:', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, online })
  } catch (error) {
    console.error('Error in POST /api/chat/presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
