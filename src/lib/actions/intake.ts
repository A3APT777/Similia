'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntakeAnswers, IntakeType } from '@/types'
import { randomUUID } from 'crypto'
import { intakeAnswersSchema } from '@/lib/validation'
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
