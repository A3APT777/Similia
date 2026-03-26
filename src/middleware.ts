import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

// Публичные маршруты — доступны без авторизации
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/verify',
  '/auth',
  '/intake',
  '/followup',
  '/upload',
  '/survey',
  '/rx',
  '/new',
  '/privacy',
  '/terms',
  '/opengraph-image',
  '/robots.txt',
  '/sitemap.xml',
  '/guide',
  '/api/yookassa-webhook',
  '/api/health',
  '/api/auth',
  '/checkout',
  '/pricing',
  '/demo',
  '/ai-intake',
  '/api/ai-demo',
  // '/api/mdri-staging', // убран из production — требует auth
]

// Публичные маршруты с rate limiting (защита от спама)
const RATE_LIMITED_PATHS = ['/intake/', '/followup/', '/upload/', '/survey/', '/new/', '/api/auth/', '/api/auth/register']

// Простой in-process счётчик (сбрасывается при cold start).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60_000

function checkRateLimit(ip: string, path: string): boolean {
  const key = `${ip}:${path.split('/').slice(0, 3).join('/')}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Проверяем, является ли путь публичным
  const isPublic = pathname === '/' || PUBLIC_PATHS.filter(p => p !== '/').some(p => pathname.startsWith(p))

  // Rate limiting для публичных форм
  const isRateLimited = RATE_LIMITED_PATHS.some(p => pathname.startsWith(p))
  if (isRateLimited) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (!checkRateLimit(ip, pathname)) {
      return new NextResponse('Too many requests. Please wait a minute.', {
        status: 429,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Retry-After': '60',
        },
      })
    }
  }

  // Проверяем сессию NextAuth
  const token = await getToken({ req: request })

  // Если маршрут защищён и пользователь не авторизован
  if (!isPublic && !token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Если авторизован и открывает /login или /register — редиректим на /dashboard
  if (token && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  const response = NextResponse.next({ request })

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://mc.yandex.ru https://mc.yandex.com https://yastatic.net`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https://mc.yandex.ru https://mc.yandex.com`,
    `connect-src 'self' https://mc.yandex.ru https://mc.yandex.com https://mc.webvisor.org`,
    `frame-ancestors 'self' https://metrika.yandex.ru https://metrika.yandex.by https://metrica.yandex.com https://metrica.yandex.com.tr https://webvisor.com https://*.webvisor.com`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
