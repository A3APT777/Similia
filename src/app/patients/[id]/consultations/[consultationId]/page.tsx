import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

  // Авторизация через NextAuth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const [consultation, patient] = await Promise.all([
    prisma.consultation.findFirst({ where: { id: consultationId, doctorId: userId } }),
    prisma.patient.findFirst({ where: { id, doctorId: userId } }),
  ])

  if (!consultation || !patient) notFound()

  const [previousConsultation, visitCount] = await Promise.all([
    prisma.consultation.findFirst({
      where: {
        patientId: id,
        doctorId: userId,
        id: { not: consultationId },
        createdAt: { lt: consultation.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.consultation.count({
      where: {
        patientId: id,
        doctorId: userId,
        status: { not: 'cancelled' },
      },
    }),
  ])

  const name = session.user.name || session.user.email || ''
  const [{ paid_sessions_enabled }, surveyByConsultation, realPatientCount, primaryIntake] = await Promise.all([
    getDoctorSettings(),
    getPreVisitSurveyByConsultation(consultationId),
    prisma.patient.count({ where: { doctorId: userId, isDemo: false } }),
    prisma.intakeForm.findFirst({
      where: { patientId: id, doctorId: userId, type: 'primary', status: 'completed' },
      select: { answers: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  // Fallback: если survey не привязан к консультации — берём последний completed для пациента
  const preVisitSurvey = surveyByConsultation || await getLatestPatientSurvey(id)

  // Маппинг camelCase → snake_case для совместимости с ConsultationEditor
  const consultationMapped = {
    ...consultation,
    patient_id: consultation.patientId,
    doctor_id: consultation.doctorId,
    scheduled_at: consultation.scheduledAt?.toISOString() ?? null,
    created_at: consultation.createdAt.toISOString(),
    updated_at: consultation.updatedAt.toISOString(),
    reaction_to_previous: consultation.reactionToPrevious,
    repertory_data: consultation.repertoryData,
    structured_symptoms: consultation.structuredSymptoms,
    case_state: consultation.caseState,
    clinical_assessment: consultation.clinicalAssessment,
    doctor_dynamics: consultation.doctorDynamics,
    modality_worse_text: consultation.modalityWorseText,
    modality_better_text: consultation.modalityBetterText,
    mental_text: consultation.mentalText,
    general_text: consultation.generalText,
    ai_result: consultation.aiResult,
  }

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

  const previousMapped = previousConsultation ? {
    ...previousConsultation,
    patient_id: previousConsultation.patientId,
    doctor_id: previousConsultation.doctorId,
    scheduled_at: previousConsultation.scheduledAt?.toISOString() ?? null,
    created_at: previousConsultation.createdAt.toISOString(),
    updated_at: previousConsultation.updatedAt.toISOString(),
    reaction_to_previous: previousConsultation.reactionToPrevious,
    repertory_data: previousConsultation.repertoryData,
    structured_symptoms: previousConsultation.structuredSymptoms,
    case_state: previousConsultation.caseState,
    clinical_assessment: previousConsultation.clinicalAssessment,
    doctor_dynamics: previousConsultation.doctorDynamics,
    modality_worse_text: previousConsultation.modalityWorseText,
    modality_better_text: previousConsultation.modalityBetterText,
    mental_text: previousConsultation.mentalText,
    general_text: previousConsultation.generalText,
    ai_result: previousConsultation.aiResult,
  } : null

  return (
    <div className="min-h-[100dvh] bg-[var(--sim-bg-card, #f5f0e8)] flex flex-col">
      {/* Шапка */}
      <nav className="h-[54px] bg-[var(--sim-bg-card, #f5f0e8)] border-b border-gray-100 px-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
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
        consultation={consultationMapped}
        patient={patientMapped}
        previousConsultation={previousMapped}
        paidSessionsEnabled={paid_sessions_enabled}
        visitNumber={visitCount ?? 1}
        preVisitSurvey={preVisitSurvey}
        primaryIntakeAnswers={primaryIntake?.answers || null}
        showAI={realPatientCount >= 5}
      />
    </div>
  )
}
