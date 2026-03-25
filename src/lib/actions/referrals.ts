'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

// Генерация кода XXXX-XXXX (без 0/O/1/l для читаемости)
function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Получить или создать реферальный код (lazy creation)
export async function getOrCreateReferralCode(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверяем существующий код
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('doctor_id', user.id)
    .single()

  if (existing) return existing.code

  // Создаём новый (с retry при коллизии)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode()
    const { data, error } = await supabase
      .from('referral_codes')
      .insert({ doctor_id: user.id, code })
      .select('code')
      .single()

    if (!error) return data.code

    // Конфликт по doctor_id — код уже создан (race condition)
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('doctor_id', user.id)
        .single()
      if (retry) return retry.code
    }
    console.error('[referrals] create code attempt', attempt, error)
  }
  throw new Error('Не удалось создать реферальный код')
}

// Статистика рефералов
export async function getReferralStats(): Promise<{
  code: string
  totalInvited: number
  totalPaid: number
  totalBonusDays: number
  maxBonusDays: number
  invitations: Array<{
    created_at: string
    bonus_applied: boolean
    referrer_bonus_days: number
  }>
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = await getOrCreateReferralCode()

  const { data: invitations } = await supabase
    .from('referral_invitations')
    .select('created_at, bonus_applied, referrer_bonus_days')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const list = invitations || []
  const totalPaid = list.filter(i => i.bonus_applied).length
  const totalBonusDays = list.reduce((sum, i) => sum + (i.referrer_bonus_days || 0), 0)

  return {
    code,
    totalInvited: list.length,
    totalPaid,
    totalBonusDays,
    maxBonusDays: 180,
    invitations: list,
  }
}

// Вызвать начисление бонуса (из webhook)
export async function triggerReferralBonus(inviteeId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.rpc('apply_referral_bonus', { p_invitee_id: inviteeId })
  if (error) {
    console.error('[referrals] apply bonus error:', error)
    // Не throw — бонус не критичен, основная регистрация не должна падать
  }
}
