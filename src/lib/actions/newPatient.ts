'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { newPatientBookingSchema, validate, uuidSchema } from '@/lib/validation'

// Врач создаёт токен для записи нового пациента
export async function createNewPatientToken(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const token = randomUUID().replace(/-/g, '')

  await supabase.from('new_patient_tokens').insert({
    doctor_id: user.id,
    token,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return token
}

// Ссылка для записи существующего пациента (только календарь, без анкеты)
export async function createBookingLinkForPatient(patientId: string): Promise<string> {
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверяем что пациент принадлежит врачу
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()
  if (!patient) throw new Error('Patient not found')

  const token = randomUUID().replace(/-/g, '')

  await supabase.from('new_patient_tokens').insert({
    doctor_id: user.id,
    patient_id: patientId,
    token,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return token
}

// Получить инфо о токене (публично, без авторизации)
export async function getNewPatientToken(token: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('new_patient_tokens')
    .select('doctor_id, expires_at, used, patient_id')
    .eq('token', token)
    .single()
  return data
}

// Получить расписание врача (публично)
export async function getDoctorSchedule(doctorId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .single()
  return data
}

// Получить занятые слоты для даты (публично)
export async function getBookedSlots(doctorId: string, date: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('consultations')
    .select('scheduled_at')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', `${date}T00:00:00`)
    .lt('scheduled_at', `${date}T23:59:59`)
    .neq('status', 'cancelled')
  return (data || []).map(a => {
    const d = new Date(a.scheduled_at)
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

  const supabase = createServiceClient()

  // Проверяем токен
  const { data: tokenData } = await supabase
    .from('new_patient_tokens')
    .select('doctor_id, expires_at, used')
    .eq('token', token)
    .single()

  if (!tokenData) return { success: false, error: 'Ссылка недействительна' }
  if (tokenData.used) return { success: false, error: 'Ссылка уже была использована' }
  if (new Date(tokenData.expires_at) < new Date()) return { success: false, error: 'Срок действия ссылки истёк' }

  // Создаём пациента (используем провалидированные данные)
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .insert({
      doctor_id: tokenData.doctor_id,
      name: validatedData.name,
      birth_date: validatedData.birth_date || null,
      phone: validatedData.phone,
      email: validatedData.email || null,
      first_visit_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (patientError || !patient) {
    console.error('[submitNewPatientBooking] patient insert error:', patientError)
    return { success: false, error: 'Ошибка создания пациента' }
  }

  // Проверка конфликтов — нет ли записи на это время
  const scheduledAt = new Date(`${validatedData.date}T${validatedData.time}:00`)
  const dayStart = new Date(`${validatedData.date}T00:00:00`).toISOString()
  const dayEnd = new Date(`${validatedData.date}T23:59:59`).toISOString()
  const { data: existingAppointments } = await supabase
    .from('consultations')
    .select('scheduled_at')
    .eq('doctor_id', tokenData.doctor_id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)

  const selectedMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes()
  const hasConflict = (existingAppointments || []).some(a => {
    if (!a.scheduled_at) return false
    const existing = new Date(a.scheduled_at)
    const existingMin = existing.getHours() * 60 + existing.getMinutes()
    return Math.abs(existingMin - selectedMinutes) < 60
  })

  if (hasConflict) {
    // Откатываем пациента
    await supabase.from('patients').delete().eq('id', patient.id)
    return { success: false, error: 'Это время уже занято. Выберите другое.' }
  }

  // Создаём консультацию (запись)
  const { error: consultationError } = await supabase.from('consultations').insert({
    doctor_id: tokenData.doctor_id,
    patient_id: patient.id,
    scheduled_at: scheduledAt.toISOString(),
    status: 'scheduled',
    source: 'online',
  })

  if (consultationError) {
    console.error('[submitNewPatientBooking] consultation insert error:', consultationError)
    // Откатываем пациента
    await supabase.from('patients').delete().eq('id', patient.id)
    return { success: false, error: 'Ошибка записи на приём. Попробуйте ещё раз.' }
  }

  // Сохраняем анкету в intake_forms
  const intakeData = {
    complaints: validatedData.complaints,
    duration: validatedData.duration,
    previous_treatment: validatedData.previous_treatment || '',
    allergies: validatedData.allergies || '',
    medications: validatedData.medications,
    medications_list: validatedData.medications === 'yes' ? (validatedData.medications_list || '') : '',
  }

  const { error: intakeError } = await supabase.from('intake_forms').insert({
    doctor_id: tokenData.doctor_id,
    patient_id: patient.id,
    patient_name: validatedData.name,
    type: 'primary',
    status: 'completed',
    answers: intakeData,
    token: randomUUID().replace(/-/g, ''),
  })

  if (intakeError) {
    console.error('[submitNewPatientBooking] intake_forms insert error:', intakeError)
    // Не блокируем запись из-за анкеты — консультация уже создана
  }

  // Помечаем токен как использованный
  const { error: tokenUpdateError } = await supabase
    .from('new_patient_tokens')
    .update({ used: true })
    .eq('token', token)

  if (tokenUpdateError) {
    console.error('[submitNewPatientBooking] token update error:', tokenUpdateError)
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
  const supabase = createServiceClient()

  // Проверяем токен
  const { data: tokenData } = await supabase
    .from('new_patient_tokens')
    .select('doctor_id, expires_at, used, patient_id')
    .eq('token', token)
    .single()

  if (!tokenData) return { success: false, error: 'Ссылка недействительна' }
  if (tokenData.used) return { success: false, error: 'Ссылка уже использована' }
  if (new Date(tokenData.expires_at) < new Date()) return { success: false, error: 'Срок действия истёк' }
  if (!tokenData.patient_id) return { success: false, error: 'Некорректная ссылка' }

  // Проверка конфликтов
  const scheduledAt = new Date(`${date}T${time}:00`)
  const dayStart = new Date(`${date}T00:00:00`).toISOString()
  const dayEnd = new Date(`${date}T23:59:59`).toISOString()
  const { data: existing } = await supabase
    .from('consultations')
    .select('scheduled_at')
    .eq('doctor_id', tokenData.doctor_id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)

  const selectedMin = scheduledAt.getHours() * 60 + scheduledAt.getMinutes()
  const hasConflict = (existing || []).some(a => {
    if (!a.scheduled_at) return false
    const ex = new Date(a.scheduled_at)
    return Math.abs((ex.getHours() * 60 + ex.getMinutes()) - selectedMin) < 60
  })

  if (hasConflict) return { success: false, error: 'Это время уже занято. Выберите другое.' }

  // Создаём консультацию
  const { error } = await supabase.from('consultations').insert({
    doctor_id: tokenData.doctor_id,
    patient_id: tokenData.patient_id,
    scheduled_at: scheduledAt.toISOString(),
    status: 'scheduled',
    source: 'online',
  })

  if (error) {
    console.error('[bookExistingPatient]', error)
    return { success: false, error: 'Ошибка записи. Попробуйте ещё раз.' }
  }

  // Помечаем токен
  await supabase.from('new_patient_tokens').update({ used: true }).eq('token', token)

  revalidatePath('/dashboard')

  const dateFormatted = new Date(`${date}T${time}:00`).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return { success: true, appointmentDate: `${dateFormatted} в ${time}` }
}
