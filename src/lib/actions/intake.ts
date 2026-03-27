'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, generateToken } from '@/lib/server-utils'
import { redirect } from 'next/navigation'
import { IntakeAnswers, IntakeType } from '@/types'
import { intakeAnswersSchema, uuidSchema } from '@/lib/validation'
import { z } from 'zod'

// Создать ссылку-анкету (для нового пациента — без patientId)
export async function createIntakeLink(type: IntakeType = 'primary'): Promise<string> {
  const { userId } = await requireAuth()

  const token = generateToken()

  // Ссылка действительна 24 часа
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.intakeForm.create({
    data: {
      token,
      doctorId: userId,
      type,
      status: 'pending',
      expiresAt,
    },
  })

  return token
}

// Создать ссылку-анкету для существующего пациента — данные будут предзаполнены
export async function createIntakeLinkForPatient(patientId: string, type: IntakeType = 'primary'): Promise<string> {
  const { userId } = await requireAuth()

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true, name: true, phone: true, birthDate: true, email: true },
  })

  if (!patient) redirect('/dashboard')

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.intakeForm.create({
    data: {
      token,
      doctorId: userId,
      patientId,
      patientName: patient.name,
      type,
      status: 'pending',
      expiresAt,
    },
  })

  return token
}

// Пациент отправляет заполненную анкету — создаём нового пациента автоматически
export async function submitIntake(token: string, answers: IntakeAnswers): Promise<void> {
  z.string().min(1, 'Токен обязателен').parse(token)
  intakeAnswersSchema.parse(answers)

  // Транзакция предотвращает race condition при двойном submit
  await prisma.$transaction(async (tx) => {
    // Получаем анкету с проверкой срока и статуса
    const intake = await tx.intakeForm.findUnique({
      where: { token },
      select: { doctorId: true, patientId: true, status: true, expiresAt: true },
    })

    if (!intake) throw new Error('Анкета не найдена')
    if (intake.status !== 'pending') throw new Error('Анкета уже заполнена')
    if (intake.expiresAt && new Date(intake.expiresAt) < new Date()) throw new Error('Срок действия анкеты истёк')

    let patientId = intake.patientId

    // Если пациент ещё не привязан — создаём новую карточку из данных анкеты
    // Проверка лимита пациентов врача
    if (!patientId && answers.patient_name?.trim()) {
      const patientCount = await tx.patient.count({ where: { doctorId: intake.doctorId, isDemo: false } })
      const sub = await tx.subscription.findUnique({ where: { doctorId: intake.doctorId }, include: { plan: true } })
      const maxPatients = sub?.plan?.maxPatients ?? 5
      if (maxPatients !== null && patientCount >= maxPatients) {
        throw new Error('Лимит пациентов врача достигнут')
      }
      try {
        const newPatient = await tx.patient.create({
          data: {
            doctorId: intake.doctorId,
            name: answers.patient_name.trim(),
            phone: answers.patient_phone?.trim() || null,
            email: answers.patient_email?.trim() || null,
            birthDate: answers.patient_birth_date?.trim() || null,
            firstVisitDate: new Date().toISOString().split('T')[0],
          },
          select: { id: true },
        })
        patientId = newPatient.id
      } catch {
        throw new Error('Не удалось создать карточку пациента')
      }
    }

    try {
      await tx.intakeForm.update({
        where: { token, status: 'pending' },
        data: {
          status: 'completed',
          answers: answers as Record<string, unknown>,
          patientId,
          patientName: answers.patient_name?.trim() || null,
          completedAt: new Date(),
        },
      })
    } catch {
      throw new Error('Не удалось сохранить анкету')
    }
  })
}

// Врач заполняет/редактирует анкету напрямую (без токена)
export async function submitDoctorIntake(patientId: string, type: IntakeType, answers: IntakeAnswers): Promise<void> {
  uuidSchema.parse(patientId)
  intakeAnswersSchema.parse(answers)
  const { userId } = await requireAuth()

  // Убеждаемся что пациент принадлежит врачу
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true },
  })

  if (!patient) return

  // Ищем существующую анкету для обновления
  const existing = await prisma.intakeForm.findFirst({
    where: { patientId, type, status: 'completed' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    try {
      await prisma.intakeForm.update({
        where: { id: existing.id },
        data: { answers: answers as Record<string, unknown>, completedAt: new Date() },
      })
    } catch {
      throw new Error('Не удалось сохранить анкету')
    }
  } else {
    try {
      await prisma.intakeForm.create({
        data: {
          token: generateToken(),
          doctorId: userId,
          patientId,
          type,
          status: 'completed',
          answers: answers as Record<string, unknown>,
          completedAt: new Date(),
        },
      })
    } catch {
      throw new Error('Не удалось создать анкету')
    }
  }
}

// Пациент записывается на приём после заполнения анкеты (без авторизации)
const bookingSchema = z.object({
  token: z.string().min(10).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function bookIntakeAppointment(
  token: string,
  date: string,
  time: string,
): Promise<{ success: boolean; error?: string; appointmentDate?: string }> {
  const parsed = bookingSchema.safeParse({ token, date, time })
  if (!parsed.success) return { success: false, error: 'Некорректные данные' }

  // Публичная операция — prisma напрямую (без RLS)
  const intake = await prisma.intakeForm.findUnique({
    where: { token: parsed.data.token },
    select: { doctorId: true, patientId: true },
  })

  if (!intake?.patientId) return { success: false, error: 'Анкета не найдена' }

  const scheduledAt = new Date(`${parsed.data.date}T${parsed.data.time}:00`)

  try {
    await prisma.consultation.create({
      data: {
        doctorId: intake.doctorId,
        patientId: intake.patientId,
        scheduledAt,
        status: 'scheduled',
        source: 'online',
      },
    })
  } catch {
    return { success: false, error: 'Ошибка записи на приём' }
  }

  const dateFormatted = scheduledAt.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return { success: true, appointmentDate: `${dateFormatted} в ${time}` }
}

// Пометить анкету как просмотренную врачом
export async function markIntakeViewed(intakeId: string): Promise<void> {
  uuidSchema.parse(intakeId)
  const { userId } = await requireAuth()

  await prisma.intakeForm.updateMany({
    where: { id: intakeId, doctorId: userId, viewedAt: null },
    data: { viewedAt: new Date() },
  })
}
