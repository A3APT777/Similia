import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PatientForm from '@/components/PatientForm'
import { updatePatient } from '@/lib/actions/patients'
import Link from 'next/link'

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single()

  if (!patient) notFound()

  async function update(formData: FormData) {
    'use server'
    await updatePatient(id, formData)
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/patients/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Назад
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Редактировать пациента</h1>
        </div>

        <div className="bg-[#ede7dd] border border-gray-100 rounded-xl p-6">
          <PatientForm patient={patient} action={update} submitLabel="Сохранить" />
        </div>
      </div>
    </AppShell>
  )
}
