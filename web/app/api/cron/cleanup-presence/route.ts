import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CRON para marcar offline a usuarios que no han enviado heartbeat
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Solo requerir autenticación si CRON_SECRET está configurado
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('CRON authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Marcar offline a usuarios que no han enviado heartbeat en los últimos 2 minutos
    const { error } = await supabase
      .from('users')
      .update({ online: false })
      .eq('online', true)
      .lt('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString())

    if (error) {
      console.error('Error cleaning up presence:', error)
      return NextResponse.json({ error: 'Failed to cleanup presence', details: error.message }, { status: 500 })
    }

    console.log('Presence cleanup completed successfully')
    return NextResponse.json({ success: true, message: 'Presence cleanup completed' })
  } catch (error) {
    console.error('Error in CRON cleanup presence:', error)
    return NextResponse.json({ error: 'Internal server error', details: (error as Error).message }, { status: 500 })
  }
}
