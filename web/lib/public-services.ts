import 'server-only'

import { createClient } from '@supabase/supabase-js'

export const publicServiceFields = 'id, name, slug, description, details, category, benefits, includes, price, billing_type, recurring_price, billing_interval, duration_estimate, image_url, icon, is_active, is_featured, sort_order'

export type PublicService = {
  id: string
  name: string
  slug: string
  description: string
  details: string | null
  category: string
  benefits: string[] | null
  includes: string[] | null
  price: number
  billing_type: 'one_time' | 'subscription'
  recurring_price: number | null
  billing_interval: 'month' | null
  duration_estimate: string | null
  image_url: string | null
  icon: string | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
}

function createPublicCatalogClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('La configuración del catálogo no está disponible.')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function getPublicServices(): Promise<PublicService[]> {
  const { data, error } = await createPublicCatalogClient()
    .from('services')
    .select(publicServiceFields)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as PublicService[]
}

export async function getPublicServiceBySlug(slug: string): Promise<PublicService | null> {
  const { data, error } = await createPublicCatalogClient()
    .from('services')
    .select(publicServiceFields)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as PublicService | null
}
