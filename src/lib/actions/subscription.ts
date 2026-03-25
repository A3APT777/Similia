'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FREE_PLAN, type SubscriptionInfo, type PlanId, type PlanFeatures } from '@/lib/subscription'

// Получить подписку текущего врача
export async function getSubscription(): Promise<SubscriptionInfo> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return FREE_PLAN

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end, cancel_at_period_end, subscription_plans(max_patients, features)')
    .eq('doctor_id', user.id)
    .single()

  if (error || !data) return FREE_PLAN

  const plan = data.subscription_plans as unknown as { max_patients: number | null; features: PlanFeatures } | null
  const now = new Date()
  const periodEnd = new Date(data.current_period_end)

  // Проверяем не истекла ли подписка
  let status = data.status as SubscriptionInfo['status']
  if (periodEnd < now && status === 'active') {
    status = 'expired'
  }

  return {
    planId: data.plan_id as PlanId,
    status,
    maxPatients: plan?.max_patients ?? 5,
    features: plan?.features ?? FREE_PLAN.features,
    periodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  }
}

// Проверить лимит пациентов
export async function checkPatientLimit(): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, current: 0, max: 5 }

  const sub = await getSubscription()

  const { count, error } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('doctor_id', user.id)
    .eq('is_demo', false)

  if (error) {
    console.error('[checkPatientLimit]', error)
    return { allowed: false, current: 0, max: sub.maxPatients }
  }

  const current = count ?? 0
  const allowed = sub.maxPatients === null ? true : current < sub.maxPatients

  return { allowed, current, max: sub.maxPatients }
}

// Получить ID доступных пациентов (для graceful downgrade)
export async function getAccessiblePatientIds(): Promise<{ ids: string[]; isLimited: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ids: [], isLimited: true }

  const sub = await getSubscription()

  // Стандарт или AI Pro активный — все пациенты доступны
  if ((sub.planId === 'standard' || sub.planId === 'ai_pro') && sub.status === 'active') {
    return { ids: [], isLimited: false } // пустой = все доступны
  }

  // Free или downgrade — последние 5 реальных (не демо) по дате визита
  const { data } = await supabase
    .from('patients')
    .select('id, is_demo, consultations(created_at)')
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!data) return { ids: [], isLimited: true }

  // Демо-пациенты всегда доступны
  const demoIds = data.filter(p => (p as unknown as { is_demo: boolean }).is_demo).map(p => p.id)
  const realPatients = data.filter(p => !(p as unknown as { is_demo: boolean }).is_demo)

  // Сортируем реальных по дате последней консультации
  const sorted = realPatients
    .map(p => ({
      id: p.id,
      lastVisit: (p.consultations as unknown as { created_at: string }[])
        ?.sort((a, b) => b.created_at.localeCompare(a.created_at))?.[0]?.created_at || '',
    }))
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit))

  const accessibleIds = [...demoIds, ...sorted.slice(0, 5).map(p => p.id)]
  return { ids: accessibleIds, isLimited: true }
}

// Получить все тарифы (для страницы pricing)
export async function getPlans() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  return data || []
}
