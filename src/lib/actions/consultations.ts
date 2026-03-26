'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ConsultationType } from '@/types'
import { uuidSchema, consultationTypeSchema, isoDateTimeSchema } from '@/lib/validation'
import { z } from 'zod'

// Закрыть все открытые консультации врача (перед началом новой)
// Правило: у врача одновременно может быть активным только один приём
async function closeOpenConsultations(doctorId: string) {
  await prisma.consultation.updateMany({
    where: { doctorId, status: 'in_progress' },
    data: { status: 'completed' },
  })
}

// Создать консультацию прямо сейчас и открыть редактор
export async function createConsultation(patientId: string, type: ConsultationType = 'chronic') {
  uuidSchema.parse(patientId)
  consultationTypeSchema.parse(type)
  const { userId } = await requireAuth()

  // Проверяем, что пациент принадлежит текущему врачу
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true },
  })
  if (!patient) throw new Error('Пациент не найден или нет доступа')

  // Закрываем любые открытые консультации врача (один приём за раз)
  await closeOpenConsultations(userId)

  const data = await prisma.consultation.create({
    data: {
      patientId,
      doctorId: userId,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'in_progress',
      type,
    },
  })

  redirect(`/patients/${patientId}/consultations/${data.id}`)
}

// Создать консультацию для AI-анализа (без redirect, возвращает ID)
export async function createAIConsultation(
  patientId: string,
  type: ConsultationType = 'chronic',
  notes: string = '',
): Promise<string> {
  uuidSchema.parse(patientId)
  consultationTypeSchema.parse(type)
  const { userId } = await requireAuth()

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true },
  })
  if (!patient) throw new Error('Пациент не найден или нет доступа')

  const data = await prisma.consultation.create({
    data: {
      patientId,
      doctorId: userId,
      notes,
      status: 'in_progress',
      type,
      source: 'ai',
    },
    select: { id: true },
  })

  return data.id
}

// Запланировать приём на конкретную дату и время (scheduledAt — ISO UTC строка)
export async function scheduleConsultation(
  patientId: string,
  scheduledAt: string,
  type: ConsultationType = 'chronic'
): Promise<void> {
  uuidSchema.parse(patientId)
  isoDateTimeSchema.parse(scheduledAt)
  consultationTypeSchema.parse(type)
  const { userId } = await requireAuth()

  // Проверяем, что пациент принадлежит текущему врачу
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true },
  })
  if (!patient) throw new Error('Пациент не найден или нет доступа')

  const date = scheduledAt.split('T')[0]

  await prisma.consultation.create({
    data: {
      patientId,
      doctorId: userId,
      notes: '',
      date,
      scheduledAt: new Date(scheduledAt),
      status: 'scheduled',
      type,
    },
  })
}

// Изменить тип консультации
export async function updateConsultationType(id: string, type: ConsultationType): Promise<void> {
  uuidSchema.parse(id)
  consultationTypeSchema.parse(type)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: { type },
    })
  } catch (error) {
    console.error('[updateConsultationType]', error)
    throw new Error('Не удалось обновить тип')
  }
}

// Получить все запланированные приёмы за конкретный день (для проверки конфликтов)
export async function getAppointmentsForDay(dayStart: string, dayEnd: string): Promise<string[]> {
  const { userId } = await requireAuth()

  try {
    const data = await prisma.consultation.findMany({
      where: {
        doctorId: userId,
        status: { not: 'cancelled' },
        scheduledAt: {
          gte: new Date(dayStart),
          lte: new Date(dayEnd),
        },
      },
      select: { scheduledAt: true },
    })

    return data
      .map(c => c.scheduledAt?.toISOString())
      .filter((v): v is string => Boolean(v))
  } catch (error) {
    console.error('[getAppointmentsForDay]', error)
    return []
  }
}

// Начать запланированный приём — меняет статус и открывает редактор
export async function startConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  // Закрываем любые открытые консультации врача (один приём за раз)
  await closeOpenConsultations(userId)

  try {
    await prisma.consultation.updateMany({
      where: { id: consultationId, doctorId: userId },
      data: { status: 'in_progress' },
    })
  } catch (error) {
    console.error('[startConsultation]', error)
    throw new Error('Не удалось начать приём')
  }

  redirect(`/patients/${patientId}/consultations/${consultationId}`)
}

// Отменить запланированный приём
export async function cancelConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id: consultationId, doctorId: userId },
      data: { status: 'cancelled' },
    })
  } catch (error) {
    console.error('[cancelConsultation]', error)
    throw new Error('Не удалось отменить приём')
  }

  revalidatePath('/dashboard')
  redirect(`/patients/${patientId}`)
}

