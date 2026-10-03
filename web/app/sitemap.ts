import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { SITE_URL } from '@/lib/seo'

// Use the public catalog without session cookies; omit private routes.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.from('services').select('slug').eq('is_active', true).order('slug')
  if (error) throw new Error('No se pudo generar el sitemap de servicios', { cause: error })
  const pages: MetadataRoute.Sitemap = ['/', '/servicios', '/about', '/terms', '/privacy'].map((path) => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }))
  const slugs = [...new Set((data ?? []).map((service) => service.slug).filter((slug): slug is string => typeof slug === 'string' && slug.length > 0))]
  return [...pages, ...slugs.map((slug) => ({ url: `${SITE_URL}/servicios/${encodeURIComponent(slug)}` }))]
}
