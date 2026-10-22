import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminRole } from '@/lib/admin-api'

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60),
  price: z.number().positive().max(100000),
  image_url: z.url().max(2000).nullable().optional(),
  product_type: z.enum(['digital', 'physical']),
  inventory_count: z.number().int().min(0).max(1000000).nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
})

const updateSchema = productSchema.extend({ id: z.number().int().positive() })

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100)
}

export async function GET() {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [products, orders] = await Promise.all([
    auth.supabase.from('store_products').select('*').order('created_at', { ascending: false }).limit(500),
    auth.supabase.from('store_orders').select('*').order('created_at', { ascending: false }).limit(500),
  ])
  if (products.error || orders.error) {
    console.error('[owner/products] Error de catálogo', products.error || orders.error)
    return NextResponse.json({ error: 'No se pudo cargar la tienda.' }, { status: 500 })
  }
  return NextResponse.json({ products: products.data || [], orders: orders.data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const parsed = productSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del producto.' }, { status: 400 })

  const baseSlug = slugify(parsed.data.name) || 'producto'
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`
  const { data, error } = await auth.supabase.from('store_products')
    .insert({ ...parsed.data, slug }).select('*').single()
  if (error || !data) {
    console.error('[owner/products] Error creando producto', error)
    return NextResponse.json({ error: 'No se pudo crear el producto.' }, { status: 500 })
  }
  return NextResponse.json({ product: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del producto.' }, { status: 400 })
  const { id, ...changes } = parsed.data
  const { data, error } = await auth.supabase.from('store_products')
    .update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar el producto.' }, { status: 500 })
  return NextResponse.json({ product: data })
}
