'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { redirect } from 'next/navigation'
import { uuidSchema, addPaidSessionsSchema } from '@/lib/validation'
import { z } from 'zod'

const followupDaysSchema = z.number().int().min(1).max(365)
const enabledSchema = z.boolean()

// Получить настройки врача (оплата и напоминания)
export async function getDoctorSettings(): Promise<{ paid_sessions_enabled: boolean; followup_reminder_days: number }> {
  const { userId } = await requireAuth()

  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { paidSessionsEnabled: true, followupReminderDays: true },
  })

  return {
    paid_sessions_enabled: settings?.paidSessionsEnabled ?? false,
    followup_reminder_days: settings?.followupReminderDays ?? 30,
  }
}

// Обновить интервал напоминаний для фоллоу-апов
export async function updateFollowupReminderDays(days: number): Promise<void> {
  const validated = followupDaysSchema.parse(days)
  const { userId } = await requireAuth()

  await prisma.doctorSettings.upsert({
    where: { doctorId: userId },
    update: { followupReminderDays: validated },
    create: { doctorId: userId, followupReminderDays: validated },
  })
}

// Включить/выключить трекинг оплаченных сеансов
export async function updatePaidSessionsEnabled(enabled: boolean): Promise<void> {
  const validated = enabledSchema.parse(enabled)
  const { userId } = await requireAuth()

  await prisma.doctorSettings.upsert({
    where: { doctorId: userId },
    update: { paidSessionsEnabled: validated },
    create: { doctorId: userId, paidSessionsEnabled: validated },
  })
}

// Добавить оплаченные сеансы пациенту (атомарный инкремент)
export async function addPaidSessions(patientId: string, amount: number, note: string): Promise<void> {
  uuidSchema.parse(patientId)
  addPaidSessionsSchema.parse({ amount, note })
  const { userId } = await requireAuth()

  // Атомарное обновление — защита от race condition
  await prisma.patient.update({
    where: { id: patientId, doctorId: userId },
    data: { paidSessions: { increment: amount } },
  })

  // Запись в историю платежей
  await prisma.paymentHistory.create({
    data: {
      patientId,
      doctorId: userId,
      amount,
      note: note.trim() || null,
    },
  })
}

// Списать один оплаченный сеанс (при создании консультации)
// Атомарный декремент — защита от TOCTOU race condition
export async function decrementPaidSession(
  patientId: string
): Promise<{ prevCount: number; newCount: number }> {
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  // Один атомарный запрос: декремент только если paid_sessions > 0
  const affected: number = await prisma.$executeRaw`
    UPDATE "Patient"
    SET "paidSessions" = "paidSessions" - 1
    WHERE id = ${patientId}
      AND "doctorId" = ${userId}
      AND "paidSessions" > 0
  `

  // Если 0 строк затронуто — баланс уже 0 или пациент не найден
  if (affected === 0) return { prevCount: 0, newCount: 0 }

  // Получаем новое значение после декремента
  const updated = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { paidSessions: true },
  })

  const newCount = updated?.paidSessions ?? 0
  const prevCount = newCount + 1

  // Запись в историю платежей
  await prisma.paymentHistory.create({
    data: {
      patientId,
      doctorId: userId,
      amount: -1,
      note: 'авто',
    },
  })

  return { prevCount, newCount }
}

// Получить историю платежей пациента (последние 10 записей)
export async function getPaymentHistory(patientId: string): Promise<
  { id: string; amount: number; note: string | null; created_at: string }[]
> {
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  const rows = await prisma.paymentHistory.findMany({
    where: { patientId, doctorId: userId },
    select: { id: true, amount: true, note: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Сохраняем формат ответа для совместимости с UI
  return rows.map(r => ({
    id: r.id,
    amount: r.amount,
    note: r.note,
    created_at: r.createdAt.toISOString(),
  }))
}

// Получить пациентов без оплаченных сеансов (для уведомлений)
export async function getUnpaidPatients(): Promise<{ id: string; name: string }[]> {
  const { userId } = await requireAuth()

  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { paidSessionsEnabled: true },
  })

  if (settings?.paidSessionsEnabled === false) return []

  // Пациенты с нулём сеансов, у которых есть история платежей
  const zeroPatients = await prisma.patient.findMany({
    where: {
      doctorId: userId,
      paidSessions: 0,
      paymentHistory: { some: { doctorId: userId } },
    },
    select: { id: true, name: true },
  })

  return zeroPatients
}
