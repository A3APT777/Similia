import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { sendVerificationCode, generateVerificationCode } from '@/lib/email'
import { sendTelegramAlert } from '@/lib/telegram'

export async function POST(req: Request) {
  try {
    const { email, password, name, referralCode } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Проверяем не занят ли email
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      // Если email не подтверждён — разрешаем повторную отправку кода
      if (!existing.emailVerified) {
        const code = generateVerificationCode()
        await prisma.$executeRaw`
          INSERT INTO verification_codes (email, code, expires_at)
          VALUES (${normalizedEmail}, ${code}, NOW() + INTERVAL '15 minutes')
        `
        await sendVerificationCode(normalizedEmail, code)
        return NextResponse.json({ success: true, needsVerification: true })
      }
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    // Создаём пользователя (emailVerified = null — не подтверждён)
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
      },
    })

    // Акция запуска: регистрация до 31.03.2026 → Standard до 31.05.2026
    const promoDeadline = new Date('2026-03-31T23:59:59Z')
    const isPromoUser = new Date() <= promoDeadline

    await prisma.subscription.create({
      data: {
        doctorId: user.id,
        planId: isPromoUser ? 'standard' : 'free',
        status: 'active',
        billingPeriod: 'monthly',
        currentPeriodStart: new Date(),
        currentPeriodEnd: isPromoUser
          ? new Date('2026-05-31T23:59:59Z')
          : new Date('2099-12-31T23:59:59Z'),
      },
    })

    await prisma.doctorSettings.create({
      data: { doctorId: user.id },
    }).catch(() => null)

    // Реферальный код
    if (referralCode) {
      try {
        const refCode = await prisma.referralCode.findUnique({ where: { code: referralCode } })
        if (refCode) {
          await prisma.referralInvitation.create({
            data: { referrerId: refCode.doctorId, inviteeId: user.id },
          })
        }
      } catch { /* не критично */ }
    }

    // Генерируем код и отправляем на email
    const code = generateVerificationCode()
    await prisma.$executeRaw`
      INSERT INTO verification_codes (email, code, expires_at)
      VALUES (${normalizedEmail}, ${code}, NOW() + INTERVAL '15 minutes')
    `
    await sendVerificationCode(normalizedEmail, code)

    // Уведомление в Telegram
    sendTelegramAlert(
      `👤 <b>Новая регистрация</b>\n\n` +
      `📧 ${normalizedEmail}\n` +
      `👨‍⚕️ ${name}\n` +
      `📋 Тариф: ${isPromoUser ? 'Standard (акция)' : 'Free'}\n` +
      `${referralCode ? `🔗 Реферал: ${referralCode}\n` : ''}` +
      `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
    )

    return NextResponse.json({ success: true, needsVerification: true })
  } catch (err) {
    console.error('[register] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
