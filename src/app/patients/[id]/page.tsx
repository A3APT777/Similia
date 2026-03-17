import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { createConsultation } from '@/lib/actions/consultations'
import { getAge, formatDate } from '@/lib/utils'
import FollowupSection from './FollowupSection'
import ScheduleButton from '@/components/ScheduleButton'
import TimelineWithFilter from './TimelineWithFilter'
import IntakeView from './IntakeView'
import PhotoSection from './PhotoSection'
import CancelAppointmentButton from './CancelAppointmentButton'
import TreatmentProgress from './TreatmentProgress'
import TourSuccessToast from '@/components/TourSuccessToast'
import TourPatientCardStarter from '@/components/TourPatientCardStarter'
import IntakeLinkButton from './IntakeLinkButton'
import PaidSessionsBlock from './PaidSessionsBlock'
import DeletePatientButton from './DeletePatientButton'
import { getDoctorSettings } from '@/lib/actions/payments'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'


export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: consultations } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', id)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .order('date', { ascending: false })

  const consultationIds = (consultations || []).map(c => c.id)
  const { data: followups } = consultationIds.length > 0
    ? await supabase.from('followups').select('*').in('consultation_id', consultationIds)
    : { data: [] }

  const followupByConsultation = Object.fromEntries(
    (followups || []).map(f => [f.consultation_id, f])
  )

  const lastCompleted = consultations?.find(c => c.status === 'completed')
  const pendingPrescription = lastCompleted && !lastCompleted.remedy

  // Анкеты пациента (последняя первичная и последняя острая)
  const { data: photos } = await supabase
    .from('patient_photos')
    .select('*')
    .eq('patient_id', id)
    .order('taken_at', { ascending: true })

  const { data: intakeForms } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('patient_id', id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const completedPrimaryIntake = (intakeForms || []).find(f => f.type === 'primary') || null
  const completedAcuteIntake = (intakeForms || []).find(f => f.type === 'acute') || null

  const { paid_sessions_enabled } = await getDoctorSettings()
  const lang = await getLang()

  async function newChronicConsultation() {
    'use server'
    await createConsultation(id, 'chronic')
  }

  async function newAcuteConsultation() {
    'use server'
    await createConsultation(id, 'acute')
  }

  // Вычисляемые данные для новых блоков
  const lastVisitDate = consultations?.[0]?.date || null
  const currentPrescription = lastCompleted && lastCompleted.remedy ? lastCompleted : null
  const lastComplaints = lastCompleted?.complaints || ''
  const lastFollowup = lastCompleted ? followupByConsultation[lastCompleted.id] : null

  // Статус пациента — из case_state или fallback
  const caseState = lastCompleted?.case_state
  const assessment = lastCompleted?.clinical_assessment as { summary?: string } | null
  const hasAcute = consultations?.some(c => c.type === 'acute' && c.status !== 'completed')

  const STATE_CONFIG: Record<string, { label: { ru: string; en: string }; color: string; bg: string }> = {
    improving: { label: { ru: 'УЛУЧШЕНИЕ', en: 'IMPROVING' }, color: '#059669', bg: '#ecfdf5' },
    aggravation: { label: { ru: 'ОБОСТРЕНИЕ', en: 'AGGRAVATION' }, color: '#d97706', bg: '#fffbeb' },
    no_effect: { label: { ru: 'НЕТ ЭФФЕКТА', en: 'NO EFFECT' }, color: '#6b7280', bg: '#f9fafb' },
    deterioration: { label: { ru: 'УХУДШЕНИЕ', en: 'WORSENING' }, color: '#dc2626', bg: '#fef2f2' },
    relapse: { label: { ru: 'РЕЦИДИВ', en: 'RELAPSE' }, color: '#ea580c', bg: '#fff7ed' },
    unclear: { label: { ru: 'НА НАБЛЮДЕНИИ', en: 'MONITORING' }, color: '#6b7280', bg: '#f3f4f6' },
  }

  const patientStatus = hasAcute
    ? { label: lang === 'ru' ? 'ОСТРЫЙ СЛУЧАЙ' : 'ACUTE', color: '#dc2626', bg: '#fef2f2' }
    : caseState && STATE_CONFIG[caseState]
      ? { label: STATE_CONFIG[caseState].label[lang], color: STATE_CONFIG[caseState].color, bg: STATE_CONFIG[caseState].bg }
      : lastFollowup?.status === 'better'
        ? { label: lang === 'ru' ? 'УЛУЧШЕНИЕ' : 'IMPROVING', color: '#059669', bg: '#ecfdf5' }
        : lastFollowup?.status === 'worse'
          ? { label: lang === 'ru' ? 'УХУДШЕНИЕ' : 'WORSENING', color: '#dc2626', bg: '#fef2f2' }
          : consultations && consultations.length > 0
            ? { label: lang === 'ru' ? 'НА НАБЛЮДЕНИИ' : 'MONITORING', color: '#6b7280', bg: '#f3f4f6' }
            : { label: lang === 'ru' ? 'НОВЫЙ' : 'NEW', color: '#2563eb', bg: '#eff6ff' }

  // Динамика
  const dynamicsInfo = caseState === 'improving' || lastFollowup?.status === 'better'
    ? { arrow: '↑', text: lang === 'ru' ? 'Улучшение' : 'Improvement', color: '#059669' }
    : caseState === 'deterioration' || lastFollowup?.status === 'worse'
      ? { arrow: '↓', text: lang === 'ru' ? 'Ухудшение' : 'Worsening', color: '#dc2626' }
      : caseState === 'no_effect' || lastFollowup?.status === 'same'
        ? { arrow: '→', text: lang === 'ru' ? 'Без изменений' : 'No change', color: '#ca8a04' }
        : caseState === 'aggravation'
          ? { arrow: '~', text: lang === 'ru' ? 'Обострение' : 'Aggravation', color: '#d97706' }
          : null

  // Clinical summary — из assessment или собираем из текста
  const assessmentSummary = assessment?.summary || null

  // Клиническая формулировка состояния (не сырые симптомы)
  const lastType = lastCompleted?.type
  const rawComplaint = lastComplaints
    ? lastComplaints.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l))[0]?.substring(0, 80) || ''
    : ''

  const clinicalSummary = (() => {
    if (!lastCompleted) return ''
    const isAcuteCase = lastType === 'acute'
    const hasDynamics = lastFollowup?.status
    if (isAcuteCase && rawComplaint) {
      return lang === 'ru' ? `Острое состояние: ${rawComplaint.toLowerCase()}` : `Acute: ${rawComplaint.toLowerCase()}`
    }
    if (hasDynamics === 'better' && rawComplaint) {
      return lang === 'ru' ? `${rawComplaint}. Положительная динамика` : `${rawComplaint}. Improving`
    }
    if (hasDynamics === 'worse' && rawComplaint) {
      return lang === 'ru' ? `${rawComplaint}. Ухудшение` : `${rawComplaint}. Worsening`
    }
    if (hasDynamics === 'same' && rawComplaint) {
      return lang === 'ru' ? `${rawComplaint}. Без динамики` : `${rawComplaint}. No change`
    }
    return rawComplaint
  })()

  // Доп. факты — только если >1 строки жалоб
  const symptomBullets = lastComplaints
    ? lastComplaints.split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l))
        .slice(1, 4)
    : []

  // Цель лечения — из recommendations последнего назначения
  const treatmentGoal = currentPrescription?.recommendations || ''

  return (
    <AppShell>
      <TourSuccessToast />
      <TourPatientCardStarter />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* ═══ 1. HERO — мгновенное понимание ═══ */}
        <div data-tour="patient-hero" className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--sim-border)' }}>
          <div style={{ height: '4px', backgroundColor: patientStatus.color }} />
          <div className="p-4 sm:p-5" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>

            {/* Статус + мета */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: patientStatus.color, backgroundColor: patientStatus.bg }}>
                {patientStatus.label}
              </span>
              <div className="flex items-center gap-1.5">
                <a href={`/patients/${id}/export`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors">PDF</a>
                <Link href={`/patients/${id}/edit`} className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors">{t(lang).patientCard.edit}</Link>
                <DeletePatientButton patientId={id} patientName={patient.name} />
              </div>
            </div>

            {/* ФИО — крупно */}
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-text)' }}>
              {patient.name}
              {patient.birth_date && <span className="text-sm font-normal ml-2" style={{ color: 'var(--sim-text-hint)' }}>{getAge(patient.birth_date)}</span>}
            </h1>

            {/* Клиническая формулировка — суть, не симптомы */}
            {clinicalSummary && (
              <p className="text-[15px] font-semibold mt-1.5 leading-snug" style={{ color: 'var(--sim-forest)' }}>
                {clinicalSummary}
              </p>
            )}

            {/* Доп. факты — коротко */}
            {symptomBullets.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {symptomBullets.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
                    <span className="shrink-0 mt-[7px] w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--sim-text-hint)' }} />
                    <span className="leading-snug">{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Динамика — 1 строка */}
            {dynamicsInfo && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: dynamicsInfo.color + '10' }}>
                <span className="text-base font-bold" style={{ color: dynamicsInfo.color }}>{dynamicsInfo.arrow}</span>
                <span className="text-[13px] font-semibold" style={{ color: dynamicsInfo.color }}>{dynamicsInfo.text}</span>
                {assessmentSummary && (
                  <span className="text-[12px] truncate" style={{ color: dynamicsInfo.color + 'aa' }}>— {assessmentSummary}</span>
                )}
                {!assessmentSummary && lastFollowup?.comment && (
                  <span className="text-[12px] truncate" style={{ color: dynamicsInfo.color + 'aa' }}>— {lastFollowup.comment.substring(0, 60)}</span>
                )}
              </div>
            )}

            {/* Мета — почти невидимо, но кликабельно */}
            <div className="flex flex-wrap items-center gap-x-2 mt-3 text-[10px]" style={{ color: 'var(--sim-border)' }}>
              {patient.phone && <a href={`tel:${patient.phone}`} className="hover:text-emerald-700 transition-colors">{patient.phone}</a>}
              {patient.constitutional_type && <><span>·</span><span>{patient.constitutional_type}</span></>}
            </div>

            {/* CTA */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--sim-border)' }}>
              <form action={newChronicConsultation}>
                <button data-tour="new-consultation" type="submit" className="btn btn-primary btn-lg w-full">
                  {consultations && consultations.filter(c => c.status === 'completed').length > 0
                    ? (lang === 'ru' ? 'Начать повторный приём' : 'Start follow-up')
                    : (lang === 'ru' ? 'Начать первый приём' : 'Start first appointment')
                  }
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
              </form>
              <div className="flex items-center justify-center mt-1.5">
                <ScheduleButton patientId={id} />
              </div>
              <div className="mt-2" data-tour="intake-link">
                <IntakeLinkButton patientId={id} patientName={patient.name} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 2. ТЕКУЩЕЕ ЛЕЧЕНИЕ — визуально доминирует ═══ */}
        {currentPrescription && (
          <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(45,106,79,0.3)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#2d6a4f' }}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">
                {lang === 'ru' ? 'Текущее лечение' : 'Current treatment'}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {lang === 'ru' ? '● активно' : '● active'}
              </span>
            </div>
            <div className="p-4 sm:p-5" style={{ backgroundColor: 'var(--sim-green-light)' }}>
              {/* Препарат — максимально крупно */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-forest)', letterSpacing: '-0.01em' }}>
                  {currentPrescription.remedy}
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--sim-green)' }}>
                  {currentPrescription.potency}
                </span>
              </div>

              {/* Схема — компактно */}
              <div className="mt-3 space-y-1.5">
                {currentPrescription.dosage && (
                  <div className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--sim-text-sec)' }}>
                    <span className="shrink-0 mt-0.5 font-semibold" style={{ color: 'var(--sim-green)' }}>Rx</span>
                    <span>{currentPrescription.dosage}</span>
                  </div>
                )}
              </div>

              {/* Цель лечения */}
              {treatmentGoal && (
                <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(45,106,79,0.15)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--sim-green)' }}>
                    {lang === 'ru' ? 'Цель' : 'Goal'}
                  </p>
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--sim-text-sec)' }}>{treatmentGoal}</p>
                </div>
              )}

              <p className="text-[10px] mt-2.5" style={{ color: 'var(--sim-border)' }}>{formatDate(currentPrescription.date)}</p>
            </div>
          </div>
        )}

        {/* Баннер о невыписанном назначении */}
        {pendingPrescription && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">{t(lang).patientCard.noPrescription}</p>
            </div>
            <a href={`/patients/${id}/consultations/${lastCompleted!.id}`} className="text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 rounded-lg px-3 py-1.5 transition-colors shrink-0">
              {t(lang).patientCard.prescribe}
            </a>
          </div>
        )}

        {/* Блок оплаченных консультаций */}
        {paid_sessions_enabled && (
          <PaidSessionsBlock patientId={id} initialCount={patient.paid_sessions ?? 0} />
        )}

        {/* Запланированные приёмы */}
        {consultations?.some(c => c.status === 'scheduled') && (
          <div className="mb-4 space-y-1.5">
            {consultations.filter(c => c.status === 'scheduled').map(consultation => (
              <div key={consultation.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm">
                <span className="text-emerald-700 font-medium">
                  {t(lang).patientCard.scheduled}{' '}
                  {consultation.scheduled_at
                    ? new Date(consultation.scheduled_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
                <CancelAppointmentButton consultationId={consultation.id} patientId={id} />
              </div>
            ))}
          </div>
        )}

        {/* ═══ 4. ИСТОРИЯ ПРИЁМОВ ═══ */}
        {(!consultations || consultations.length === 0) ? (
          <div className="mb-5 rounded-2xl p-5 text-center" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1.5px dashed var(--color-border-light)' }}>
            <p className="text-sm text-gray-400">{lang === 'ru' ? 'Нет приёмов. Нажмите «Начать первый приём» выше.' : 'No appointments yet. Click "Start first appointment" above.'}</p>
          </div>
        ) : (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-light" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-green)' }}>
                {t(lang).patientCard.timeline}
              </h2>
              <span className="text-xs text-gray-300">{t(lang).patientCard.countConsultations(consultations.length)}</span>
            </div>

            {/* Динамика лечения */}
            <TreatmentProgress consultations={consultations} followupByConsultation={followupByConsultation} />

            <TimelineWithFilter patientId={id} consultations={consultations} followupByConsultation={followupByConsultation} />
          </div>
        )}

        {/* ═══ 5. ДОПОЛНИТЕЛЬНО ═══ */}
        <div className="space-y-4">
          {/* Follow-up */}
          {lastCompleted && (
            <FollowupSection latestConsultationId={lastCompleted.id} patientId={id} existingFollowup={followupByConsultation[lastCompleted.id] || null} />
          )}

          {/* Анкеты */}
          {(completedPrimaryIntake || completedAcuteIntake) && (
            <div className="space-y-3">
              <h2 className="sim-label">{t(lang).patientCard.intakes}</h2>
              {completedPrimaryIntake?.answers && <IntakeView answers={completedPrimaryIntake.answers} completedAt={completedPrimaryIntake.completed_at} type="primary" />}
              {completedAcuteIntake?.answers && <IntakeView answers={completedAcuteIntake.answers} completedAt={completedAcuteIntake.completed_at} type="acute" />}
            </div>
          )}

          {/* Фото */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--sim-bg-muted)', border: '1px solid var(--sim-border)' }}>
            <PhotoSection patientId={id} photos={photos || []} />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  )
}
