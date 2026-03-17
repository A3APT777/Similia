'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConsultationType } from '@/types'
import { uuidSchema, consultationTypeSchema, isoDateTimeSchema } from '@/lib/validation'
import { z } from 'zod'

// Закрыть все открытые консультации пациента (перед началом новой)
async function closeOpenConsultations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  doctorId: string
) {
  await supabase
    .from('consultations')
    .update({ status: 'completed' })
    .eq('patient_id', patientId)
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

  // Закрываем любую другую открытую консультацию этого пациента
  await closeOpenConsultations(supabase, patientId, user.id)

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

  await supabase
    .from('consultations')
    .update({ type })
    .eq('id', id)
    .eq('doctor_id', user.id)
}

// Получить все запланированные приёмы за конкретный день (для проверки конфликтов)
export async function getAppointmentsForDay(dayStart: string, dayEnd: string): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('consultations')
    .select('scheduled_at')
    .eq('doctor_id', user.id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)

  return (data || []).map(c => c.scheduled_at).filter(Boolean)
}

// Начать запланированный приём — меняет статус и открывает редактор
export async function startConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Закрываем любую другую открытую консультацию этого пациента
  await closeOpenConsultations(supabase, patientId, user.id)

  await supabase
    .from('consultations')
    .update({ status: 'in_progress' })
    .eq('id', consultationId)
    .eq('doctor_id', user.id)

  redirect(`/patients/${patientId}/consultations/${consultationId}`)
}

// Отменить запланированный приём
export async function cancelConsultation(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('consultations')
    .update({ status: 'cancelled' })
    .eq('id', consultationId)
    .eq('doctor_id', user.id)

  redirect(`/patients/${patientId}`)
}

// Автосохранение заметок — переводит статус в completed
export async function updateConsultationNotes(id: string, notes: string) {
  uuidSchema.parse(id)
  z.string().max(50000, 'Заметки слишком длинные').parse(notes)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('consultations')
    .update({
      notes,
      status: notes.trim().length > 0 ? 'completed' : 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('doctor_id', user.id)
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

  await supabase
    .from('consultations')
    .update({ remedy: remedy || null, potency: potency || null, pellets, dosage: dosage || null })
    .eq('id', id)
    .eq('doctor_id', user.id)
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

  await supabase
    .from('consultations')
    .update({
      rubrics: rubrics || null,
      reaction_to_previous: reactionToPrevious || null,
    })
    .eq('id', id)
    .eq('doctor_id', user.id)
}

// Сохранить структурированные поля приёма
export async function updateConsultationFields(
  id: string,
  fields: {
    complaints?: string
    observations?: string
    recommendations?: string
    repertory_data?: unknown[]
    structured_symptoms?: unknown[]
    mode?: string
    case_state?: string | null
    clinical_assessment?: unknown
  }
): Promise<void> {
  uuidSchema.parse(id)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.complaints !== undefined) update.complaints = fields.complaints
  if (fields.observations !== undefined) update.observations = fields.observations
  if (fields.recommendations !== undefined) update.recommendations = fields.recommendations
  if (fields.repertory_data !== undefined) update.repertory_data = fields.repertory_data
  if (fields.structured_symptoms !== undefined) update.structured_symptoms = fields.structured_symptoms
  if (fields.mode !== undefined) update.mode = fields.mode
  if (fields.case_state !== undefined) update.case_state = fields.case_state
  if (fields.clinical_assessment !== undefined) update.clinical_assessment = fields.clinical_assessment

  await supabase
    .from('consultations')
    .update(update)
    .eq('id', id)
    .eq('doctor_id', user.id)
}

export async function deleteConsultation(id: string, patientId: string) {
  uuidSchema.parse(id)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('consultations')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id)

  redirect(`/patients/${patientId}`)
}
