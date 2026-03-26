import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Введите код' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

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
  } catch (err) {
    console.error('[verify] error:', err)
    return NextResponse.json({ error: 'Ошибка проверки' }, { status: 500 })
  }
}
