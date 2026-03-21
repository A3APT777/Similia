'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { uuidSchema } from '@/lib/validation'
import { DEFAULT_PRESCRIPTION_RULES } from '@/lib/prescriptionDefaults'

// Создать ссылку на назначение
export async function createPrescriptionShare(
  consultationId: string,
  customNote?: string
): Promise<{ token: string }> {
  uuidSchema.parse(consultationId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Получаем consultation чтобы взять patient_id
  const { data: consultation } = await supabase
    .from('consultations')
    .select('patient_id, remedy')
    .eq('id', consultationId)
    .eq('doctor_id', user.id)
    .single()

  if (!consultation?.remedy) {
    throw new Error('Назначение не найдено')
  }

  const { data, error } = await supabase
    .from('prescription_shares')
    .insert({
      consultation_id: consultationId,
      patient_id: consultation.patient_id,
      doctor_id: user.id,
      custom_note: customNote || null,
    })
    .select('token')
    .single()

  if (error) {
    console.error('[createPrescriptionShare] error:', error)
    throw new Error('Не удалось создать ссылку')
  }

  return { token: data.token }
}

// Получить назначение по токену (публичная)
export async function getPrescriptionShareByToken(token: string) {
  const supabase = createServiceClient()

  const { data: share } = await supabase
    .from('prescription_shares')
    .select('*, consultations(remedy, potency, dosage, pellets, mode, created_at), patients(name)')
    .eq('token', token)
    .single()

  if (!share) return null

  // Проверяем срок
  if (share.expires_at && new Date(share.expires_at) < new Date()) return null

  // Получаем правила врача
  const { data: settings } = await supabase
    .from('doctor_settings')
    .select('prescription_rules')
    .eq('doctor_id', share.doctor_id)
    .single()

  return {
    share,
    consultation: share.consultations as unknown as {
      remedy: string; potency: string; dosage: string; pellets: number | null; mode: string; created_at: string
    },
    patientName: (share.patients as unknown as { name: string })?.name || '',
    rules: settings?.prescription_rules || DEFAULT_PRESCRIPTION_RULES,
  }
}

// Сохранить правила приёма (настройки врача)
export async function savePrescriptionRules(rules: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('doctor_settings')
    .upsert({
      doctor_id: user.id,
      prescription_rules: rules.slice(0, 5000),
    }, { onConflict: 'doctor_id' })

  if (error) {
    console.error('[savePrescriptionRules] error:', error)
    throw new Error('Не удалось сохранить')
  }
}

// Получить текущие правила
export async function getPrescriptionRules(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_PRESCRIPTION_RULES

  const { data } = await supabase
    .from('doctor_settings')
    .select('prescription_rules')
    .eq('doctor_id', user.id)
    .single()

  return data?.prescription_rules || DEFAULT_PRESCRIPTION_RULES
}
