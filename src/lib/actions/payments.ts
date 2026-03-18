'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uuidSchema, addPaidSessionsSchema } from '@/lib/validation'

export async function getDoctorSettings(): Promise<{ paid_sessions_enabled: boolean; followup_reminder_days: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { paid_sessions_enabled: true, followup_reminder_days: 30 }

  const { data } = await supabase
    .from('doctor_settings')
    .select('paid_sessions_enabled, followup_reminder_days')
    .eq('doctor_id', user.id)
    .single()

  return {
    paid_sessions_enabled: data?.paid_sessions_enabled ?? false,
    followup_reminder_days: data?.followup_reminder_days ?? 30,
  }
}

export async function updateFollowupReminderDays(days: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('doctor_settings')
    .upsert(
      { doctor_id: user.id, followup_reminder_days: days, updated_at: new Date().toISOString() },
      { onConflict: 'doctor_id' }
    )
}

export async function updatePaidSessionsEnabled(enabled: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('doctor_settings')
    .upsert(
      { doctor_id: user.id, paid_sessions_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'doctor_id' }
    )
}

export async function addPaidSessions(patientId: string, amount: number, note: string): Promise<void> {
  uuidSchema.parse(patientId)
  addPaidSessionsSchema.parse({ amount, note })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Атомарное обновление через RPC — защита от race condition
  await supabase.rpc('increment_paid_sessions', {
    p_patient_id: patientId,
    p_doctor_id: user.id,
    p_amount: amount,
  })

  await supabase.from('payment_history').insert({
    patient_id: patientId,
    doctor_id: user.id,
    amount,
    note: note.trim() || null,
  })
}

export async function decrementPaidSession(
  patientId: string
): Promise<{ prevCount: number; newCount: number }> {
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { prevCount: 0, newCount: 0 }

  const { data } = await supabase.rpc('decrement_paid_session', {
    p_patient_id: patientId,
    p_doctor_id: user.id,
  })

  const result = data?.[0] || { prev_count: 0, new_count: 0 }
  const prevCount = result.prev_count ?? 0
  const newCount = result.new_count ?? 0

  if (prevCount > 0) {
    await supabase.from('payment_history').insert({
      patient_id: patientId,
      doctor_id: user.id,
      amount: -1,
      note: 'авто',
    })
  }

  return { prevCount, newCount }
}

export async function getPaymentHistory(patientId: string): Promise<
  { id: string; amount: number; note: string | null; created_at: string }[]
> {
  uuidSchema.parse(patientId)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('payment_history')
    .select('id, amount, note, created_at')
    .eq('patient_id', patientId)
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

export async function getUnpaidPatients(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: settings } = await supabase
    .from('doctor_settings')
    .select('paid_sessions_enabled')
    .eq('doctor_id', user.id)
    .single()

  if (settings?.paid_sessions_enabled === false) return []

  const { data: zeroPatients } = await supabase
    .from('patients')
    .select('id, name')
    .eq('doctor_id', user.id)
    .eq('paid_sessions', 0)

  if (!zeroPatients || zeroPatients.length === 0) return []

  const patientIds = zeroPatients.map(p => p.id)

  // Показываем только пациентов, которым ранее начислялись оплаченные сеансы
  // (есть записи в payment_history), но сейчас paid_sessions === 0
  const { data: withHistory } = await supabase
    .from('payment_history')
    .select('patient_id')
    .in('patient_id', patientIds)
    .eq('doctor_id', user.id)

  const paidBefore = new Set((withHistory || []).map(h => h.patient_id))
  return zeroPatients.filter(p => paidBefore.has(p.id))
}
