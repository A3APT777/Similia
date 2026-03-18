'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { IntakeAnswers, IntakeType } from '@/types'
import { randomUUID } from 'crypto'
import { intakeAnswersSchema, uuidSchema } from '@/lib/validation'
import { z } from 'zod'

// Создать ссылку-анкету (для нового пациента — без patient_id)
export async function createIntakeLink(type: IntakeType = 'primary'): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const token = randomUUID().replace(/-/g, '')

  // Ссылка действительна 24 часа
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('intake_forms').insert({
    token,
    doctor_id: user.id,
    type,
    status: 'pending',
    expires_at: expiresAt,
  })

  return token
}

// Создать ссылку-анкету для существующего пациента — данные будут предзаполнены
export async function createIntakeLinkForPatient(patientId: string, type: IntakeType = 'primary'): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name, phone, birth_date, email')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()

  if (!patient) redirect('/dashboard')

  const token = randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('intake_forms').insert({
    token,
    doctor_id: user.id,
    patient_id: patientId,
    patient_name: patient.name,
    type,
    status: 'pending',
    expires_at: expiresAt,
  })

  return token
}

// Пациент отправляет заполненную анкету — создаём нового пациента автоматически
export async function submitIntake(token: string, answers: IntakeAnswers): Promise<void> {
  z.string().min(1, 'Токен обязателен').parse(token)
  intakeAnswersSchema.parse(answers)
  const supabase = await createClient()

  // Получаем анкету чтобы знать doctor_id
  const { data: intake } = await supabase
    .from('intake_forms')
    .select('doctor_id, patient_id')
    .eq('token', token)
    .single()

  if (!intake) return

  let patientId = intake.patient_id

  // Если пациент ещё не привязан — создаём новую карточку из данных анкеты
  if (!patientId && answers.patient_name?.trim()) {
    const { data: newPatient } = await supabase
      .from('patients')
      .insert({
        doctor_id: intake.doctor_id,
        name: answers.patient_name.trim(),
        phone: answers.patient_phone?.trim() || null,
        email: answers.patient_email?.trim() || null,
        birth_date: answers.patient_birth_date?.trim() || null,
        first_visit_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    patientId = newPatient?.id || null
  }

  await supabase
    .from('intake_forms')
    .update({
      status: 'completed',
      answers,
      patient_id: patientId,
      patient_name: answers.patient_name?.trim() || null,
      completed_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('status', 'pending')
}

// Врач заполняет/редактирует анкету напрямую (без токена)
export async function submitDoctorIntake(patientId: string, type: IntakeType, answers: IntakeAnswers): Promise<void> {
  uuidSchema.parse(patientId)
  intakeAnswersSchema.parse(answers)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Убеждаемся что пациент принадлежит врачу
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()

  if (!patient) return

  // Ищем существующую анкету для обновления
  const { data: existing } = await supabase
    .from('intake_forms')
    .select('id')
    .eq('patient_id', patientId)
    .eq('type', type)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('intake_forms')
      .update({ answers, completed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('intake_forms').insert({
      token: randomUUID().replace(/-/g, ''),
      doctor_id: user.id,
      patient_id: patientId,
      type,
      status: 'completed',
      answers,
      completed_at: new Date().toISOString(),
    })
  }
}

// Пациент записывается на приём после заполнения анкеты (без авторизации)
export async function bookIntakeAppointment(
  token: string,
  date: string,
  time: string,
): Promise<{ success: boolean; error?: string; appointmentDate?: string }> {
  const supabase = createServiceClient()

  const { data: intake } = await supabase
    .from('intake_forms')
    .select('doctor_id, patient_id')
    .eq('token', token)
    .single()

  if (!intake?.patient_id) return { success: false, error: 'Анкета не найдена' }

  const scheduledAt = new Date(`${date}T${time}:00`)

  const { error } = await supabase.from('consultations').insert({
    doctor_id: intake.doctor_id,
    patient_id: intake.patient_id,
    scheduled_at: scheduledAt.toISOString(),
    status: 'scheduled',
    source: 'online',
  })

  if (error) return { success: false, error: 'Ошибка записи на приём' }

  const dateFormatted = scheduledAt.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return { success: true, appointmentDate: `${dateFormatted} в ${time}` }
}
