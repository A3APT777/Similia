'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getDoctorSettings(): Promise<{ paid_sessions_enabled: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { paid_sessions_enabled: true }

  const { data } = await supabase
    .from('doctor_settings')
    .select('paid_sessions_enabled')
    .eq('doctor_id', user.id)
    .single()

  return { paid_sessions_enabled: data?.paid_sessions_enabled ?? false }
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('paid_sessions')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()

  if (!patient) return

  const newCount = (patient.paid_sessions ?? 0) + amount
  await supabase.from('patients').update({ paid_sessions: newCount }).eq('id', patientId).eq('doctor_id', user.id)

  await supabase.from('payment_history').insert({
    patient_id: patientId,
    doctor_id: user.id,
    amount,
    note: note.trim() || null,
  })
}

export async function getPaymentHistory(patientId: string): Promise<
  { id: string; amount: number; note: string | null; created_at: string }[]
> {
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

export async function decrementPaidSession(
  patientId: string
): Promise<{ prevCount: number; newCount: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { prevCount: 0, newCount: 0 }

  const { data: patient } = await supabase
    .from('patients')
    .select('paid_sessions')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()

  const prevCount = patient?.paid_sessions ?? 0
  if (prevCount === 0) return { prevCount: 0, newCount: 0 }

  const newCount = prevCount - 1
  await supabase.from('patients').update({ paid_sessions: newCount }).eq('id', patientId).eq('doctor_id', user.id)
  await supabase.from('payment_history').insert({
    patient_id: patientId,
    doctor_id: user.id,
    amount: -1,
    note: 'авто',
  })

  return { prevCount, newCount }
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
