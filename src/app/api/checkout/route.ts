import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const checkoutSchema = z.object({
  plan: z.enum(['standard', 'ai_pro', 'ai_pack_5', 'ai_pack_15', 'ai_pack_50']).default('standard'),
  period: z.enum(['monthly', 'yearly']).optional(),
})

// Цены для подписок (требуют period)
const SUBSCRIPTION_PRICES: Record<string, Record<string, number>> = {
  standard: { monthly: 290, yearly: 2900 },
  ai_pro: { monthly: 1990, yearly: 19900 },
}

// Цены для разовых пакетов AI-кредитов
const PACK_PRICES: Record<string, { amount: number; credits: number }> = {
  ai_pack_5: { amount: 299, credits: 5 },
  ai_pack_15: { amount: 749, credits: 15 },
  ai_pack_50: { amount: 1990, credits: 50 },
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
    }

    const { plan, period } = parsed.data
    const isPack = plan.startsWith('ai_pack_')
    const isSubscription = plan === 'standard' || plan === 'ai_pro'

    // Для подписок period обязателен
    if (isSubscription && !period) {
      return NextResponse.json({ error: 'Не указан период подписки' }, { status: 400 })
    }

    // Защита от двойного клика — нет ли pending платежа за последние 5 минут
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentPending } = await supabase
      .from('subscription_payments')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('status', 'pending')
      .gte('created_at', fiveMinAgo)
      .limit(1)

    if (recentPending && recentPending.length > 0) {
      return NextResponse.json({
        error: 'Платёж уже создан. Если вы не завершили оплату, подождите 5 минут и попробуйте снова.'
      }, { status: 400 })
    }

    // Для подписок — проверяем текущую подписку
    if (isSubscription) {
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end')
        .eq('doctor_id', user.id)
        .single()

      if (currentSub?.plan_id === plan && currentSub?.status === 'active') {
        const periodEnd = new Date(currentSub.current_period_end)
        const threeDaysFromNow = new Date()
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

        if (periodEnd > threeDaysFromNow) {
          return NextResponse.json({
            error: `Подписка активна до ${periodEnd.toLocaleDateString('ru-RU')}. Продление доступно за 3 дня до окончания.`
          }, { status: 400 })
        }
      }
    }

    // Определяем сумму и описание
    let amount: number
    let description: string

    if (isPack) {
      const pack = PACK_PRICES[plan]
      amount = pack.amount
      description = `Similia AI Pack ${pack.credits} credits`
    } else {
      amount = SUBSCRIPTION_PRICES[plan][period!]
      const planName = plan === 'ai_pro' ? 'AI Pro' : 'Standard'
      description = period === 'monthly'
        ? `Similia ${planName} 1 month`
        : `Similia ${planName} 1 year`
    }

    const shopId = process.env.YOOKASSA_SHOP_ID
    const secretKey = process.env.YOOKASSA_SECRET_KEY
    if (!shopId || !secretKey) {
      return NextResponse.json({ error: 'Платёжная система не настроена' }, { status: 500 })
    }

    // Idempotence key на базе user + plan + минута — защита от двойного клика
    const minute = Math.floor(Date.now() / 60000)
    const idempotenceKey = `${user.id}-${plan}-${period || 'pack'}-${minute}`
    const origin = req.headers.get('origin') || 'https://simillia.ru'

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
      },
      body: JSON.stringify({
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: `${origin}/checkout/success`,
        },
        description,
        metadata: {
          user_id: user.id,
          period: period || 'one_time',
          plan_id: plan,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[checkout] YooKassa error:', response.status, errorText)
      return NextResponse.json({ error: 'Ошибка платёжной системы' }, { status: 502 })
    }

    const payment = await response.json()

    // Сохраняем платёж в БД (без subscription_id — он необязательный)
    await supabase
      .from('subscription_payments')
      .insert({
        doctor_id: user.id,
        amount,
        currency: 'RUB',
        status: 'pending',
        yukassa_payment_id: payment.id,
        billing_period: period || 'one_time',
        plan_id: plan,
      })

    return NextResponse.json({
      confirmation_url: payment.confirmation.confirmation_url,
      payment_id: payment.id,
    })
  } catch (err) {
    console.error('[checkout] unexpected error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
