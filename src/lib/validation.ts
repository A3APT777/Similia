import { z } from 'zod'

// Схемы валидации для Server Actions

export const patientSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(200, 'Имя слишком длинное').trim(),
  birth_date: z.string().optional().nullable(),
  phone: z.string().max(20, 'Телефон слишком длинный').optional().nullable(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')).nullable(),
  notes: z.string().max(2000, 'Заметки слишком длинные').optional().nullable(),
  constitutional_type: z.string().max(200).optional().nullable(),
})

export const newPatientBookingSchema = z.object({
  name: z.string().min(2, 'Введите имя').max(200).trim(),
  birth_date: z.string().optional(),
  phone: z.string().min(7, 'Введите номер телефона').max(20),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  complaints: z.string().min(5, 'Опишите жалобы подробнее').max(5000).trim(),
  duration: z.enum(['less_month', '1_6_months', '6_12_months', 'more_year', 'long_time'], {
    message: 'Выберите продолжительность',
  }),
  previous_treatment: z.string().max(2000).optional(),
  allergies: z.string().max(1000).optional(),
  medications: z.enum(['yes', 'no']),
  medications_list: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Неверный формат даты'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
})

export const prescriptionSchema = z.object({
  remedy: z.string().max(200).optional(),
  potency: z.string().max(50).optional(),
  pellets: z.number().int().min(0).max(100).nullable(),
  dosage: z.string().max(500).optional(),
})

// Утилита — возвращает ошибку или null
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { data: T; error: null } | { data: null; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    return { data: null, error: first?.message || 'Ошибка валидации' }
  }
  return { data: result.data, error: null }
}
