import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

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
  if (ip.includes(':') || range.includes(':')) return false // пропускаем IPv6
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
    // Проверяем IP отправителя
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || ''

    if (process.env.NODE_ENV === 'production' && ip && !isYookassaIP(ip)) {
      console.warn('[webhook] rejected from IP:', ip)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const event = body.event
    const payment = body.object

    if (!payment?.id || !payment?.metadata?.user_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const userId = payment.metadata.user_id
    const period = payment.metadata.period as string
    const planId = (payment.metadata.plan_id || 'standard') as string
    const paymentId = payment.id

    // Кол-во кредитов в пакетах
    const PACK_CREDITS: Record<string, number> = {
      ai_pack_5: 5,
      ai_pack_15: 15,
      ai_pack_50: 50,
    }

    if (event === 'payment.succeeded') {
      // Защита от replay — проверяем не обработан ли уже этот платёж
      const { data: existingPayment } = await supabase
        .from('subscription_payments')
        .select('status')
        .eq('yukassa_payment_id', paymentId)
        .single()

      if (existingPayment?.status === 'succeeded') {
        console.log(`[webhook] Payment ${paymentId} already processed, skipping`)
        return NextResponse.json({ status: 'ok' })
      }

      // Обновляем статус платежа
      await supabase
        .from('subscription_payments')
        .update({ status: 'succeeded', paid_at: new Date().toISOString() })
        .eq('yukassa_payment_id', paymentId)

      // Обработка пакетов AI-кредитов
      if (planId.startsWith('ai_pack_')) {
        const credits = PACK_CREDITS[planId] || 0
        if (credits > 0) {
          const { data: settings } = await supabase
            .from('doctor_settings')
            .select('ai_credits')
            .eq('doctor_id', userId)
            .single()

          const currentCredits = settings?.ai_credits ?? 0
          await supabase
            .from('doctor_settings')
            .update({ ai_credits: currentCredits + credits })
            .eq('doctor_id', userId)

          console.log(`[webhook] AI pack: +${credits} credits for user=${userId}`)
        }
      } else {
        // Обработка подписок (standard, ai_pro)
        // Получаем текущую подписку чтобы правильно продлить
        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('current_period_end')
          .eq('doctor_id', userId)
          .single()

        // Продление: от текущей даты окончания (если она в будущем) или от сейчас
        const now = new Date()
        const existingEnd = currentSub?.current_period_end ? new Date(currentSub.current_period_end) : null
        const startFrom = (existingEnd && existingEnd > now) ? existingEnd : now

        const periodEnd = new Date(startFrom)
        if (period === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        }

        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            doctor_id: userId,
            plan_id: planId,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            billing_period: period,
            yukassa_payment_method_id: payment.payment_method?.id || null,
          }, {
            onConflict: 'doctor_id',
          })

        if (error) {
          console.error('[webhook] subscription update error:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
        }

        console.log(`[webhook] Payment succeeded: user=${userId}, plan=${planId}, period=${period}, ends=${periodEnd.toISOString()}`)
      }

      // Начислить реферальный бонус (если пользователь пришёл по реф. ссылке)
      try {
        await supabase.rpc('apply_referral_bonus', { p_invitee_id: userId })

        // +1 AI-кредит рефереру за оплатившего реферала
        const { data: invitation } = await supabase
          .from('referral_invitations')
          .select('referrer_id')
          .eq('invitee_id', userId)
          .single()

        if (invitation?.referrer_id) {
          // Получаем текущие кредиты и добавляем +1
          const { data: settings } = await supabase
            .from('doctor_settings')
            .select('ai_credits')
            .eq('doctor_id', invitation.referrer_id)
            .single()

          const currentCredits = settings?.ai_credits ?? 0
          const { error: creditErr } = await supabase
            .from('doctor_settings')
            .update({ ai_credits: currentCredits + 1 })
            .eq('doctor_id', invitation.referrer_id)

          if (creditErr) {
            console.error('[webhook] ai credit increment error:', creditErr)
          } else {
            console.log(`[webhook] +1 AI credit for referrer ${invitation.referrer_id}`)
          }
        }
      } catch (refErr) {
        console.error('[webhook] referral bonus error:', refErr)
      }
    }

    if (event === 'payment.canceled') {
      await supabase
        .from('subscription_payments')
        .update({ status: 'cancelled' })
        .eq('yukassa_payment_id', paymentId)

      console.log(`[webhook] Payment cancelled: payment=${paymentId}`)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[webhook] unexpected error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
