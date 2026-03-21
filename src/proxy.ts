import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Публичные маршруты — доступны без авторизации
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
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
  '/api/yookassa-webhook',
  '/checkout',
  '/pricing',
  '/demo',
  '/ai-intake',
  '/api/ai-demo',
]

// Публичные маршруты с rate limiting (защита от спама)
const RATE_LIMITED_PATHS = ['/intake/', '/followup/', '/upload/', '/survey/', '/new/', '/login', '/register']

// Простой in-process счётчик (сбрасывается при cold start, но лучше чем ничего).
// Для production с высокой нагрузкой заменить на Upstash Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_MAX = 10       // максимум запросов
const RATE_LIMIT_WINDOW = 60_000 // за 60 секунд

function checkRateLimit(ip: string, path: string): boolean {
  const key = `${ip}:${path.split('/').slice(0, 3).join('/')}`
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true // разрешено
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false // превышен лимит
  }

  entry.count++
  return true
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Проверяем, является ли путь публичным
  // '/' проверяется точным совпадением, остальные — по startsWith
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

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://mc.yandex.com https://yastatic.net`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https://*.supabase.co https://mc.yandex.ru https://mc.yandex.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://mc.yandex.ru https://mc.yandex.com https://mc.webvisor.org`,
    `frame-ancestors 'none'`,
  ].join('; ')

  let response = NextResponse.next({ request })

  // Создаём Supabase клиент с возможностью обновлять cookies сессии
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Обновляем сессию (важно для SSR — продлевает токен)
  const { data: { user } } = await supabase.auth.getUser()

  // Если маршрут защищён и пользователь не авторизован
  if (!isPublic && !user) {
    // API-маршруты → JSON 401 (не редирект)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Если авторизован и открывает /login или /register — редиректим на /dashboard
  if (user && (pathname === '/login' || pathname === '/register')) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    // Применяем ко всем страницам, кроме статики и API
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
