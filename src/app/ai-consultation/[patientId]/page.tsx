import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { getLang } from '@/lib/i18n-server'
import { t } from '@/lib/shared/i18n'
import { getSubscription } from '@/lib/actions/subscription'
import { canUseAI } from '@/lib/subscription'
import AIConsultationWrapper from './AIConsultationWrapper'
import type { Consultation, IntakeForm } from '@/types'

export default async function AIConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const { patientId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Проверка AI-доступа: нет подписки/кредитов → демо
  const sub = await getSubscription()
  const aiSettings = await prisma.doctorSettings.findUnique({
    where: { doctorId: session.user.id },
    select: { aiCredits: true, subscriptionPlan: true },
  })
  const hasAI = aiSettings?.subscriptionPlan === 'ai_pro' || (aiSettings?.aiCredits ?? 0) > 0 || sub.features.ai_consultation
  if (!hasAI) redirect('/demo')

  const lang = await getLang()
  const s = t(lang)

  // Загрузить пациента
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: session.user.id },
  })

  if (!patient) notFound()

  // Параллельно: последние 5 консультаций, последняя intake-анкета (обычная + AI)
  const [consultations, intakeForms] = await Promise.all([
    prisma.consultation.findMany({
      where: { patientId, doctorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.intakeForm.findMany({
      where: { patientId, doctorId: session.user.id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
  ])

  const name = session.user.name || session.user.email || ''

  // Маппинг camelCase → snake_case для совместимости с UI
  const mappedPatient = {
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

  const mappedConsultations = consultations.map(c => ({
    ...c,
    patient_id: c.patientId,
    doctor_id: c.doctorId,
    scheduled_at: c.scheduledAt?.toISOString() ?? null,
    reaction_to_previous: c.reactionToPrevious,
    repertory_data: c.repertoryData,
    structured_symptoms: c.structuredSymptoms,
    case_state: c.caseState,
    clinical_assessment: c.clinicalAssessment,
    doctor_dynamics: c.doctorDynamics,
    modality_worse_text: c.modalityWorseText,
    modality_better_text: c.modalityBetterText,
    mental_text: c.mentalText,
    general_text: c.generalText,
    ai_result: c.aiResult,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  }))

  const mappedIntakeForms = intakeForms.map(f => ({
    ...f,
    doctor_id: f.doctorId,
    patient_id: f.patientId,
    patient_name: f.patientName,
    expires_at: f.expiresAt?.toISOString() ?? null,
    created_at: f.createdAt.toISOString(),
    completed_at: f.completedAt?.toISOString() ?? null,
  }))

  return (
    <div className="min-h-[100dvh] bg-[var(--sim-bg, #faf8f5)] flex flex-col">
      {/* Шапка */}
      <nav className="h-[54px] bg-[var(--sim-bg, #faf8f5)] border-b border-(--sim-border) px-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium truncate max-w-[140px] sm:max-w-none">{patient.name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-indigo-500 font-medium">{s.ai.consultation.title}</span>
          <span className="text-xs text-gray-300 hidden sm:block">{name.split(' ')[0]}</span>
          <LogoutButton dark={false} />
        </div>
      </nav>

      <AIConsultationWrapper
        patient={mappedPatient}
        consultations={mappedConsultations as unknown as Consultation[]}
        intakeForms={mappedIntakeForms as unknown as IntakeForm[]}
        lang={lang}
      />
    </div>
  )
}
