import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'

// Публичные маршруты — доступны без авторизации
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/auth',
  '/intake',
  '/followup',
  '/upload',
  '/new',
  '/privacy',
  '/terms',
]

// Публичные маршруты с rate limiting (защита от спама)
const RATE_LIMITED_PATHS = ['/intake/', '/followup/', '/upload/', '/new/']

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Проверяем, является ли путь публичным
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

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

  // Генерируем nonce для CSP — заменяет unsafe-inline
  const nonce = crypto.randomBytes(16).toString('base64')
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https://*.supabase.co`,
    `connect-src 'self' https://*.supabase.co`,
    `frame-ancestors 'none'`,
  ].join('; ')

  // Передаём nonce через заголовок — Next.js подхватит его автоматически
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  response.headers.set('Content-Security-Policy', csp)

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

  // Если маршрут защищён и пользователь не авторизован — редиректим на /login
  if (!isPublic && !user) {
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

  return response
}

export const config = {
  matcher: [
    // Применяем ко всем страницам, кроме статики и API
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
