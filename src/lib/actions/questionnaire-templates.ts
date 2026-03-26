'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { redirect } from 'next/navigation'
import { z } from 'zod'

export type FieldType = 'text' | 'textarea' | 'select' | 'scale' | 'chips'
export type TemplateType = 'primary' | 'acute' | 'pre_visit'

export type TemplateField = {
  id: string
  label: string
  hint?: string
  type: FieldType
  required: boolean
  options?: string[] // для select/chips
  scaleMin?: number  // для scale
  scaleMax?: number
}

const fieldSchema = z.object({
  id: z.string().min(1).max(50),
  label: z.string().min(1).max(200),
  hint: z.string().max(500).optional(),
  type: z.enum(['text', 'textarea', 'select', 'scale', 'chips']),
  required: z.boolean(),
  options: z.array(z.string().max(100)).max(20).optional(),
  scaleMin: z.number().int().min(0).max(100).optional(),
  scaleMax: z.number().int().min(1).max(100).optional(),
})

const templateSchema = z.object({
  type: z.enum(['primary', 'acute', 'pre_visit']),
  fields: z.array(fieldSchema).min(1).max(50),
})

// Получить шаблон врача (или null если использует дефолт)
export async function getQuestionnaireTemplate(type: TemplateType): Promise<TemplateField[] | null> {
  const { userId } = await requireAuth()

  const data = await prisma.questionnaireTemplate.findUnique({
    where: { doctorId_type: { doctorId: userId, type } },
    select: { fields: true },
  })

  if (!data) return null
  return data.fields as TemplateField[]
}

// Получить шаблон по doctor_id (для публичных форм)
export async function getTemplateByDoctorId(doctorId: string, type: TemplateType): Promise<TemplateField[] | null> {
  const data = await prisma.questionnaireTemplate.findUnique({
    where: { doctorId_type: { doctorId, type } },
    select: { fields: true },
  })

  if (!data) return null
  return data.fields as TemplateField[]
}

// Сохранить шаблон
export async function saveQuestionnaireTemplate(type: TemplateType, fields: TemplateField[]): Promise<{ success: boolean; error?: string }> {
  const { userId } = await requireAuth()

  try {
    templateSchema.parse({ type, fields })
  } catch {
    return { success: false, error: 'Некорректные данные шаблона' }
  }

  try {
    await prisma.questionnaireTemplate.upsert({
      where: { doctorId_type: { doctorId: userId, type } },
      update: {
        fields: JSON.parse(JSON.stringify(fields)),
      },
      create: {
        doctorId: userId,
        type,
        fields: JSON.parse(JSON.stringify(fields)),
      },
    })
  } catch (error) {
    console.error('[saveQuestionnaireTemplate]', error)
    return { success: false, error: 'Ошибка сохранения' }
  }

  return { success: true }
}

// Сбросить к дефолту
export async function resetQuestionnaireTemplate(type: TemplateType): Promise<{ success: boolean }> {
  const { userId } = await requireAuth()

  await prisma.questionnaireTemplate.deleteMany({
    where: { doctorId: userId, type },
  })

  return { success: true }
}

// Получить все 3 шаблона для страницы настроек
export async function getAllTemplates(): Promise<Record<TemplateType, TemplateField[] | null>> {
  const { userId } = await requireAuth()

  const data = await prisma.questionnaireTemplate.findMany({
    where: { doctorId: userId },
    select: { type: true, fields: true },
  })

  const result: Record<TemplateType, TemplateField[] | null> = {
    primary: null,
    acute: null,
    pre_visit: null,
  }

  for (const row of data) {
    result[row.type as TemplateType] = row.fields as TemplateField[]
  }

  return result
}
