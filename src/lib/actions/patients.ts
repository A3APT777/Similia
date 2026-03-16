'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { patientSchema, validate } from '@/lib/validation'

export async function createPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw = {
    name: (formData.get('name') as string) || '',
    birth_date: (formData.get('birth_date') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    notes: (formData.get('notes') as string) || null,
    constitutional_type: (formData.get('constitutional_type') as string) || null,
  }

  const validationResult = validate(patientSchema, raw)
  if (validationResult.error) throw new Error(validationResult.error)
  const validated = validationResult.data!

  const { data, error } = await supabase
    .from('patients')
    .insert({
      doctor_id: user.id,
      ...validated,
      first_visit_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    console.error('[createPatient] supabase error:', error)
    throw new Error(error.message)
  }

  redirect(`/patients/${data.id}`)
}

export async function updatePatient(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw = {
    name: (formData.get('name') as string) || '',
    birth_date: (formData.get('birth_date') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    notes: (formData.get('notes') as string) || null,
    constitutional_type: (formData.get('constitutional_type') as string) || null,
  }

  const validationResult = validate(patientSchema, raw)
  if (validationResult.error) throw new Error(validationResult.error)
  const validated = validationResult.data!

  const { error } = await supabase
    .from('patients')
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('doctor_id', user.id)

  if (error) {
    console.error('[updatePatient] supabase error:', error)
    throw new Error(error.message)
  }

  revalidatePath(`/patients/${id}`)
  redirect(`/patients/${id}`)
}

export async function deletePatient(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Удаляем каскадно: сначала связанные данные, потом пациента
  await supabase.from('payment_history').delete().eq('patient_id', id).eq('doctor_id', user.id)
  await supabase.from('patient_photos').delete().eq('patient_id', id).eq('doctor_id', user.id)
  await supabase.from('photo_upload_tokens').delete().eq('patient_id', id).eq('doctor_id', user.id)

  const { data: consultations } = await supabase
    .from('consultations')
    .select('id')
    .eq('patient_id', id)
    .eq('doctor_id', user.id)

  if (consultations && consultations.length > 0) {
    const ids = consultations.map(c => c.id)
    await supabase.from('followups').delete().in('consultation_id', ids)
    await supabase.from('consultations').delete().in('id', ids)
  }

  await supabase.from('patients').delete().eq('id', id).eq('doctor_id', user.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
