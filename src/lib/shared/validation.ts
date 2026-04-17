import { z } from 'zod'

// Схемы валидации для Server Actions

export const patientSchema = z.object({
  name: z.string().trim().min(2, 'Имя должно содержать минимум 2 символа').max(200, 'Имя слишком длинное'),
  birth_date: z.string().optional().nullable(),
  phone: z.string().max(20, 'Телефон слишком длинный').trim().optional().nullable(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')).nullable(),
  notes: z.string().max(2000, 'Заметки слишком длинные').optional().nullable(),
  constitutional_type: z.string().max(200).trim().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
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

// === Общие схемы ===

export const uuidSchema = z.string().uuid('Неверный формат ID')

export const consultationTypeSchema = z.enum(['chronic', 'acute'], {
  message: 'Тип консультации должен быть chronic или acute',
})

export const isoDateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  'Неверный формат даты/времени (ожидается ISO)',
)

export const followupStatusSchema = z.enum(['better', 'same', 'worse', 'new_symptoms'], {
  message: 'Неверный статус follow-up',
})

export const intakeAnswersSchema = z.record(z.string(), z.unknown()).refine(
  (v) => v !== null && typeof v === 'object',
  'Ответы должны быть объектом',
).refine(
  (v) => JSON.stringify(v).length < 100000,
  'Ответы слишком большие (максимум 100KB)',
)

export const doctorScheduleSchema = z.object({
  session_duration: z.number().int().min(5).max(480),
  break_duration: z.number().int().min(0).max(120),
  working_days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).min(1, 'Выберите хотя бы один рабочий день'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
  lunch_enabled: z.boolean(),
  lunch_start: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
  lunch_end: z.string().regex(/^\d{2}:\d{2}$/, 'Неверный формат времени'),
}).refine(
  d => d.start_time < d.end_time,
  { message: 'Время окончания должно быть позже начала', path: ['end_time'] }
).refine(
  d => !d.lunch_enabled || (d.lunch_start >= d.start_time && d.lunch_end <= d.end_time),
  { message: 'Обед должен быть в пределах рабочего времени', path: ['lunch_start'] }
).refine(
  d => !d.lunch_enabled || d.lunch_start < d.lunch_end,
  { message: 'Время окончания обеда должно быть позже начала', path: ['lunch_end'] }
)

export const searchQuerySchema = z.string().max(100, 'Запрос слишком длинный')

export const addPaidSessionsSchema = z.object({
  amount: z.number().int().min(1, 'Минимум 1 сеанс').max(100, 'Максимум 100 сеансов'),
  note: z.string().max(200, 'Заметка слишком длинная'),
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
