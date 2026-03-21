'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

// Проверка что пользователь — админ
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!admin) redirect('/dashboard')
  return user
}

// Статистика платформы
export async function getAdminStats() {
  await requireAdmin()
  const service = createServiceClient()

  const [
    { count: totalUsers },
    { count: totalPatients },
    { count: totalConsultations },
    { count: totalPayments },
    { data: recentPayments },
  ] = await Promise.all([
    service.from('patients').select('*', { count: 'exact', head: true }).eq('is_demo', false),
    service.from('patients').select('*', { count: 'exact', head: true }).eq('is_demo', false),
    service.from('consultations').select('*', { count: 'exact', head: true }),
    service.from('subscription_payments').select('*', { count: 'exact', head: true }).eq('status', 'succeeded'),
    service.from('subscription_payments').select('*').eq('status', 'succeeded').order('created_at', { ascending: false }).limit(5),
  ])

  // Получаем всех пользователей через auth admin API
  const { data: { users } } = await service.auth.admin.listUsers()

  // Подписки
  const { data: subscriptions } = await service
    .from('subscriptions')
    .select('*, subscription_plans(*)')

  // Рефералы
  const { data: referrals } = await service
    .from('referral_invitations')
    .select('*')

  return {
    totalUsers: users?.length || 0,
    totalPatients: totalPatients || 0,
    totalConsultations: totalConsultations || 0,
    totalPayments: totalPayments || 0,
    recentPayments: recentPayments || [],
    users: users || [],
    subscriptions: subscriptions || [],
    referrals: referrals || [],
  }
}

// Список врачей с деталями
export async function getAdminDoctors() {
  await requireAdmin()
  const service = createServiceClient()

  const { data: { users } } = await service.auth.admin.listUsers()

  // Получаем количество пациентов и консультаций для каждого врача
  const doctorDetails = await Promise.all(
    (users || []).map(async (user) => {
      const [
        { count: patientCount },
        { count: consultationCount },
        { data: subscription },
        { data: referralCode },
        { data: doctorSettings },
      ] = await Promise.all([
        service.from('patients').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('is_demo', false),
        service.from('consultations').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id),
        service.from('subscriptions').select('*, subscription_plans(*)').eq('doctor_id', user.id).single(),
        service.from('referral_codes').select('code').eq('doctor_id', user.id).single(),
        service.from('doctor_settings').select('subscription_plan, ai_credits').eq('doctor_id', user.id).single(),
      ])

      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || '',
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        patientCount: patientCount || 0,
        consultationCount: consultationCount || 0,
        subscription: subscription,
        referralCode: referralCode?.code || null,
        aiPro: doctorSettings?.subscription_plan === 'ai_pro',
        aiCredits: doctorSettings?.ai_credits ?? 0,
      }
    })
  )

  return doctorDetails
}

// Управление подпиской врача
export async function adminUpdateSubscription(doctorId: string, planId: string, periodEnd: string) {
  await requireAdmin()

  // Валидация planId
  const validPlans = ['free', 'standard', 'ai_pro']
  if (!validPlans.includes(planId)) {
    throw new Error(`Недопустимый тариф: ${planId}`)
  }

  const service = createServiceClient()

  const { error } = await service
    .from('subscriptions')
    .update({
      plan_id: planId,
      status: 'active',
      current_period_end: periodEnd,
    })
    .eq('doctor_id', doctorId)

  if (error) {
    console.error('[adminUpdateSubscription]', error)
    throw new Error('Не удалось обновить подписку')
  }
}

// Все платежи
export async function getAdminPayments() {
  await requireAdmin()
  const service = createServiceClient()

  const { data: payments } = await service
    .from('subscription_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return payments || []
}

// Включить/выключить AI Pro для врача
export async function adminToggleAIPro(doctorId: string, enable: boolean) {
  await requireAdmin()
  const service = createServiceClient()

  const { error } = await service
    .from('doctor_settings')
    .upsert({
      doctor_id: doctorId,
      subscription_plan: enable ? 'ai_pro' : null,
    }, { onConflict: 'doctor_id' })

  if (error) {
    console.error('[adminToggleAIPro]', error)
    throw new Error('Не удалось обновить AI Pro')
  }
}

// Добавить AI-кредиты врачу
export async function adminAddAICredits(doctorId: string, credits: number) {
  await requireAdmin()
  const service = createServiceClient()

  const { data: settings } = await service
    .from('doctor_settings')
    .select('ai_credits')
    .eq('doctor_id', doctorId)
    .single()

  const currentCredits = settings?.ai_credits ?? 0

  const { error } = await service
    .from('doctor_settings')
    .upsert({
      doctor_id: doctorId,
      ai_credits: currentCredits + credits,
    }, { onConflict: 'doctor_id' })

  if (error) {
    console.error('[adminAddAICredits]', error)
    throw new Error('Не удалось добавить кредиты')
  }
}

// Смена пароля (для настроек, не админки)
export async function changePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (newPassword.length < 8) {
    throw new Error('Пароль должен содержать минимум 8 символов')
  }

  // Проверяем текущий пароль
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  })

  if (signInError) {
    throw new Error('Неверный текущий пароль')
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    console.error('[changePassword]', error)
    throw new Error('Не удалось сменить пароль')
  }
}
