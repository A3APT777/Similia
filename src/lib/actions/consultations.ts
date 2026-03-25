'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ConsultationType } from '@/types'
import { uuidSchema, consultationTypeSchema, isoDateTimeSchema } from '@/lib/validation'
import { z } from 'zod'

// Закрыть все открытые консультации врача (перед началом новой)
// Правило: у врача одновременно может быть активным только один приём
async function closeOpenConsultations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string
) {
  await supabase
    .from('consultations')
    .update({ status: 'completed' })
    .eq('doctor_id', doctorId)
    .eq('status', 'in_progress')
}

// Создать консультацию прямо сейчас и открыть редактор
export async function createConsultation(patientId: string, type: ConsultationType = 'chronic') {
  uuidSchema.parse(patientId)
  consultationTypeSchema.parse(type)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверяем, что пациент принадлежит текущему врачу
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()
  if (!patient) throw new Error('Patient not found')

  // Закрываем любые открытые консультации врача (один приём за раз)
  await closeOpenConsultations(supabase, user.id)

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      patient_id: patientId,
      doctor_id: user.id,
      notes: '',
      status: 'in_progress',
      type,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  redirect(`/patients/${patientId}/consultations/${data.id}`)
}

// Создать консультацию для AI-анализа (без redirect, возвращает ID)
export async function createAIConsultation(
  patientId: string,
  type: ConsultationType = 'chronic',
  notes: string = '',
): Promise<string> {
  uuidSchema.parse(patientId)
  consultationTypeSchema.parse(type)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()
  if (!patient) throw new Error('Patient not found')

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      patient_id: patientId,
      doctor_id: user.id,
      notes,
      status: 'in_progress',
      type,
      source: 'ai',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

// Запланировать приём на конкретную дату и время (scheduledAt — ISO UTC строка)
export async function scheduleConsultation(
  patientId: string,
  scheduledAt: string,
  type: ConsultationType = 'chronic'
): Promise<void> {
  uuidSchema.parse(patientId)
  isoDateTimeSchema.parse(scheduledAt)
  consultationTypeSchema.parse(type)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверяем, что пациент принадлежит текущему врачу
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()
  if (!patient) throw new Error('Patient not found')

  const date = scheduledAt.split('T')[0]

  const { error } = await supabase
    .from('consultations')
    .insert({
      patient_id: patientId,
      doctor_id: user.id,
      notes: '',
      date,
      scheduled_at: scheduledAt,
      status: 'scheduled',
      type,
    })

  if (error) throw new Error(error.message)
}

// Изменить тип консультации
export async function updateConsultationType(id: string, type: ConsultationType): Promise<void> {
  uuidSchema.parse(id)
  consultationTypeSchema.parse(type)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({ type })
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[updateConsultationType]', error)
    throw new Error('Не удалось обновить тип')
  }
}

// Получить все запланированные приёмы за конкретный день (для проверки конфликтов)
export async function getAppointmentsForDay(dayStart: string, dayEnd: string): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('consultations')
    .select('scheduled_at')
    .eq('doctor_id', user.id)
    .neq('status', 'cancelled')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)

  if (error) { console.error('[getAppointmentsForDay]', error); return [] }
  return (data || []).map(c => c.scheduled_at).filter(Boolean)
}

// Начать запланированный приём — меняет статус и открывает редактор
export async function startConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Закрываем любые открытые консультации врача (один приём за раз)
  await closeOpenConsultations(supabase, user.id)

  const { error } = await supabase
    .from('consultations')
    .update({ status: 'in_progress' })
    .eq('id', consultationId)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[startConsultation]', error)
    throw new Error('Не удалось начать приём')
  }

  redirect(`/patients/${patientId}/consultations/${consultationId}`)
}

// Отменить запланированный приём
export async function cancelConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({ status: 'cancelled' })
    .eq('id', consultationId)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[cancelConsultation]', error)
    throw new Error('Не удалось отменить приём')
  }

  revalidatePath('/dashboard')
  redirect(`/patients/${patientId}`)
}

// Автосохранение заметок — переводит статус в completed
export async function updateConsultationNotes(id: string, notes: string) {
  uuidSchema.parse(id)
  z.string().max(50000, 'Заметки слишком длинные').parse(notes)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[updateConsultationNotes]', error)
    throw new Error('Не удалось сохранить заметки')
  }
}

// Получить все приёмы за конкретный месяц (для календаря)
export async function getAppointmentsByMonth(year: number, month: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const MSK = 3 * 60 * 60 * 1000
  const lastDay = new Date(year, month, 0).getDate()
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - MSK).toISOString()
  const monthEnd = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59) - MSK).toISOString()

  const { data } = await supabase
    .from('consultations')
    .select('id, scheduled_at, status, type, patient_id, patients(id, name)')
    .eq('doctor_id', user.id)
    .not('scheduled_at', 'is', null)
    .neq('status', 'cancelled')
    .gte('scheduled_at', monthStart)
    .lte('scheduled_at', monthEnd)
    .order('scheduled_at', { ascending: true })

  return (data || []) as unknown as {
    id: string
    scheduled_at: string
    status: string
    type: ConsultationType
    patient_id: string
    patients: { id: string; name: string } | null
  }[]
}

