'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { patientSchema, validate } from '@/lib/validation'
import { checkPatientLimit } from './subscription'

export async function createPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверка лимита подписки
  const limit = await checkPatientLimit()
  if (!limit.allowed) {
    throw new Error(`Лимит бесплатного тарифа: ${limit.max} пациентов. Перейдите на Стандарт для безлимита.`)
  }

  const raw = {
    name: (formData.get('name') as string) || '',
    birth_date: (formData.get('birth_date') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    notes: (formData.get('notes') as string) || null,
    constitutional_type: (formData.get('constitutional_type') as string) || null,
    gender: (formData.get('gender') as string) || null,
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
    gender: (formData.get('gender') as string) || null,
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

  // Атомарное каскадное удаление через SQL-функцию (транзакция)
  const { error } = await supabase.rpc('delete_patient_cascade', {
    p_patient_id: id,
    p_doctor_id: user.id,
  })

  if (error) {
    console.error('[deletePatient] error:', error)
    throw new Error('Не удалось удалить пациента')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
