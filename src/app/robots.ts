import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register', '/privacy', '/terms'],
        disallow: ['/dashboard', '/patients', '/settings', '/repertory', '/api'],
      },
    ],
    sitemap: 'https://simillia.ru/sitemap.xml',
  }
}