// Сохранить назначение после консультации
export async function savePrescription(
  id: string,
  remedy: string,
  potency: string,
  pellets: number | null,
  dosage: string
): Promise<void> {
  uuidSchema.parse(id)
  z.string().max(200).parse(remedy)
  z.string().max(50).parse(potency)
  z.number().int().min(0).max(100).nullable().parse(pellets)
  z.string().max(500).parse(dosage)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({ remedy: remedy || null, potency: potency || null, pellets, dosage: dosage || null })
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[savePrescription]', error)
    throw new Error('Не удалось сохранить назначение')
  }
}

// Сохранить рубрики и реакцию на предыдущий препарат
export async function updateConsultationExtra(
  id: string,
  rubrics: string,
  reactionToPrevious: string
): Promise<void> {
  uuidSchema.parse(id)
  z.string().max(5000).parse(rubrics)
  z.string().max(2000).parse(reactionToPrevious)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({
      rubrics: rubrics || null,
      reaction_to_previous: reactionToPrevious || null,
    })
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[updateConsultationExtra]', error)
    throw new Error('Не удалось сохранить')
  }
}

// Сохранить структурированные поля приёма
const consultationFieldsSchema = z.object({
  complaints: z.string().max(50000).optional(),
  observations: z.string().max(50000).optional(),
  recommendations: z.string().max(10000).optional(),
  repertory_data: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  structured_symptoms: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
  mode: z.string().max(20).optional(),
  case_state: z.string().max(30).nullable().optional(),
  clinical_assessment: z.record(z.string(), z.unknown()).nullable().optional(),
  modality_worse_text: z.string().max(10000).optional(),
  modality_better_text: z.string().max(10000).optional(),
  mental_text: z.string().max(10000).optional(),
  general_text: z.string().max(10000).optional(),
})

export async function updateConsultationFields(
  id: string,
  fields: z.infer<typeof consultationFieldsSchema>
): Promise<void> {
  uuidSchema.parse(id)
  const parsed = consultationFieldsSchema.parse(fields)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.complaints !== undefined) update.complaints = parsed.complaints
  if (parsed.observations !== undefined) update.observations = parsed.observations
  if (parsed.recommendations !== undefined) update.recommendations = parsed.recommendations
  if (parsed.repertory_data !== undefined) update.repertory_data = parsed.repertory_data
  if (parsed.structured_symptoms !== undefined) update.structured_symptoms = parsed.structured_symptoms
  if (parsed.mode !== undefined) update.mode = parsed.mode
  if (parsed.case_state !== undefined) update.case_state = parsed.case_state
  if (parsed.clinical_assessment !== undefined) update.clinical_assessment = parsed.clinical_assessment
  if (parsed.modality_worse_text !== undefined) update.modality_worse_text = parsed.modality_worse_text
  if (parsed.modality_better_text !== undefined) update.modality_better_text = parsed.modality_better_text
  if (parsed.mental_text !== undefined) update.mental_text = parsed.mental_text
  if (parsed.general_text !== undefined) update.general_text = parsed.general_text

  const { error } = await supabase
    .from('consultations')
    .update(update)
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[updateConsultationFields]', error)
    throw new Error('Не удалось сохранить поля')
  }
}

// Явно завершить консультацию (независимо от заполненности notes)
export async function saveDoctorDynamics(id: string, dynamics: string): Promise<void> {
  uuidSchema.parse(id)
  z.string().max(100).parse(dynamics)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({ doctor_dynamics: dynamics, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[saveDoctorDynamics]', error)
    throw new Error('Не удалось сохранить динамику')
  }
}

export async function completeConsultation(id: string): Promise<void> {
  uuidSchema.parse(id)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[completeConsultation]', error)
    throw new Error('Не удалось завершить приём')
  }

  revalidatePath('/dashboard')
}

export async function deleteConsultation(id: string, patientId: string) {
  uuidSchema.parse(id)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[deleteConsultation]', error)
    throw new Error('Не удалось удалить консультацию')
  }

  revalidatePath('/dashboard')
  redirect(`/patients/${patientId}`)
}

export async function saveRepertoryData(
  consultationId: string,
  data: { rubricId: number; fullpath: string; fullpath_ru?: string | null; weight: 1 | 2 | 3; eliminate?: boolean }[]
): Promise<void> {
  uuidSchema.parse(consultationId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('consultations')
    .update({ repertory_data: data, updated_at: new Date().toISOString() })
    .eq('id', consultationId)
    .eq('doctor_id', user.id)
  if (error) {
    console.error('[saveRepertoryData]', error)
    throw new Error('Не удалось сохранить данные реперториума')
  }
}
