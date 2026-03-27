import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { sendTelegramAlert, reportError } from '@/lib/telegram'

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
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    // Создаём пользователя (emailVerified = NOW — сразу подтверждён, без кода)
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        emailVerified: new Date(),
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

    // Уведомление в Telegram
    sendTelegramAlert(
      `👤 <b>Новая регистрация</b>\n\n` +
      `📧 ${normalizedEmail}\n` +
      `👨‍⚕️ ${name}\n` +
      `📋 Тариф: ${isPromoUser ? 'Standard (акция)' : 'Free'}\n` +
      `${referralCode ? `🔗 Реферал: ${referralCode}\n` : ''}` +
      `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    reportError('Регистрация', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
