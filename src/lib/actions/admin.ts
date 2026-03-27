'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { redirect } from 'next/navigation'

// Проверка что пользователь — админ
async function requireAdmin() {
  const { userId, user } = await requireAuth()

  const admin = await prisma.adminUser.findUnique({
    where: { userId },
  })

  if (!admin) redirect('/dashboard')
  return { userId, user }
}

// Статистика платформы
export async function getAdminStats() {
  await requireAdmin()

  const [
    totalUsers,
    totalPatients,
    totalConsultations,
    totalPayments,
    recentPayments,
    users,
    subscriptions,
    referrals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count({ where: { isDemo: false } }),
    prisma.consultation.count(),
    prisma.subscriptionPayment.count({ where: { status: 'succeeded' } }),
    prisma.subscriptionPayment.findMany({
      where: { status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: 1000,
    }),
    prisma.subscription.findMany({
      include: { plan: true },
      take: 1000,
    }),
    prisma.referralInvitation.findMany({ take: 1000 }),
  ])

  return {
    totalUsers,
    totalPatients,
    totalConsultations,
    totalPayments,
    recentPayments,
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      user_metadata: { name: u.name },
      created_at: u.createdAt.toISOString(),
    })),
    subscriptions,
    referrals,
  }
}

// Список врачей с деталями
export async function getAdminDoctors() {
  await requireAdmin()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerified: true,
    },
  })

  // Получаем количество пациентов и консультаций для каждого врача
  const doctorDetails = await Promise.all(
    users.map(async (user) => {
      const [
        patientCount,
        consultationCount,
        subscription,
        referralCode,
        doctorSettings,
      ] = await Promise.all([
        prisma.patient.count({ where: { doctorId: user.id, isDemo: false } }),
        prisma.consultation.count({ where: { doctorId: user.id } }),
        prisma.subscription.findUnique({
          where: { doctorId: user.id },
          include: { plan: true },
        }),
        prisma.referralCode.findUnique({
          where: { doctorId: user.id },
          select: { code: true },
        }),
        prisma.doctorSettings.findUnique({
          where: { doctorId: user.id },
          select: { subscriptionPlan: true, aiCredits: true },
        }),
      ])

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? '',
        createdAt: user.createdAt.toISOString(),
        lastSignIn: null, // NextAuth не хранит last_sign_in
        patientCount,
        consultationCount,
        subscription,
        referralCode: referralCode?.code ?? null,
        aiPro: doctorSettings?.subscriptionPlan === 'ai_pro',
        aiCredits: doctorSettings?.aiCredits ?? 0,
        emailVerified: user.emailVerified?.toISOString() ?? null,
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

  try {
    await prisma.subscription.update({
      where: { doctorId },
      data: {
        planId,
        status: 'active',
        currentPeriodEnd: new Date(periodEnd),
      },
    })
  } catch {
    throw new Error('Не удалось обновить подписку')
  }
}

// Все платежи
export async function getAdminPayments() {
  await requireAdmin()

  const payments = await prisma.subscriptionPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return payments
}

// Включить/выключить AI Pro для врача
export async function adminToggleAIPro(doctorId: string, enable: boolean) {
  await requireAdmin()

  // Обновляем doctor_settings (для AI-кредитов)
  try {
    await prisma.doctorSettings.upsert({
      where: { doctorId },
      update: { subscriptionPlan: enable ? 'ai_pro' : null },
      create: { doctorId, subscriptionPlan: enable ? 'ai_pro' : null },
    })
  } catch {
    throw new Error('Не удалось обновить AI Pro')
  }

  // Обновляем subscriptions (для подписки и features)
  if (enable) {
    const periodEnd = new Date()
    periodEnd.setFullYear(periodEnd.getFullYear() + 1) // AI Pro на 1 год
    try {
      await prisma.subscription.upsert({
        where: { doctorId },
        update: {
          planId: 'ai_pro',
          status: 'active',
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        create: {
          doctorId,
          planId: 'ai_pro',
          status: 'active',
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })
    } catch {
      throw new Error('Не удалось обновить подписку')
    }
  } else {
    // Откат на standard
    try {
      await prisma.subscription.update({
        where: { doctorId },
        data: { planId: 'standard' },
      })
    } catch {
      // noop
    }
  }
}

// Добавить AI-кредиты врачу (атомарный increment)
export async function adminAddAICredits(doctorId: string, credits: number) {
  await requireAdmin()

  try {
    // Сначала создаём запись если не существует
    await prisma.doctorSettings.upsert({
      where: { doctorId },
      update: {},
      create: { doctorId },
    })
    // Атомарный increment — без race condition
    await prisma.doctorSettings.update({
      where: { doctorId },
      data: { aiCredits: { increment: credits } },
    })
  } catch {
    throw new Error('Не удалось добавить кредиты')
  }
}

// AI Analysis Logs — просмотр для аналитики
export async function getAIAnalysisLogs(limit = 50) {
  await requireAdmin()

  const data = await prisma.aiAnalysisLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { email: true, name: true } } },
  })

  return data.map(d => ({
    ...d,
    doctorEmail: d.user?.email ?? null,
    doctorName: d.user?.name ?? null,
  }))
}

