import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import ConsultationEditor from './ConsultationEditor'
import LogoutButton from '@/components/LogoutButton'
import { getDoctorSettings } from '@/lib/actions/payments'
import { getPreVisitSurveyByConsultation, getLatestPatientSurvey } from '@/lib/actions/surveys'

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string; consultationId: string }>
}) {
  const { id, consultationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: consultation }, { data: patient }] = await Promise.all([
    supabase.from('consultations').select('*').eq('id', consultationId).eq('doctor_id', user.id).single(),
    supabase.from('patients').select('*').eq('id', id).eq('doctor_id', user.id).single(),
  ])

  if (!consultation || !patient) notFound()

  const [{ data: previousConsultation }, { count: visitCount }] = await Promise.all([
    supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', id)
      .eq('doctor_id', user.id)
      .neq('id', consultationId)
      .lt('created_at', consultation.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('consultations')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', id)
      .eq('doctor_id', user.id)
      .neq('status', 'cancelled'),
  ])

  const name = user?.user_metadata?.name || user?.email || ''
  const [{ paid_sessions_enabled }, surveyByConsultation, { count: realPatientCount }] = await Promise.all([
    getDoctorSettings(),
    getPreVisitSurveyByConsultation(consultationId),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('is_demo', false),
  ])
  // Fallback: если survey не привязан к консультации — берём последний completed для пациента
  const preVisitSurvey = surveyByConsultation || await getLatestPatientSurvey(id)

  return (
    <div className="min-h-[100dvh] bg-[#ede7dd] flex flex-col">
      {/* Шапка */}
      <nav className="h-[54px] bg-[#ede7dd] border-b border-gray-100 px-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <Link
          href={`/patients/${id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium truncate max-w-[140px] sm:max-w-none">{patient.name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300 hidden sm:block">{name.split(' ')[0]}</span>
          <LogoutButton dark={false} />
        </div>
      </nav>

      <ConsultationEditor
        consultation={consultation}
        patient={patient}
        previousConsultation={previousConsultation || null}
        paidSessionsEnabled={paid_sessions_enabled}
        visitNumber={visitCount ?? 1}
        preVisitSurvey={preVisitSurvey}
        showAI={(realPatientCount ?? 0) >= 5}
      />
    </div>
  )
}
