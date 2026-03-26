'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { uuidSchema, followupStatusSchema } from '@/lib/validation'
import { z } from 'zod'

// Создать фоллоу-ап для консультации
export async function createFollowup(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  // Проверяем что консультация принадлежит текущему врачу
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, doctorId: userId },
    select: { id: true },
  })

  if (!consultation) throw new Error('Консультация не найдена')

  // Проверяем — нет ли уже follow-up для этой консультации
  const existing = await prisma.followup.findFirst({
    where: { consultationId },
    select: { id: true, token: true },
  })

  if (existing) return { token: existing.token }

  // Создаём новый фоллоу-ап
  const followup = await prisma.followup.create({
    data: {
      consultationId,
      patientId,
      sentAt: new Date(),
    },
    select: { token: true },
  })

  return { token: followup.token }
}

// Ответить на фоллоу-ап (публичная форма, без авторизации)
export async function respondFollowup(
  token: string,
  status: 'better' | 'same' | 'worse' | 'new_symptoms',
  comment: string
) {
  uuidSchema.parse(token)
  followupStatusSchema.parse(status)
  z.string().max(2000, 'Комментарий слишком длинный').parse(comment)

  // Обновляем только если ещё не отвечен (respondedAt === null)
  const result = await prisma.followup.updateMany({
    where: { token, respondedAt: null },
    data: {
      status,
      comment: comment || null,
      respondedAt: new Date(),
    },
  })

  if (result.count === 0) {
    throw new Error('Фоллоу-ап не найден или уже заполнен')
  }
}
