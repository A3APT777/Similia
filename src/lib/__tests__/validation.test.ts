import { describe, it, expect } from 'vitest'
import {
  patientSchema,
  newPatientBookingSchema,
  prescriptionSchema,
  uuidSchema,
  consultationTypeSchema,
  isoDateTimeSchema,
  followupStatusSchema,
  intakeAnswersSchema,
  doctorScheduleSchema,
  searchQuerySchema,
  addPaidSessionsSchema,
  validate,
} from '../shared/validation'

// ═══════════════════════════════════════════════════════════
// patientSchema
// ═══════════════════════════════════════════════════════════
describe('patientSchema', () => {
  it('валидное имя проходит', () => {
    const result = patientSchema.safeParse({ name: 'Иванов Иван' })
    expect(result.success).toBe(true)
  })

  it('имя < 2 символов → ошибка', () => {
    const result = patientSchema.safeParse({ name: 'А' })
    expect(result.success).toBe(false)
  })

  it('имя > 200 символов → ошибка', () => {
    const result = patientSchema.safeParse({ name: 'А'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('пустое имя → ошибка', () => {
    const result = patientSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('имя с пробелами обрезается (trim)', () => {
    const result = patientSchema.safeParse({ name: '  Иванов  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Иванов')
  })

  it('email валидный → ok', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', email: 'test@mail.ru' })
    expect(result.success).toBe(true)
  })

  it('email невалидный → ошибка', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', email: 'not-email' })
    expect(result.success).toBe(false)
  })

  it('email пустая строка → ok (необязательное поле)', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', email: '' })
    expect(result.success).toBe(true)
  })

  it('email null → ok', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', email: null })
    expect(result.success).toBe(true)
  })

  it('телефон > 20 символов → ошибка', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', phone: '+7' + '9'.repeat(20) })
    expect(result.success).toBe(false)
  })

  it('телефон обрезается (trim)', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', phone: ' +79991234567 ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('+79991234567')
  })

  it('gender male/female/other → ok', () => {
    expect(patientSchema.safeParse({ name: 'Иванов', gender: 'male' }).success).toBe(true)
    expect(patientSchema.safeParse({ name: 'Иванов', gender: 'female' }).success).toBe(true)
    expect(patientSchema.safeParse({ name: 'Иванов', gender: 'other' }).success).toBe(true)
  })

  it('gender невалидный → ошибка', () => {
    expect(patientSchema.safeParse({ name: 'Иванов', gender: 'unknown' }).success).toBe(false)
  })

  it('gender null → ok', () => {
    expect(patientSchema.safeParse({ name: 'Иванов', gender: null }).success).toBe(true)
  })

  it('notes > 2000 символов → ошибка', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', notes: 'А'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('constitutional_type обрезается (trim)', () => {
    const result = patientSchema.safeParse({ name: 'Иванов', constitutional_type: ' Sulphur ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.constitutional_type).toBe('Sulphur')
  })
})

// ═══════════════════════════════════════════════════════════
// newPatientBookingSchema
// ═══════════════════════════════════════════════════════════
describe('newPatientBookingSchema', () => {
  const validBooking = {
    name: 'Петрова Мария',
    phone: '+79991234567',
    complaints: 'Головные боли уже полгода',
    duration: 'less_month' as const,
    medications: 'no' as const,
    date: '2026-04-15',
    time: '14:00',
  }

  it('валидные данные → ok', () => {
    expect(newPatientBookingSchema.safeParse(validBooking).success).toBe(true)
  })

  it('имя < 2 → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, name: 'А' }).success).toBe(false)
  })

  it('телефон < 7 → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, phone: '123' }).success).toBe(false)
  })

  it('жалобы < 5 символов → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, complaints: 'Боль' }).success).toBe(false)
  })

  it('невалидная дата → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, date: '15-04-2026' }).success).toBe(false)
  })

  it('невалидное время → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, time: '2pm' }).success).toBe(false)
  })

  it('невалидная duration → ошибка', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, duration: 'forever' }).success).toBe(false)
  })

  it('medications должен быть yes или no', () => {
    expect(newPatientBookingSchema.safeParse({ ...validBooking, medications: 'maybe' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// prescriptionSchema
// ═══════════════════════════════════════════════════════════
describe('prescriptionSchema', () => {
  it('pellets null без других полей → ok', () => {
    expect(prescriptionSchema.safeParse({ pellets: null }).success).toBe(true)
  })

  it('pellets в пределах 0-100 → ok', () => {
    expect(prescriptionSchema.safeParse({ pellets: 3 }).success).toBe(true)
    expect(prescriptionSchema.safeParse({ pellets: 0 }).success).toBe(true)
    expect(prescriptionSchema.safeParse({ pellets: 100 }).success).toBe(true)
  })

  it('pellets > 100 → ошибка', () => {
    expect(prescriptionSchema.safeParse({ pellets: 101 }).success).toBe(false)
  })

  it('pellets дробное → ошибка', () => {
    expect(prescriptionSchema.safeParse({ pellets: 3.5 }).success).toBe(false)
  })

  it('pellets null → ok', () => {
    expect(prescriptionSchema.safeParse({ pellets: null }).success).toBe(true)
  })

  it('remedy > 200 символов → ошибка', () => {
    expect(prescriptionSchema.safeParse({ remedy: 'A'.repeat(201) }).success).toBe(false)
  })

  it('dosage > 500 символов → ошибка', () => {
    expect(prescriptionSchema.safeParse({ dosage: 'A'.repeat(501) }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// uuidSchema
// ═══════════════════════════════════════════════════════════
describe('uuidSchema', () => {
  it('валидный UUID → ok', () => {
    expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
  })

  it('невалидный UUID → ошибка', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
  })

  it('пустая строка → ошибка', () => {
    expect(uuidSchema.safeParse('').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// consultationTypeSchema
// ═══════════════════════════════════════════════════════════
describe('consultationTypeSchema', () => {
  it('chronic → ok', () => {
    expect(consultationTypeSchema.safeParse('chronic').success).toBe(true)
  })

  it('acute → ok', () => {
    expect(consultationTypeSchema.safeParse('acute').success).toBe(true)
  })

  it('другой тип → ошибка', () => {
    expect(consultationTypeSchema.safeParse('initial').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// isoDateTimeSchema
// ═══════════════════════════════════════════════════════════
describe('isoDateTimeSchema', () => {
  it('ISO дата со временем → ok', () => {
    expect(isoDateTimeSchema.safeParse('2026-03-21T14:30:00').success).toBe(true)
  })

  it('ISO дата с Z → ok', () => {
    expect(isoDateTimeSchema.safeParse('2026-03-21T14:30:00Z').success).toBe(true)
  })

  it('только дата без времени → ошибка', () => {
    expect(isoDateTimeSchema.safeParse('2026-03-21').success).toBe(false)
  })

  it('русский формат → ошибка', () => {
    expect(isoDateTimeSchema.safeParse('21.03.2026 14:30').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// followupStatusSchema
// ═══════════════════════════════════════════════════════════
describe('followupStatusSchema', () => {
  it.each(['better', 'same', 'worse', 'new_symptoms'])('%s → ok', (status) => {
    expect(followupStatusSchema.safeParse(status).success).toBe(true)
  })

  it('другой статус → ошибка', () => {
    expect(followupStatusSchema.safeParse('excellent').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// intakeAnswersSchema
// ═══════════════════════════════════════════════════════════
describe('intakeAnswersSchema', () => {
  it('обычный объект → ok', () => {
    expect(intakeAnswersSchema.safeParse({ q1: 'answer1', q2: 'answer2' }).success).toBe(true)
  })

  it('пустой объект → ok', () => {
    expect(intakeAnswersSchema.safeParse({}).success).toBe(true)
  })

  it('объект > 100KB → ошибка', () => {
    const bigObj: Record<string, string> = {}
    for (let i = 0; i < 1000; i++) bigObj[`key${i}`] = 'x'.repeat(110)
    expect(intakeAnswersSchema.safeParse(bigObj).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// doctorScheduleSchema
// ═══════════════════════════════════════════════════════════
describe('doctorScheduleSchema', () => {
  const validSchedule = {
    session_duration: 60,
    break_duration: 15,
    working_days: ['mon', 'wed', 'fri'] as const,
    start_time: '09:00',
    end_time: '18:00',
    lunch_enabled: true,
    lunch_start: '13:00',
    lunch_end: '14:00',
  }

  it('валидное расписание → ok', () => {
    expect(doctorScheduleSchema.safeParse(validSchedule).success).toBe(true)
  })

  it('start_time > end_time → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, start_time: '18:00', end_time: '09:00' }).success).toBe(false)
  })

  it('обед вне рабочего времени → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, lunch_start: '08:00' }).success).toBe(false)
  })

  it('lunch_start > lunch_end → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, lunch_start: '14:00', lunch_end: '13:00' }).success).toBe(false)
  })

  it('без рабочих дней → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, working_days: [] }).success).toBe(false)
  })

  it('обед отключён → lunch_start/end не валидируются', () => {
    expect(doctorScheduleSchema.safeParse({
      ...validSchedule, lunch_enabled: false, lunch_start: '22:00', lunch_end: '01:00',
    }).success).toBe(true)
  })

  it('session_duration < 5 → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, session_duration: 3 }).success).toBe(false)
  })

  it('session_duration > 480 → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, session_duration: 500 }).success).toBe(false)
  })

  it('break_duration < 0 → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, break_duration: -1 }).success).toBe(false)
  })

  it('невалидный день недели → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, working_days: ['monday'] }).success).toBe(false)
  })

  it('невалидный формат времени → ошибка', () => {
    expect(doctorScheduleSchema.safeParse({ ...validSchedule, start_time: '9:00' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// searchQuerySchema
// ═══════════════════════════════════════════════════════════
describe('searchQuerySchema', () => {
  it('нормальный запрос → ok', () => {
    expect(searchQuerySchema.safeParse('головная боль').success).toBe(true)
  })

  it('запрос > 100 символов → ошибка', () => {
    expect(searchQuerySchema.safeParse('a'.repeat(101)).success).toBe(false)
  })

  it('пустой запрос → ok', () => {
    expect(searchQuerySchema.safeParse('').success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════
// addPaidSessionsSchema
// ═══════════════════════════════════════════════════════════
describe('addPaidSessionsSchema', () => {
  it('валидные данные → ok', () => {
    expect(addPaidSessionsSchema.safeParse({ amount: 5, note: 'Оплата' }).success).toBe(true)
  })

  it('amount < 1 → ошибка', () => {
    expect(addPaidSessionsSchema.safeParse({ amount: 0, note: '' }).success).toBe(false)
  })

  it('amount > 100 → ошибка', () => {
    expect(addPaidSessionsSchema.safeParse({ amount: 101, note: '' }).success).toBe(false)
  })

  it('note > 200 символов → ошибка', () => {
    expect(addPaidSessionsSchema.safeParse({ amount: 1, note: 'А'.repeat(201) }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// validate utility
// ═══════════════════════════════════════════════════════════
describe('validate', () => {
  it('валидные данные → data + null error', () => {
    const result = validate(patientSchema, { name: 'Иванов Иван' })
    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.name).toBe('Иванов Иван')
  })

  it('невалидные данные → null data + error string', () => {
    const result = validate(patientSchema, { name: '' })
    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(typeof result.error).toBe('string')
  })
})