// Удалить консультацию (только пустые или отменённые)
export async function deleteConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  // Проверяем что консультация принадлежит врачу
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, doctorId: userId },
    select: { status: true, notes: true, remedy: true },
  })

  if (!consultation) {
    throw new Error('Консультация не найдена')
  }

  // Разрешаем удаление только пустых/отменённых — не удалять завершённые с данными
  const hasData = consultation.notes || consultation.remedy
  if (consultation.status === 'completed' && hasData) {
    throw new Error('Нельзя удалить завершённую консультацию с данными. Используйте отмену.')
  }

  await prisma.consultation.deleteMany({
    where: { id: consultationId, doctorId: userId },
  })

  revalidatePath(`/patients/${patientId}`)
  redirect(`/patients/${patientId}`)
}

// Автосохранение заметок
export async function updateConsultationNotes(id: string, notes: string) {
  uuidSchema.parse(id)
  z.string().max(50000, 'Заметки слишком длинные').parse(notes)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: {
        notes,
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[updateConsultationNotes]', error)
    throw new Error('Не удалось сохранить заметки')
  }
}

// Получить все приёмы за конкретный месяц (для календаря)
export async function getAppointmentsByMonth(year: number, month: number) {
  const { userId } = await requireAuth()

  const MSK = 3 * 60 * 60 * 1000
  const lastDay = new Date(year, month, 0).getDate()
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - MSK)
  const monthEnd = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59) - MSK)

  const data = await prisma.consultation.findMany({
    where: {
      doctorId: userId,
      scheduledAt: {
        not: null,
        gte: monthStart,
        lte: monthEnd,
      },
      status: { not: 'cancelled' },
    },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      type: true,
      patientId: true,
      patient: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return data.map(c => ({
    id: c.id,
    scheduled_at: c.scheduledAt?.toISOString() ?? '',
    status: c.status,
    type: c.type as ConsultationType,
    patient_id: c.patientId,
    patients: c.patient ? { id: c.patient.id, name: c.patient.name } : null,
  }))
}

// Сохранить назначение после консультации
export async function savePrescription(
  id: string,
  remedy: string,
  potency: string,
  pellets: number | null,
  dosage: string
): Promise<void> {
  uuidSchema.parse(id)
  z.string().max(200).parse(remedy)
  z.string().max(50).parse(potency)
  z.number().int().min(0).max(100).nullable().parse(pellets)
  z.string().max(500).parse(dosage)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: {
        remedy: remedy || null,
        potency: potency || null,
        pellets,
        dosage: dosage || null,
      },
    })
  } catch (error) {
    console.error('[savePrescription]', error)
    throw new Error('Не удалось сохранить назначение')
  }
}

// Сохранить рубрики и реакцию на предыдущий препарат
export async function updateConsultationExtra(
  id: string,
  rubrics: string,
  reactionToPrevious: string
): Promise<void> {
  uuidSchema.parse(id)
  z.string().max(5000).parse(rubrics)
  z.string().max(2000).parse(reactionToPrevious)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: {
        rubrics: rubrics || null,
        reactionToPrevious: reactionToPrevious || null,
      },
    })
  } catch (error) {
    console.error('[updateConsultationExtra]', error)
    throw new Error('Не удалось сохранить')
  }
}

// Сохранить структурированные поля приёма
const consultationFieldsSchema = z.object({
  complaints: z.string().max(50000).optional(),
  observations: z.string().max(50000).optional(),
  recommendations: z.string().max(10000).optional(),
  repertory_data: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  structured_symptoms: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
  mode: z.string().max(20).optional(),
  case_state: z.string().max(30).nullable().optional(),
  clinical_assessment: z.record(z.string(), z.unknown()).nullable().optional(),
  modality_worse_text: z.string().max(10000).optional(),
  modality_better_text: z.string().max(10000).optional(),
  mental_text: z.string().max(10000).optional(),
  general_text: z.string().max(10000).optional(),
})

export async function updateConsultationFields(
  id: string,
  fields: z.infer<typeof consultationFieldsSchema>
): Promise<void> {
  uuidSchema.parse(id)
  const parsed = consultationFieldsSchema.parse(fields)
  const { userId } = await requireAuth()

  // Маппинг snake_case → camelCase для Prisma
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.complaints !== undefined) update.complaints = parsed.complaints
  if (parsed.observations !== undefined) update.observations = parsed.observations
  if (parsed.recommendations !== undefined) update.recommendations = parsed.recommendations
  if (parsed.repertory_data !== undefined) update.repertoryData = parsed.repertory_data
  if (parsed.structured_symptoms !== undefined) update.structuredSymptoms = parsed.structured_symptoms
  if (parsed.mode !== undefined) update.mode = parsed.mode
  if (parsed.case_state !== undefined) update.caseState = parsed.case_state
  if (parsed.clinical_assessment !== undefined) update.clinicalAssessment = parsed.clinical_assessment ? JSON.stringify(parsed.clinical_assessment) : null
  if (parsed.modality_worse_text !== undefined) update.modalityWorseText = parsed.modality_worse_text
  if (parsed.modality_better_text !== undefined) update.modalityBetterText = parsed.modality_better_text
  if (parsed.mental_text !== undefined) update.mentalText = parsed.mental_text
  if (parsed.general_text !== undefined) update.generalText = parsed.general_text

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: update,
    })
  } catch (error) {
    console.error('[updateConsultationFields]', error)
    throw new Error('Не удалось сохранить поля')
  }
}

