import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/owner',
        '/dashboard',
        '/perfil',
        '/pedidos',
        '/carrito',
        '/pago',
        '/auth',
        '/api',
      ],
    },
    sitemap: 'https://www.thedulcandesign.com/sitemap.xml',
    host: 'https://www.thedulcandesign.com',
  }
}
