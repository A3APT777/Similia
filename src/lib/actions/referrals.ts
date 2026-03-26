'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'

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
  const { userId } = await requireAuth()

  // Проверяем существующий код
  const existing = await prisma.referralCode.findUnique({
    where: { doctorId: userId },
    select: { code: true },
  })

  if (existing) return existing.code

  // Создаём новый (с retry при коллизии)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode()
    try {
      const created = await prisma.referralCode.create({
        data: { doctorId: userId, code },
        select: { code: true },
      })
      return created.code
    } catch (err: unknown) {
      // Конфликт по doctorId — код уже создан (race condition)
      const prismaError = err as { code?: string }
      if (prismaError.code === 'P2002') {
        const retry = await prisma.referralCode.findUnique({
          where: { doctorId: userId },
          select: { code: true },
        })
        if (retry) return retry.code
      }
      console.error('[referrals] create code attempt', attempt, err)
    }
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
  const { userId } = await requireAuth()

  const code = await getOrCreateReferralCode()

  const invitations = await prisma.referralInvitation.findMany({
    where: { referrerId: userId },
    select: { createdAt: true, bonusApplied: true, referrerBonusDays: true },
    orderBy: { createdAt: 'desc' },
  })

  const list = invitations || []
  const totalPaid = list.filter(i => i.bonusApplied).length
  const totalBonusDays = list.reduce((sum, i) => sum + (i.referrerBonusDays || 0), 0)

  return {
    code,
    totalInvited: list.length,
    totalPaid,
    totalBonusDays,
    maxBonusDays: 180,
    // Маппим camelCase → snake_case для совместимости с UI
    invitations: list.map(i => ({
      created_at: i.createdAt.toISOString(),
      bonus_applied: i.bonusApplied,
      referrer_bonus_days: i.referrerBonusDays,
    })),
  }
}

// Вызвать начисление бонуса (из webhook) — используем raw SQL т.к. логика в БД-функции
export async function triggerReferralBonus(inviteeId: string): Promise<void> {
  try {
    await prisma.$executeRaw`SELECT apply_referral_bonus(${inviteeId}::uuid)`
  } catch (error) {
    console.error('[referrals] apply bonus error:', error)
    // Не throw — бонус не критичен, основная регистрация не должна падать
  }
}
