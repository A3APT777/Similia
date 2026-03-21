'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { uuidSchema } from '@/lib/validation'
import { z } from 'zod'
import type { PreVisitSurvey } from '@/types'

// Создать опросник для пациента (вызывает врач)
export async function createPreVisitSurvey(
  patientId: string,
  consultationId?: string
): Promise<{ token: string }> {
  uuidSchema.parse(patientId)
  if (consultationId) uuidSchema.parse(consultationId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('pre_visit_surveys')
    .insert({
      patient_id: patientId,
      doctor_id: user.id,
      consultation_id: consultationId || null,
    })
    .select('token')
    .single()

  if (error) {
    console.error('[createPreVisitSurvey] error:', error)
    throw new Error('Не удалось создать опросник')
  }

  return { token: data.token }
}

// Загрузить опросник по токену (публичная, для пациента)
export async function getPreVisitSurveyByToken(token: string): Promise<PreVisitSurvey | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('pre_visit_surveys')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) return null
  return data as PreVisitSurvey
}

// Отправить ответы (публичная, вызывает пациент)
export async function submitPreVisitSurvey(
  token: string,
  answers: Record<string, unknown>
): Promise<void> {
  // Валидация размера ответов (макс 100KB)
  const answersStr = JSON.stringify(answers)
  if (answersStr.length > 100000) {
    throw new Error('Ответы слишком большие')
  }

  const supabase = createServiceClient()

  // Проверяем что опросник существует и не просрочен
  const { data: survey, error: fetchError } = await supabase
    .from('pre_visit_surveys')
    .select('id, status, expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !survey) {
    throw new Error('Опросник не найден')
  }

  if (survey.status === 'completed') {
    throw new Error('Опросник уже заполнен')
  }

  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    throw new Error('Срок действия опросника истёк')
  }

  const { error } = await supabase
    .from('pre_visit_surveys')
    .update({
      answers,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', survey.id)

  if (error) {
    console.error('[submitPreVisitSurvey] error:', error)
    throw new Error('Не удалось сохранить ответы')
  }
}

// Загрузить опросник по consultation_id (для правой панели)
export async function getPreVisitSurveyByConsultation(
  consultationId: string
): Promise<PreVisitSurvey | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('pre_visit_surveys')
    .select('*')
    .eq('consultation_id', consultationId)
    .eq('doctor_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getPreVisitSurveyByConsultation] error:', error)
    return null
  }

  return data as PreVisitSurvey | null
}

// Загрузить последний опросник пациента (для карточки)
export async function getLatestPatientSurvey(
  patientId: string
): Promise<PreVisitSurvey | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('pre_visit_surveys')
    .select('*')
    .eq('patient_id', patientId)
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getLatestPatientSurvey] error:', error)
    return null
  }

  return data as PreVisitSurvey | null
}
