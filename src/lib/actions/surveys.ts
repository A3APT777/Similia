'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { uuidSchema } from '@/lib/shared/validation'
import type { PreVisitSurvey } from '@/types'

// Создать опросник для пациента (вызывает врач)
export async function createPreVisitSurvey(
  patientId: string,
  consultationId?: string
): Promise<{ token: string }> {
  uuidSchema.parse(patientId)
  if (consultationId) uuidSchema.parse(consultationId)
  const { userId } = await requireAuth()

  try {
    const survey = await prisma.preVisitSurvey.create({
      data: {
        patientId,
        doctorId: userId,
        consultationId: consultationId || null,
      },
      select: { token: true },
    })

    return { token: survey.token }
  } catch {
    throw new Error('Не удалось создать опросник')
  }
}

// Загрузить опросник по токену (публичная, для пациента)
export async function getPreVisitSurveyByToken(token: string): Promise<PreVisitSurvey | null> {
  // Публичная операция — prisma напрямую
  const data = await prisma.preVisitSurvey.findUnique({
    where: { token },
  })

  if (!data) return null
  return data as unknown as PreVisitSurvey
}

// Отправить ответы (публичная, вызывает пациент)
export async function submitPreVisitSurvey(
  token: string,
  answers: Record<string, unknown>
): Promise<void> {
  // Валидация размера ответов (макс 100KB)
  const answersStr = JSON.stringify(answers)
  if (answersStr.length > 100000) {
    throw new Error('Ответы слишком большие')
  }

  // Публичная операция — prisma напрямую
  // Проверяем что опросник существует и не просрочен
  const survey = await prisma.preVisitSurvey.findUnique({
    where: { token },
    select: { id: true, status: true, expiresAt: true },
  })

  if (!survey) {
    throw new Error('Опросник не найден')
  }

  if (survey.status === 'completed') {
    throw new Error('Опросник уже заполнен')
  }

  if (survey.expiresAt && new Date(survey.expiresAt) < new Date()) {
    throw new Error('Срок действия опросника истёк')
  }

  try {
    await prisma.preVisitSurvey.update({
      where: { id: survey.id },
      data: {
        answers,
        status: 'completed',
        completedAt: new Date(),
      },
    })
  } catch {
    throw new Error('Не удалось сохранить ответы')
  }
}

// Загрузить опросник по consultationId (для правой панели)
export async function getPreVisitSurveyByConsultation(
  consultationId: string
): Promise<PreVisitSurvey | null> {
  const { userId } = await requireAuth()

  try {
    const data = await prisma.preVisitSurvey.findFirst({
      where: {
        consultationId,
        doctorId: userId,
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
    })

    return data as unknown as PreVisitSurvey | null
  } catch {
    return null
  }
}

// Загрузить последний опросник пациента (для карточки)
export async function getLatestPatientSurvey(
  patientId: string
): Promise<PreVisitSurvey | null> {
  const { userId } = await requireAuth()

  try {
    const data = await prisma.preVisitSurvey.findFirst({
      where: {
        patientId,
        doctorId: userId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return data as unknown as PreVisitSurvey | null
  } catch {
    return null
  }
}
