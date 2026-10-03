import type { Metadata } from 'next'

export const SITE_URL = 'https://thedulcandesign.com'

export function socialMetadata(title: string, description: string, path: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  const images = [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'TheDulcanDesign — Optimización y streaming' }]
  return {
    openGraph: { title, description, url: path, siteName: 'TheDulcanDesign', locale: 'es_ES', type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}
