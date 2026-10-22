import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { licenseConfigurationReady } from '@/lib/dulcan-license-crypto'
import type { StoreProduct } from '@/lib/store-types'

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

  let products: StoreProduct[] = data || []
  {
    const { data: software, error: softwareError } = await supabase.from('software_products')
      .select('amount_cents, currency, active').eq('id', 'dulcan-optimizer').maybeSingle()
    products = products.flatMap(product => {
      if (product.slug !== 'dulcan-optimizer') return [product]
      if (softwareError || !software || software.currency !== 'usd' || !Number.isInteger(software.amount_cents) || software.amount_cents <= 0) return []
      return [{ ...product, price: software.amount_cents / 100, purchase_flow: 'dulcan_license' as const, purchase_available: software.active && licenseConfigurationReady() }]
    })
    // Software licenses have their own canonical catalog and checkout. Include
    // the product here without creating a duplicate guest-store product.
    if (!products.some(product => product.slug === 'dulcan-optimizer') && !softwareError && software?.active && software.currency === 'usd' && Number.isInteger(software.amount_cents) && software.amount_cents > 0) {
      products.unshift({
        id: -1, slug: 'dulcan-optimizer', name: 'Dulcan Optimizer', category: 'Software',
        description: 'El centro de rendimiento para tu PC. Revisa tu sistema, configura tus perfiles de juego y realiza mantenimiento desde una interfaz diseñada para tener el control.',
        price: software.amount_cents / 100, image_url: '/dulcan-optimizer/caja.png',
        product_type: 'digital', inventory_count: null, is_active: true, is_featured: true, sort_order: -100,
        purchase_flow: 'dulcan_license', purchase_available: licenseConfigurationReady(),
      })
    }
  }
  return NextResponse.json({ products }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
