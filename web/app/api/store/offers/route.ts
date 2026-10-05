import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ packages: [] })
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase
    .from('service_packages')
    .select('id, name, slug, description, discount_percent, service_package_items(services(id, name, slug, price, billing_type))')
    .eq('is_active', true)
    .order('sort_order')
  if (error) return NextResponse.json({ packages: [] })
  return NextResponse.json({ packages: data || [] }, { headers: { 'Cache-Control': 'public, s-maxage=60' } })
}
