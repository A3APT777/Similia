import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

// Rate limit: макс 5 попыток на email за 15 минут
const verifyAttempts = new Map<string, { count: number; resetAt: number }>()
const VERIFY_MAX_ATTEMPTS = 5
const VERIFY_WINDOW_MS = 15 * 60 * 1000 // 15 минут

function checkVerifyRateLimit(email: string, ip: string): boolean {
  const key = `${email}:${ip}`
  const now = Date.now()
  const entry = verifyAttempts.get(key)

  if (!entry || now > entry.resetAt) {
    verifyAttempts.set(key, { count: 1, resetAt: now + VERIFY_WINDOW_MS })
    return true
  }

  if (entry.count >= VERIFY_MAX_ATTEMPTS) {
    return false
  }

  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Введите код' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Rate limiting по email + IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    if (!checkVerifyRateLimit(normalizedEmail, ip)) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Подождите 15 минут.' },
        { status: 429 },
      )
    }

    // Ищем валидный код — не использованный, не истёкший
    const result = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM verification_codes
      WHERE email = ${normalizedEmail}
        AND code = ${code}
        AND used = false
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Неверный или истёкший код' }, { status: 400 })
    }

    // Помечаем код как использованный
    await prisma.$executeRaw`
      UPDATE verification_codes SET used = true WHERE id = ${result[0].id}::uuid
    `

    // Подтверждаем email пользователя
    await prisma.user.updateMany({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Ошибка проверки' }, { status: 500 })
  }
}
