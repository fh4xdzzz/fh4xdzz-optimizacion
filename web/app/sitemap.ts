import type { MetadataRoute } from 'next'

const siteUrl = 'https://www.thedulcandesign.com'

const serviceSlugs = [
  'optimizacion-obs',
  'configuracion-streaming',
  'creacion-servidor-discord',
  'bot-de-discord',
  'optimizacion-pc-windows',
  'configuracion-gaming',
  'diseno-overlays-alertas',
  'soporte-tecnico',
  'pagina-web-profesional',
  'servicios-personalizados',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/servicios`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/resultados`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/contacto`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  return [
    ...publicPages,
    ...serviceSlugs.map((slug) => ({
      url: `${siteUrl}/servicios/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
