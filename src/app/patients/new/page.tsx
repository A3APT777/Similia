import AppShell from '@/components/AppShell'
import PatientForm from '@/components/PatientForm'
import { createPatient } from '@/lib/actions/patients'
import Link from 'next/link'

export default function NewPatientPage() {
  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Назад
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Новый пациент</h1>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <PatientForm action={createPatient} submitLabel="Создать пациента" />
        </div>
      </div>
    </AppShell>
  )
}
