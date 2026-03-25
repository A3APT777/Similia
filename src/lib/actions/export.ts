'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function exportAllData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const [patients, consultations, intakes, followups, surveys] = await Promise.all([
      supabase
        .from('patients')
        .select('name, birth_date, phone, email, constitutional_type, gender, notes, first_visit_date, created_at')
        .eq('doctor_id', user.id)
        .eq('is_demo', false)
        .order('name'),
      supabase
        .from('consultations')
        .select('patient_id, type, status, notes, scheduled_at, created_at, completed_at')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('intake_forms')
        .select('patient_id, type, status, answers, completed_at, created_at')
        .eq('doctor_id', user.id),
      supabase
        .from('followups')
        .select('consultation_id, status, response, created_at, responded_at'),
      supabase
        .from('pre_visit_surveys')
        .select('consultation_id, patient_id, status, answers, created_at, completed_at'),
    ])

    return {
      success: true,
      data: {
        exported_at: new Date().toISOString(),
        patients: patients.data || [],
        consultations: consultations.data || [],
        intake_forms: intakes.data || [],
        followups: followups.data || [],
        pre_visit_surveys: surveys.data || [],
      },
    }
  } catch (err) {
    console.error('[exportAllData]', err)
    return { success: false, data: null }
  }
}
