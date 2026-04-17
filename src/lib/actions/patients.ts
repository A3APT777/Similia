'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { patientSchema, validate } from '@/lib/shared/validation'
import { checkPatientLimit } from './subscription'

export async function createPatient(formData: FormData) {
  const { userId } = await requireAuth()

  // Проверка лимита подписки
  const limit = await checkPatientLimit()
  if (!limit.allowed) {
    throw new Error(`Лимит бесплатного тарифа: ${limit.max} пациентов. Перейдите на Стандарт для безлимита.`)
  }

  const raw = {
    name: (formData.get('name') as string) || '',
    birth_date: (formData.get('birth_date') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    notes: (formData.get('notes') as string) || null,
    constitutional_type: (formData.get('constitutional_type') as string) || null,
    gender: (formData.get('gender') as string) || null,
  }

  const validationResult = validate(patientSchema, raw)
  if (validationResult.error) throw new Error(validationResult.error)
  const validated = validationResult.data!

  const patient = await prisma.patient.create({
    data: {
      doctorId: userId,
      name: validated.name,
      birthDate: validated.birth_date,
      phone: validated.phone,
      email: validated.email,
      notes: validated.notes,
      constitutionalType: validated.constitutional_type,
      gender: validated.gender,
      firstVisitDate: new Date().toISOString().split('T')[0],
    },
  })

  redirect(`/patients/${patient.id}`)
}

export async function updatePatient(id: string, formData: FormData) {
  const { userId } = await requireAuth()

  const raw = {
    name: (formData.get('name') as string) || '',
    birth_date: (formData.get('birth_date') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    notes: (formData.get('notes') as string) || null,
    constitutional_type: (formData.get('constitutional_type') as string) || null,
    gender: (formData.get('gender') as string) || null,
  }

  const validationResult = validate(patientSchema, raw)
  if (validationResult.error) throw new Error(validationResult.error)
  const validated = validationResult.data!

  await prisma.patient.updateMany({
    where: { id, doctorId: userId },
    data: {
      name: validated.name,
      birthDate: validated.birth_date,
      phone: validated.phone,
      email: validated.email,
      notes: validated.notes,
      constitutionalType: validated.constitutional_type,
      gender: validated.gender,
    },
  })

  revalidatePath(`/patients/${id}`)
  redirect(`/patients/${id}`)
}

export async function deletePatient(id: string): Promise<void> {
  const { userId } = await requireAuth()

  // Каскадное удаление — Prisma schema имеет onDelete: Cascade на всех связях
  const deleted = await prisma.patient.deleteMany({
    where: { id, doctorId: userId },
  })

  if (deleted.count === 0) {
    throw new Error('Пациент не найден или нет доступа')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
