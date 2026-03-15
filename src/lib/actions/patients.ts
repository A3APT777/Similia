'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('patients')
    .insert({
      doctor_id: user.id,
      name: formData.get('name') as string,
      birth_date: (formData.get('birth_date') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
      first_visit_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  redirect(`/patients/${data.id}`)
}

export async function updatePatient(id: string, formData: FormData) {
  const supabase = await createClient()

  await supabase
    .from('patients')
    .update({
      name: formData.get('name') as string,
      birth_date: (formData.get('birth_date') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      notes: (formData.get('notes') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  redirect(`/patients/${id}`)
}
