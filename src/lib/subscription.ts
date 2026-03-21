// Ядро системы подписок — чистая логика без побочных эффектов

export type PlanId = 'free' | 'standard' | 'ai_pro'

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired'

export type PlanFeatures = {
  online_booking: boolean
  export: boolean
  followup_reminders: boolean
  ai_consultation: boolean
}

export type SubscriptionInfo = {
  planId: PlanId
  status: SubscriptionStatus
  maxPatients: number | null // null = безлимит
  features: PlanFeatures
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
}

// Дефолт для пользователей без записи в subscriptions
export const FREE_PLAN: SubscriptionInfo = {
  planId: 'free',
  status: 'active',
  maxPatients: 5,
  features: { online_booking: false, export: false, followup_reminders: false, ai_consultation: false },
  periodEnd: null,
  cancelAtPeriodEnd: false,
}

// Проверка доступности фичи
export function isFeatureAllowed(info: SubscriptionInfo, feature: keyof PlanFeatures): boolean {
  if (info.status === 'expired' || info.status === 'cancelled') return false
  return info.features[feature]
}

// Проверка возможности добавить пациента
export function canAddPatient(info: SubscriptionInfo, currentCount: number): boolean {
  if (info.status === 'expired' || info.status === 'cancelled') {
    return currentCount < 5 // downgrade → лимит Free
  }
  if (info.maxPatients === null) return true
  return currentCount < info.maxPatients
}

// Проверка доступа к конкретному пациенту (для graceful downgrade)
export function isPatientAccessible(
  info: SubscriptionInfo,
  patientIndex: number,
): boolean {
  if ((info.planId === 'standard' || info.planId === 'ai_pro') && info.status === 'active') return true
  return patientIndex < 5
}

// Проверка активна ли подписка
export function isSubscriptionActive(info: SubscriptionInfo): boolean {
  return info.status === 'active'
}

// Проверка доступа к AI-консультации (ai_pro или есть кредиты)
export function canUseAI(info: SubscriptionInfo, aiCredits: number): boolean {
  if (info.status === 'expired' || info.status === 'cancelled') return false
  if (info.features.ai_consultation) return true
  return aiCredits > 0
}

// Проверка доступа к демо AI (все тарифы)
export function canUseDemoAI(): boolean {
  return true
}