// Единый автосохранение — все поля одним запросом (вместо 3 параллельных)
const consultationAllSchema = z.object({
  notes: z.string().max(50000).optional(),
  complaints: z.string().max(50000).optional(),
  observations: z.string().max(50000).optional(),
  recommendations: z.string().max(10000).optional(),
  structured_symptoms: z.any().optional(),
  mode: z.string().max(20).nullable().optional(),
  case_state: z.string().max(30).nullable().optional(),
  clinical_assessment: z.any().nullable().optional(),
  modality_worse_text: z.string().max(10000).optional(),
  modality_better_text: z.string().max(10000).optional(),
  mental_text: z.string().max(10000).optional(),
  general_text: z.string().max(10000).optional(),
  rubrics: z.string().max(5000).optional(),
  reaction_to_previous: z.string().max(2000).optional(),
})

export async function updateConsultationAll(
  id: string,
  fields: z.infer<typeof consultationAllSchema>
): Promise<void> {
  uuidSchema.parse(id)
  const parsed = consultationAllSchema.parse(fields)
  const { userId } = await requireAuth()

  // Маппинг snake_case → camelCase для Prisma
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.notes !== undefined) update.notes = parsed.notes
  if (parsed.complaints !== undefined) update.complaints = parsed.complaints
  if (parsed.observations !== undefined) update.observations = parsed.observations
  if (parsed.recommendations !== undefined) update.recommendations = parsed.recommendations
  if (parsed.structured_symptoms !== undefined) update.structuredSymptoms = parsed.structured_symptoms
  if (parsed.mode !== undefined) update.mode = parsed.mode
  if (parsed.case_state !== undefined) update.caseState = parsed.case_state
  if (parsed.clinical_assessment !== undefined) update.clinicalAssessment = parsed.clinical_assessment ? JSON.stringify(parsed.clinical_assessment) : null
  if (parsed.modality_worse_text !== undefined) update.modalityWorseText = parsed.modality_worse_text
  if (parsed.modality_better_text !== undefined) update.modalityBetterText = parsed.modality_better_text
  if (parsed.mental_text !== undefined) update.mentalText = parsed.mental_text
  if (parsed.general_text !== undefined) update.generalText = parsed.general_text
  if (parsed.rubrics !== undefined) update.rubrics = parsed.rubrics || null
  if (parsed.reaction_to_previous !== undefined) update.reactionToPrevious = parsed.reaction_to_previous || null

  try {
    const result = await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: update,
    })
    if (result.count === 0) {
      console.error('[updateConsultationAll] 0 rows updated — consultation not found or wrong doctorId', { id, userId })
    }
  } catch (error) {
    console.error('[updateConsultationAll] FAILED:', error, { id, userId, updateKeys: Object.keys(update) })
    throw new Error('Не удалось сохранить данные консультации')
  }
}

// Сохранить оценку динамики врачом
export async function saveDoctorDynamics(id: string, dynamics: string): Promise<void> {
  uuidSchema.parse(id)
  z.string().max(100).parse(dynamics)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: { doctorDynamics: dynamics, updatedAt: new Date() },
    })
  } catch (error) {
    console.error('[saveDoctorDynamics]', error)
    throw new Error('Не удалось сохранить динамику')
  }
}

// Явно завершить консультацию (независимо от заполненности notes)
export async function completeConsultation(id: string): Promise<void> {
  uuidSchema.parse(id)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id, doctorId: userId },
      data: { status: 'completed', updatedAt: new Date() },
    })
  } catch (error) {
    console.error('[completeConsultation]', error)
    throw new Error('Не удалось завершить приём')
  }

  revalidatePath('/dashboard')
}

// Сохранить данные реперториума
export async function saveRepertoryData(
  consultationId: string,
  data: { rubricId: number; fullpath: string; fullpath_ru?: string | null; weight: 1 | 2 | 3; eliminate?: boolean }[]
): Promise<void> {
  uuidSchema.parse(consultationId)
  const { userId } = await requireAuth()

  try {
    await prisma.consultation.updateMany({
      where: { id: consultationId, doctorId: userId },
      data: { repertoryData: data as any, updatedAt: new Date() },
    })
  } catch (error) {
    console.error('[saveRepertoryData]', error)
    throw new Error('Не удалось сохранить данные реперториума')
  }
}
