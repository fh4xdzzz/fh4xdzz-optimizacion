import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/optimizer-server'

export async function GET() {
  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 })
  const { data } = await supabase.from('optimizer_releases').select('version, file_size, sha256, release_notes, created_at').eq('is_active', true).maybeSingle()
  if (!data) return NextResponse.json({ release: null })
  return NextResponse.json({ release: data }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } })
}
