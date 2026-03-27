import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramAlert, reportError } from '@/lib/telegram'

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
            // noop
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

          // noop
        }

        // Реферальный бонус (только за подписку, не за паки)
        if (!planId.startsWith('ai_pack_')) {
          try {
            const invitation = await tx.referralInvitation.findUnique({
              where: { inviteeId: userId },
              select: { referrerId: true, bonusApplied: true },
            })

            if (invitation?.referrerId && !invitation.bonusApplied) {
              const MAX_BONUS_DAYS = 180
              const REFERRER_DAYS = 7
              const INVITEE_DAYS = 14

              // Рефереру: +7 дней подписки + 1 AI-кредит
              const referrerSub = await tx.subscription.findUnique({ where: { doctorId: invitation.referrerId } })
              if (referrerSub) {
                // Считаем уже накопленные бонусные дни
                const totalBonusDays = await tx.referralInvitation.aggregate({
                  where: { referrerId: invitation.referrerId, bonusApplied: true },
                  _sum: { referrerBonusDays: true },
                })
                const alreadyBonusDays = totalBonusDays._sum.referrerBonusDays || 0

                if (alreadyBonusDays < MAX_BONUS_DAYS) {
                  const daysToAdd = Math.min(REFERRER_DAYS, MAX_BONUS_DAYS - alreadyBonusDays)
                  const currentEnd = new Date(referrerSub.currentPeriodEnd || Date.now())
                  const newEnd = new Date(currentEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
                  await tx.subscription.update({
                    where: { doctorId: invitation.referrerId },
                    data: { currentPeriodEnd: newEnd },
                  })
                }
              }
              await tx.doctorSettings.upsert({
                where: { doctorId: invitation.referrerId },
                update: { aiCredits: { increment: 1 } },
                create: { doctorId: invitation.referrerId, aiCredits: 1 },
              })

              // Приглашённому: +14 дней подписки + 2 AI-кредита
              const inviteeSub = await tx.subscription.findUnique({ where: { doctorId: userId } })
              if (inviteeSub) {
                const currentEnd = new Date(inviteeSub.currentPeriodEnd || Date.now())
                const newEnd = new Date(currentEnd.getTime() + INVITEE_DAYS * 24 * 60 * 60 * 1000)
                await tx.subscription.update({
                  where: { doctorId: userId },
                  data: { currentPeriodEnd: newEnd },
                })
              }
              await tx.doctorSettings.upsert({
                where: { doctorId: userId },
                update: { aiCredits: { increment: 2 } },
                create: { doctorId: userId, aiCredits: 2 },
              })

              // Помечаем бонус как применённый
              await tx.referralInvitation.update({
                where: { inviteeId: userId },
                data: { bonusApplied: true, referrerBonusDays: REFERRER_DAYS },
              })

              // noop
            }
          } catch {
            // noop — бонус не критичен
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
      // noop
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    reportError('YooKassa webhook', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
