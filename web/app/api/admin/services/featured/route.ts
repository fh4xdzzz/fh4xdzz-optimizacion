import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-hybrid'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el owner puede cambiar servicios destacados' }, { status: 403 })
    }

    const body = await request.json()
    const { serviceId, isFeatured } = body

    if (!serviceId || typeof isFeatured !== 'boolean') {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    // Usar service_role key para bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Updating service featured status (server):', serviceId, isFeatured)

    const { data, error } = await supabase
      .from('services')
      .update({ is_featured: isFeatured })
      .eq('id', serviceId)
      .select()

    if (error) {
      console.error('Error updating service:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }

    console.log('Service updated successfully:', data[0])

    return NextResponse.json({ success: true, service: data[0] })
  } catch (error) {
    console.error('Error in API route:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
