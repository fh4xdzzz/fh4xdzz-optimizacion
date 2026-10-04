import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TheDulcanDesign',
    short_name: 'TheDulcanDesign',
    description: 'Servicios profesionales de optimización, streaming, gaming y soporte técnico.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08090d',
    theme_color: '#0b0c12',
    icons: [
      {
        src: '/icon-192.png?v=2',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png?v=2',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