/**
 * Агрегация расхождений: группировка по "engine рекомендовал X, врачи выбрали Y"
 * Возвращает паттерны где 2+ разных врача не согласились одинаково.
 */
export async function getDisagreementPatterns() {
  await requireAdmin()

  const logs = await prisma.aiAnalysisLog.findMany({
    where: { disagreement: { not: null } },
    select: {
      id: true,
      userId: true,
      engineTop3: true,
      disagreement: true,
      inputText: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Группируем: "engine top-1 → chosen remedy" → кол-во уникальных врачей
  const patterns: Record<string, { engineRemedy: string; chosenRemedy: string; reasons: string[]; uniqueDoctors: Set<string>; count: number; lastDate: Date }> = {}

  for (const log of logs) {
    const d = log.disagreement as { chosenRemedy?: string; reason?: string } | null
    if (!d?.chosenRemedy) continue
    const top1 = (log.engineTop3 as Array<{ remedy: string }> | null)?.[0]?.remedy ?? 'unknown'
    const key = `${top1}→${d.chosenRemedy}`

    if (!patterns[key]) {
      patterns[key] = { engineRemedy: top1, chosenRemedy: d.chosenRemedy, reasons: [], uniqueDoctors: new Set(), count: 0, lastDate: log.createdAt }
    }
    patterns[key].count++
    patterns[key].uniqueDoctors.add(log.userId)
    if (d.reason) patterns[key].reasons.push(d.reason)
    if (log.createdAt > patterns[key].lastDate) patterns[key].lastDate = log.createdAt
  }

  return Object.values(patterns)
    .map(p => ({
      engineRemedy: p.engineRemedy,
      chosenRemedy: p.chosenRemedy,
      count: p.count,
      uniqueDoctors: p.uniqueDoctors.size,
      reasons: p.reasons,
      lastDate: p.lastDate,
      alert: p.uniqueDoctors.size >= 7, // Оповещение: 7+ разных врачей
    }))
    .sort((a, b) => b.uniqueDoctors - a.uniqueDoctors)
}

export type AIAnalysisLog = {
  id: string
  userId: string
  consultationId: string | null
  createdAt: Date
  confirmedInput: Array<{ rubric: string; type: string; priority: string; weight: number }> | null
  engineTop3: Array<{ remedy: string; score: number }> | null
  doctorChoice: string | null
  correctPosition: number | null  // 1, 2, 3 или null (не в top-3)
  confidenceLevel: string | null
  warnings: Array<{ type: string; message: string }> | null
  symptomCount: number | null
  modalityCount: number | null
  hasConflict: boolean | null
  highCount: number | null
  mediumCount: number | null
  lowCount: number | null
  mentalCount: number | null
  errorType: string | null
  disagreement: { chosenRemedy: string; reason: string; timestamp: string } | null
  doctorEmail: string | null
  doctorName: string | null
}

// Удалить аккаунт врача (каскадно удалит пациентов, консультации и т.д.)
export async function adminDeleteUser(doctorId: string) {
  await requireAdmin()

  try {
    // Удаляем связанные записи с RESTRICT (не каскадируются автоматически)
    await prisma.$transaction([
      prisma.preVisitSurvey.deleteMany({ where: { doctorId } }),
      prisma.prescriptionShare.deleteMany({ where: { doctorId } }),
      prisma.referralInvitation.deleteMany({ where: { OR: [{ referrerId: doctorId }, { inviteeId: doctorId }] } }),
      prisma.adminUser.deleteMany({ where: { userId: doctorId } }),
      // Остальное каскадируется автоматически через onDelete: Cascade
      prisma.user.delete({ where: { id: doctorId } }),
    ])
  } catch {
    throw new Error('Не удалось удалить аккаунт')
  }
}

// Заблокировать/разблокировать аккаунт
export async function adminBlockUser(doctorId: string, blocked: boolean) {
  await requireAdmin()

  try {
    // Используем emailVerified = null для блокировки (не сможет войти)
    await prisma.user.update({
      where: { id: doctorId },
      data: { emailVerified: blocked ? null : new Date() },
    })
  } catch {
    throw new Error('Не удалось обновить статус')
  }
}

// Смена пароля (для настроек, не админки)
export async function changePassword(currentPassword: string, newPassword: string) {
  const { userId } = await requireAuth()

  if (newPassword.length < 8) {
    throw new Error('Пароль должен содержать минимум 8 символов')
  }

  // Получаем пользователя с хешем пароля
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, email: true },
  })
  if (!user || !user.passwordHash) {
    throw new Error('Пользователь не найден или пароль не установлен')
  }

  // Проверяем текущий пароль через bcrypt
  const bcrypt = await import('bcryptjs')
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) {
    throw new Error('Неверный текущий пароль')
  }

  // Хешируем и сохраняем новый пароль
  const newHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  })
}
