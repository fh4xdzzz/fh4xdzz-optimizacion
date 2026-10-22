import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'La tienda no está disponible temporalmente.' }, { status: 503 })

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase
    .from('store_products')
    .select('id, name, slug, description, category, price, image_url, product_type, inventory_count, is_active, is_featured, sort_order')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[public/products] No se pudo cargar el catálogo', error)
    return NextResponse.json({ error: 'No se pudo cargar la tienda.' }, { status: 500 })
  }

  return NextResponse.json({ products: data || [] }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
  })
}
