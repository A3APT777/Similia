'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, generateToken } from '@/lib/server-utils'
import { revalidatePath } from 'next/cache'
import { newPatientBookingSchema, validate, uuidSchema } from '@/lib/shared/validation'

// Врач создаёт токен для записи нового пациента
export async function createNewPatientToken(): Promise<string> {
  const { userId } = await requireAuth()

  const token = generateToken()

  await prisma.newPatientToken.create({
    data: {
      doctorId: userId,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return token
}

// Ссылка для записи существующего пациента (только календарь, без анкеты)
export async function createBookingLinkForPatient(patientId: string): Promise<string> {
  uuidSchema.parse(patientId)
  const { userId } = await requireAuth()

  // Проверяем что пациент принадлежит врачу
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true },
  })
  if (!patient) throw new Error('Patient not found')

  const token = generateToken()

  await prisma.newPatientToken.create({
    data: {
      doctorId: userId,
      patientId,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return token
}

// Получить инфо о токене (публично, без авторизации)
export async function getNewPatientToken(token: string) {
  // Публичная операция — prisma напрямую
  const data = await prisma.newPatientToken.findUnique({
    where: { token },
    select: { doctorId: true, expiresAt: true, used: true, patientId: true },
  })
  return data
}

// Получить расписание врача (публично)
export async function getDoctorSchedule(doctorId: string) {
  // Публичная операция — prisma напрямую
  const data = await prisma.doctorSchedule.findFirst({
    where: { doctorId },
  })
  return data
}

// Получить занятые слоты для даты (публично)
export async function getBookedSlots(doctorId: string, date: string): Promise<string[]> {
  // Публичная операция — prisma напрямую
  const data = await prisma.consultation.findMany({
    where: {
      doctorId,
      scheduledAt: {
        gte: new Date(`${date}T00:00:00`),
        lt: new Date(`${date}T23:59:59`),
      },
      status: { not: 'cancelled' },
    },
    select: { scheduledAt: true },
  })

  return data
    .filter(a => a.scheduledAt !== null)
    .map(a => {
      const d = new Date(a.scheduledAt!)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })
}

// Сохранить запись нового пациента (публично, пациент без авторизации)
export async function submitNewPatientBooking(
  token: string,
  formData: {
    name: string
    birth_date?: string
    phone: string
    email?: string
    complaints: string
    duration: string
    previous_treatment?: string
    allergies?: string
    medications: string
    medications_list?: string
    date: string
    time: string
  }
): Promise<{ success: boolean; error?: string; appointmentDate?: string }> {
  const validationResult = validate(newPatientBookingSchema, formData)
  if (validationResult.error) return { success: false, error: validationResult.error }
  const validatedData = validationResult.data!

  // Публичная операция — prisma напрямую

  // Проверяем токен
  const tokenData = await prisma.newPatientToken.findUnique({
    where: { token },
    select: { doctorId: true, expiresAt: true, used: true },
  })

  if (!tokenData) return { success: false, error: 'Ссылка недействительна' }
  if (tokenData.used) return { success: false, error: 'Ссылка уже была использована' }
  if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) return { success: false, error: 'Срок действия ссылки истёк' }

  // Проверка лимита пациентов врача
  const patientCount = await prisma.patient.count({ where: { doctorId: tokenData.doctorId, isDemo: false } })
  const sub = await prisma.subscription.findUnique({ where: { doctorId: tokenData.doctorId }, include: { plan: true } })
  const maxPatients = sub?.plan?.maxPatients ?? 5
  if (maxPatients !== null && patientCount >= maxPatients) {
    return { success: false, error: 'К сожалению, врач не может принять больше пациентов на текущем тарифе' }
  }

  // Проверка конфликтов — нет ли записи на это время
  const scheduledAt = new Date(`${validatedData.date}T${validatedData.time}:00`)
  const dayStart = new Date(`${validatedData.date}T00:00:00`)
  const dayEnd = new Date(`${validatedData.date}T23:59:59`)

  const existingAppointments = await prisma.consultation.findMany({
    where: {
      doctorId: tokenData.doctorId,
      status: { not: 'cancelled' },
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
    select: { scheduledAt: true },
  })

  const selectedMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes()
  const hasConflict = existingAppointments.some(a => {
    if (!a.scheduledAt) return false
    const existing = new Date(a.scheduledAt)
    const existingMin = existing.getHours() * 60 + existing.getMinutes()
    return Math.abs(existingMin - selectedMinutes) < 60
  })

  if (hasConflict) {
    return { success: false, error: 'Это время уже занято. Выберите другое.' }
  }

  // Всё в одной транзакции — пациент + консультация + анкета + токен
  let patient
  try {
    patient = await prisma.$transaction(async (tx) => {
      // Создаём пациента
      const p = await tx.patient.create({
        data: {
          doctorId: tokenData.doctorId,
          name: validatedData.name,
          birthDate: validatedData.birth_date || null,
          phone: validatedData.phone,
          email: validatedData.email || null,
          firstVisitDate: new Date().toISOString().split('T')[0],
        },
      })

      // Создаём консультацию
      await tx.consultation.create({
        data: {
          doctorId: tokenData.doctorId,
          patientId: p.id,
          scheduledAt,
          status: 'scheduled',
          source: 'online',
        },
      })

      // Сохраняем анкету
      const intakeData = {
        complaints: validatedData.complaints,
        duration: validatedData.duration,
        previous_treatment: validatedData.previous_treatment || '',
        allergies: validatedData.allergies || '',
        medications: validatedData.medications,
        medications_list: validatedData.medications === 'yes' ? (validatedData.medications_list || '') : '',
      }

      await tx.intakeForm.create({
        data: {
          doctorId: tokenData.doctorId,
          patientId: p.id,
          patientName: validatedData.name,
          type: 'primary',
          status: 'completed',
          answers: intakeData,
          token: generateToken(),
        },
      })

      // Помечаем токен как использованный
      await tx.newPatientToken.update({
        where: { token },
        data: { used: true },
      })

      return p
    })
  } catch {
    return { success: false, error: 'Ошибка записи. Попробуйте ещё раз.' }
  }

  revalidatePath('/dashboard')

  const dateFormatted = new Date(`${validatedData.date}T${validatedData.time}:00`).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return { success: true, appointmentDate: `${dateFormatted} в ${validatedData.time}` }
}

// Запись существующего пациента по ссылке (без создания анкеты)
export async function bookExistingPatient(
  token: string,
  date: string,
  time: string,
): Promise<{ success: boolean; error?: string; appointmentDate?: string }> {
  // Публичная операция — prisma напрямую

  // Проверяем токен
  const tokenData = await prisma.newPatientToken.findUnique({
    where: { token },
    select: { doctorId: true, expiresAt: true, used: true, patientId: true },
  })

  if (!tokenData) return { success: false, error: 'Ссылка недействительна' }
  if (tokenData.used) return { success: false, error: 'Ссылка уже использована' }
  if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) return { success: false, error: 'Срок действия истёк' }
  if (!tokenData.patientId) return { success: false, error: 'Некорректная ссылка' }

  // Проверка конфликтов
  const scheduledAt = new Date(`${date}T${time}:00`)
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  const existing = await prisma.consultation.findMany({
    where: {
      doctorId: tokenData.doctorId,
      status: { not: 'cancelled' },
      scheduledAt: { gte: dayStart, lte: dayEnd },
    },
    select: { scheduledAt: true },
  })

  const selectedMin = scheduledAt.getHours() * 60 + scheduledAt.getMinutes()
  const hasConflict = existing.some(a => {
    if (!a.scheduledAt) return false
    const ex = new Date(a.scheduledAt)
    return Math.abs((ex.getHours() * 60 + ex.getMinutes()) - selectedMin) < 60
  })

  if (hasConflict) return { success: false, error: 'Это время уже занято. Выберите другое.' }

  // Создаём консультацию
  try {
    await prisma.consultation.create({
      data: {
        doctorId: tokenData.doctorId,
        patientId: tokenData.patientId,
        scheduledAt,
        status: 'scheduled',
        source: 'online',
      },
    })
  } catch {
    return { success: false, error: 'Ошибка записи. Попробуйте ещё раз.' }
  }

  // Помечаем токен
  await prisma.newPatientToken.update({
    where: { token },
    data: { used: true },
  })

  revalidatePath('/dashboard')

  const dateFormatted = new Date(`${date}T${time}:00`).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return { success: true, appointmentDate: `${dateFormatted} в ${time}` }
}
