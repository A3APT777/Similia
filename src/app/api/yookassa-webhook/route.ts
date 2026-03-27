import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramAlert } from '@/lib/telegram'

// IP-адреса ЮKassa для webhook (из документации)
const YOOKASSA_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
  '2a02:5180::/32',
]

function ipInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr
  const [range, bits] = cidr.split('/')
  if (ip.includes(':') || range.includes(':')) return false
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
  const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0
  return (ipNum & mask) === (rangeNum & mask)
}

function isYookassaIP(ip: string): boolean {
  return YOOKASSA_IPS.some(cidr => ipInRange(ip, cidr))
}

export async function POST(req: NextRequest) {
  try {
    // FIX #1: Берём IP из x-real-ip (nginx ставит его надёжно), fallback на x-forwarded-for
    const ip = req.headers.get('x-real-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || ''

    // FIX #8: Отклоняем при пустом IP или невалидном
    if (!ip || !isYookassaIP(ip)) {
      console.warn('[webhook] rejected: ip=' + (ip || 'empty'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const event = body.event
    const payment = body.object

    if (!payment?.id || !payment?.metadata?.user_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const userId = payment.metadata.user_id
    const period = payment.metadata.period as string
    const planId = (payment.metadata.plan_id || 'standard') as string
    const paymentId = payment.id

    const PACK_CREDITS: Record<string, number> = {
      ai_pack_5: 5,
      ai_pack_15: 15,
      ai_pack_50: 50,
    }

    if (event === 'payment.succeeded') {
      // FIX #3: Вся обработка в транзакции — защита от race condition
      await prisma.$transaction(async (tx) => {
        // Защита от replay
        const existingPayment = await tx.subscriptionPayment.findUnique({
          where: { yukassaPaymentId: paymentId },
          select: { status: true },
        })

        if (existingPayment?.status === 'succeeded') {
          console.log(`[webhook] Payment ${paymentId} already processed, skipping`)
          return
        }

        // Обновляем статус платежа
        if (existingPayment) {
          await tx.subscriptionPayment.update({
            where: { yukassaPaymentId: paymentId },
            data: { status: 'succeeded' },
          })
        }

        // Обработка пакетов AI-кредитов
        if (planId.startsWith('ai_pack_')) {
          const credits = PACK_CREDITS[planId] || 0
          if (credits > 0) {
            // FIX #4: Атомарный инкремент вместо read-then-write
            await tx.doctorSettings.upsert({
              where: { doctorId: userId },
              update: { aiCredits: { increment: credits } },
              create: { doctorId: userId, aiCredits: credits },
            })
            console.log(`[webhook] AI pack: +${credits} credits for user=${userId}`)
          }
        } else {
          // Обработка подписок (standard, ai_pro)
          const currentSub = await tx.subscription.findUnique({
            where: { doctorId: userId },
            select: { currentPeriodEnd: true },
          })

          const now = new Date()
          const existingEnd = currentSub?.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd) : null
          const startFrom = (existingEnd && existingEnd > now) ? existingEnd : now

          const periodEnd = new Date(startFrom)
          if (period === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          await tx.subscription.upsert({
            where: { doctorId: userId },
            update: {
              planId,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              billingPeriod: period,
              yukassaPaymentMethodId: payment.payment_method?.id || null,
            },
            create: {
              doctorId: userId,
              planId,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              billingPeriod: period,
              yukassaPaymentMethodId: payment.payment_method?.id || null,
            },
          })

          console.log(`[webhook] Payment succeeded: user=${userId}, plan=${planId}, period=${period}, ends=${periodEnd.toISOString()}`)
        }

        // Реферальный бонус (только за подписку, не за паки)
        if (!planId.startsWith('ai_pack_')) {
          try {
            await tx.$executeRaw`SELECT apply_referral_bonus(${userId}::uuid)`
          } catch (refErr) {
            console.error('[webhook] referral bonus error:', refErr)
          }

          // +1 AI-кредит рефереру, +2 приглашённому
          try {
            const invitation = await tx.referralInvitation.findUnique({
              where: { inviteeId: userId },
              select: { referrerId: true },
            })
            if (invitation?.referrerId) {
              // Рефереру +1 AI-анализ
              await tx.doctorSettings.upsert({
                where: { doctorId: invitation.referrerId },
                update: { aiCredits: { increment: 1 } },
                create: { doctorId: invitation.referrerId, aiCredits: 1 },
              })
              // Приглашённому +2 AI-анализа
              await tx.doctorSettings.upsert({
                where: { doctorId: userId },
                update: { aiCredits: { increment: 2 } },
                create: { doctorId: userId, aiCredits: 2 },
              })
              console.log(`[webhook] referral bonus: +1 AI for referrer ${invitation.referrerId}, +2 AI for invitee ${userId}`)
            }
          } catch (creditErr) {
            console.error('[webhook] ai credit increment error:', creditErr)
          }
        }
      })
    }

    // Telegram-алерт об оплате
    if (event === 'payment.succeeded') {
      const amount = payment.amount?.value || '?'
      const currency = payment.amount?.currency || 'RUB'
      const packCredits = PACK_CREDITS[planId]
      const planLabel = packCredits ? `Пакет AI (${packCredits} шт)` : planId === 'ai_pro' ? 'AI Pro' : 'Стандарт'

      // Получаем email врача
      const doctor = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })

      sendTelegramAlert(
        `💰 <b>Оплата прошла</b>\n\n` +
        `📧 ${doctor?.email || userId}\n` +
        `👨‍⚕️ ${doctor?.name || '—'}\n` +
        `📋 ${planLabel} (${period || '—'})\n` +
        `💵 ${amount} ${currency}\n` +
        `🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
      )
    }

    if (event === 'payment.canceled') {
      await prisma.subscriptionPayment.updateMany({
        where: { yukassaPaymentId: paymentId },
        data: { status: 'cancelled' },
      })
      console.log(`[webhook] Payment cancelled: payment=${paymentId}`)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[webhook] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
