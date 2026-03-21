import { describe, it, expect } from 'vitest'
import {
  patientSchema,
  newPatientBookingSchema,
  doctorScheduleSchema,
  intakeAnswersSchema,
  isoDateTimeSchema,
  validate,
} from '../validation'

describe('patientSchema — edge cases', () => {
  it('только пробелы в имени → ошибка (trim → пусто → < 2)', () => {
    expect(patientSchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('имя ровно 2 символа → ok', () => {
    expect(patientSchema.safeParse({ name: 'Ив' }).success).toBe(true)
  })

  it('имя ровно 200 символов → ok', () => {
    expect(patientSchema.safeParse({ name: 'А'.repeat(200) }).success).toBe(true)
  })

  it('unicode в имени → ok', () => {
    expect(patientSchema.safeParse({ name: 'Ирина Шрёдер-Müller' }).success).toBe(true)
  })

  it('числа в имени → ok (не ограничиваем)', () => {
    expect(patientSchema.safeParse({ name: 'Пациент 123' }).success).toBe(true)
  })

  it('все поля null → ok (только name обязательно)', () => {
    const result = patientSchema.safeParse({
      name: 'Иванов',
      birth_date: null,
      phone: null,
      email: null,
      notes: null,
      constitutional_type: null,
      gender: null,
    })
    expect(result.success).toBe(true)
  })

  it('все поля undefined → ok', () => {
    expect(patientSchema.safeParse({ name: 'Иванов' }).success).toBe(true)
  })
})

describe('newPatientBookingSchema — edge cases', () => {
  const base = {
    name: 'Петрова',
    phone: '+79991234567',
    complaints: 'Головные боли',
    duration: 'less_month' as const,
    medications: 'no' as const,
    date: '2026-04-15',
    time: '14:00',
  }

  it('дата в формате DD-MM-YYYY → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...base, date: '15-04-2026' }).success).toBe(false)
  })

  it('дата в формате DD.MM.YYYY → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...base, date: '15.04.2026' }).success).toBe(false)
  })

  it('время в формате H:MM → ошибка (нужно HH:MM)', () => {
    expect(newPatientBookingSchema.safeParse({ ...base, time: '9:00' }).success).toBe(false)
  })

  it('время 23:59 → ok', () => {
    expect(newPatientBookingSchema.safeParse({ ...base, time: '23:59' }).success).toBe(true)
  })

  it('жалобы ровно 5 символов → ok', () => {
    expect(newPatientBookingSchema.safeParse({ ...base, complaints: '12345' }).success).toBe(true)
  })

  it('жалобы > 5000 символов → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...base, complaints: 'x'.repeat(5001) }).success).toBe(false)
  })

  it('email необязательный', () => {
    expect(newPatientBookingSchema.safeParse(base).success).toBe(true)
    expect(newPatientBookingSchema.safeParse({ ...base, email: '' }).success).toBe(true)
  })

  it('все варианты duration', () => {
    for (const d of ['less_month', '1_6_months', '6_12_months', 'more_year', 'long_time'] as const) {
      expect(newPatientBookingSchema.safeParse({ ...base, duration: d }).success).toBe(true)
    }
  })

  it('medications=yes + medications_list → ok', () => {
    expect(newPatientBookingSchema.safeParse({
      ...base, medications: 'yes', medications_list: 'Парацетамол',
    }).success).toBe(true)
  })
})

describe('doctorScheduleSchema — edge cases', () => {
  const base = {
    session_duration: 60,
    break_duration: 15,
    working_days: ['mon'] as const,
    start_time: '09:00',
    end_time: '18:00',
    lunch_enabled: false,
    lunch_start: '13:00',
    lunch_end: '14:00',
  }

  it('минимальная длительность 5 мин → ok', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, session_duration: 5 }).success).toBe(true)
  })

  it('максимальная длительность 480 мин (8ч) → ok', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, session_duration: 480 }).success).toBe(true)
  })

  it('один рабочий день → ok', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, working_days: ['sun'] }).success).toBe(true)
  })

  it('все 7 дней → ok', () => {
    expect(doctorScheduleSchema.safeParse({
      ...base, working_days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    }).success).toBe(true)
  })

  it('start_time = end_time → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, start_time: '12:00', end_time: '12:00' }).success).toBe(false)
  })

  it('обед = всё рабочее время → ok если в пределах', () => {
    expect(doctorScheduleSchema.safeParse({
      ...base, lunch_enabled: true, start_time: '09:00', end_time: '18:00',
      lunch_start: '09:00', lunch_end: '18:00',
    }).success).toBe(true)
  })

  it('break_duration = 0 → ok', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, break_duration: 0 }).success).toBe(true)
  })

  it('break_duration = 120 (2ч) → ok', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, break_duration: 120 }).success).toBe(true)
  })

  it('break_duration = 121 → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...base, break_duration: 121 }).success).toBe(false)
  })
})

describe('intakeAnswersSchema — edge cases', () => {
  it('ответы с разными типами значений → ok', () => {
    expect(intakeAnswersSchema.safeParse({
      text: 'Ответ',
      number: 42,
      nested: { a: 1, b: 'c' },
      array: [1, 2, 3],
      bool: true,
    }).success).toBe(true)
  })

  it('ответы ровно ~100KB → проходит', () => {
    const obj: Record<string, string> = {}
    for (let i = 0; i < 90; i++) obj[`key${i}`] = 'x'.repeat(1000) // ~90KB
    expect(intakeAnswersSchema.safeParse(obj).success).toBe(true)
  })
})

describe('validate — edge cases', () => {
  it('возвращает первую ошибку из нескольких', () => {
    const result = validate(patientSchema, { name: '', email: 'bad' })
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  it('trim применяется при валидации', () => {
    const result = validate(patientSchema, { name: '  Иванов  ' })
    expect(result.data?.name).toBe('Иванов')
  })
})
