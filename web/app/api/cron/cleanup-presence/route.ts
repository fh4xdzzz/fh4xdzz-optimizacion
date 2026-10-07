import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// CRON para marcar offline a usuarios que no han enviado heartbeat.
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[cleanup-presence] CRON_SECRET no está configurado')
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
    }

    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[cleanup-presence] Faltan credenciales de Supabase')
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await supabase
      .from('users')
      .update({ online: false })
      .eq('online', true)
      .lt('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString())

    if (error) {
      console.error('[cleanup-presence] Error actualizando presencia', error)
      return NextResponse.json({ error: 'Failed to cleanup presence' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Presence cleanup completed' })
  } catch (error) {
    console.error('[cleanup-presence] Error inesperado', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
