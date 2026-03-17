'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uuidSchema, followupStatusSchema } from '@/lib/validation'
import { z } from 'zod'

export async function createFollowup(consultationId: string, patientId: string) {
  uuidSchema.parse(consultationId)
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверяем что консультация принадлежит текущему врачу
  const { data: consultation } = await supabase
    .from('consultations')
    .select('id')
    .eq('id', consultationId)
    .eq('doctor_id', user.id)
    .single()

  if (!consultation) throw new Error('Консультация не найдена')

  // Проверяем — нет ли уже follow-up для этой консультации
  const { data: existing } = await supabase
    .from('followups')
    .select('id, token')
    .eq('consultation_id', consultationId)
    .single()

  if (existing) return { token: existing.token }

  const { data, error } = await supabase
    .from('followups')
    .insert({
      consultation_id: consultationId,
      patient_id: patientId,
      sent_at: new Date().toISOString(),
    })
    .select('token')
    .single()

  if (error) throw new Error(error.message)

  return { token: data.token }
}

export async function respondFollowup(
  token: string,
  status: 'better' | 'same' | 'worse' | 'new_symptoms',
  comment: string
) {
  uuidSchema.parse(token)
  followupStatusSchema.parse(status)
  z.string().max(2000, 'Комментарий слишком длинный').parse(comment)
  const supabase = await createClient()

  const { error } = await supabase
    .from('followups')
    .update({
      status,
      comment: comment || null,
      responded_at: new Date().toISOString(),
    })
    .eq('token', token)
    .is('responded_at', null) // отвечать можно только один раз

  if (error) throw new Error(error.message)
}
