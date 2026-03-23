import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PatientForm from '@/components/PatientForm'
import { updatePatient } from '@/lib/actions/patients'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'

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
  const lang = await getLang()

  async function update(formData: FormData) {
    'use server'
    await updatePatient(id, formData)
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/patients/${id}`} className="text-gray-600 hover:text-gray-900 text-sm">
            ← {t(lang).patientCard.back}
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{t(lang).patientCard.editPatient}</h1>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <PatientForm patient={patient} action={update} submitLabel={t(lang).patientCard.save} />
        </div>
      </div>
    </AppShell>
  )
}
