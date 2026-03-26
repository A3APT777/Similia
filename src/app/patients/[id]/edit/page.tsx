import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PatientForm from '@/components/PatientForm'
import { updatePatient } from '@/lib/actions/patients'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Авторизация через NextAuth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: userId },
  })

  if (!patient) notFound()

  // Маппинг camelCase → snake_case для совместимости с PatientForm
  const patientMapped = {
    ...patient,
    doctor_id: patient.doctorId,
    birth_date: patient.birthDate,
    first_visit_date: patient.firstVisitDate,
    constitutional_type: patient.constitutionalType,
    paid_sessions: patient.paidSessions,
    is_demo: patient.isDemo,
    created_at: patient.createdAt.toISOString(),
    updated_at: patient.updatedAt.toISOString(),
  }

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

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <PatientForm patient={patientMapped} action={update} submitLabel={t(lang).patientCard.save} />
        </div>
      </div>
    </AppShell>
  )
}
