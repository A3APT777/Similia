'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FREE_PLAN, type SubscriptionInfo, type PlanId, type PlanFeatures } from '@/lib/subscription'

// Получить подписку текущего врача
export async function getSubscription(): Promise<SubscriptionInfo> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return FREE_PLAN

  const sub = await prisma.subscription.findUnique({
    where: { doctorId: session.user.id },
    include: { plan: true },
  })

  if (!sub) return FREE_PLAN

  const now = new Date()
  const periodEnd = new Date(sub.currentPeriodEnd)

  // Проверяем не истекла ли подписка
  let status = sub.status as SubscriptionInfo['status']
  if (periodEnd < now && status === 'active') {
    status = 'expired'
  }

  return {
    planId: sub.planId as PlanId,
    status,
    maxPatients: sub.plan.maxPatients ?? 5,
    features: (sub.plan.features as PlanFeatures) ?? FREE_PLAN.features,
    periodEnd: sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  }
}

// Проверить лимит пациентов
export async function checkPatientLimit(): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { allowed: false, current: 0, max: 5 }

  const sub = await getSubscription()

  const current = await prisma.patient.count({
    where: { doctorId: session.user.id, isDemo: false },
  })

  const allowed = sub.maxPatients === null ? true : current < sub.maxPatients

  return { allowed, current, max: sub.maxPatients }
}

// Получить ID доступных пациентов (для graceful downgrade)
export async function getAccessiblePatientIds(): Promise<{ ids: string[]; isLimited: boolean }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { ids: [], isLimited: true }

  const sub = await getSubscription()

  // Стандарт или AI Pro активный — все пациенты доступны
  if ((sub.planId === 'standard' || sub.planId === 'ai_pro') && sub.status === 'active') {
    return { ids: [], isLimited: false }
  }

  // Free или downgrade — последние 5 реальных (не демо) по дате визита
  const patients = await prisma.patient.findMany({
    where: { doctorId: session.user.id },
    select: {
      id: true,
      isDemo: true,
      consultations: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Демо-пациенты всегда доступны
  const demoIds = patients.filter(p => p.isDemo).map(p => p.id)
  const realPatients = patients.filter(p => !p.isDemo)

  // Сортируем реальных по дате последней консультации
  const sorted = realPatients
    .map(p => ({
      id: p.id,
      lastVisit: p.consultations[0]?.createdAt?.toISOString() || '',
    }))
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit))

  const accessibleIds = [...demoIds, ...sorted.slice(0, 5).map(p => p.id)]
  return { ids: accessibleIds, isLimited: true }
}

// Получить все тарифы (для страницы pricing)
export async function getPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  return plans
}
