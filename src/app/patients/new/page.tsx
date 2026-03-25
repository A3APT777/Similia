import AppShell from '@/components/AppShell'
import PatientForm from '@/components/PatientForm'
import { createPatient } from '@/lib/actions/patients'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'

export default async function NewPatientPage() {
  const lang = await getLang()
  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm">
            ← {t(lang).patientCard.back}
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{t(lang).patientCard.newPatient}</h1>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <PatientForm action={createPatient} submitLabel={t(lang).patientCard.createPatient} />
        </div>
      </div>
    </AppShell>
  )
}
