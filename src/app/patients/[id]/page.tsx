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
import IntakeLinkButton from './IntakeLinkButton'
import AIIntakeLinkButton from './AIIntakeLinkButton'
import PaidSessionsBlock from './PaidSessionsBlock'
import DeletePatientButton from './DeletePatientButton'
import StickyPatientHeader from './StickyPatientHeader'
import FirstTimeHint from '@/components/FirstTimeHint'
import SendSurveyButton from './SendSurveyButton'
import StartConsultationButton from './StartConsultationButton'
import SharePrescriptionButton from './consultations/[consultationId]/SharePrescriptionButton'
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
      <StickyPatientHeader
        name={patient.name}
        status={patientStatus}
        remedy={currentPrescription?.remedy}
        potency={currentPrescription?.potency}
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* ═══ 1. HERO — чистый информационный блок ═══ */}
        <div data-tour="patient-hero" className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--sim-border)' }}>
          <div style={{ height: '3px', backgroundColor: patientStatus.color, borderRadius: '3px 3px 0 0' }} />
          <div className="p-4 sm:p-5" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>

            {/* Статус + кнопки */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: patientStatus.color, backgroundColor: patientStatus.bg }}>
                {patientStatus.label}
              </span>
              <div className="flex items-center gap-1.5">
                <a href={`/patients/${id}/export`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  PDF
                </a>
                <Link href={`/patients/${id}/edit`} className="btn btn-ghost btn-sm">
                  {t(lang).patientCard.edit}
                </Link>
                <DeletePatientButton patientId={id} patientName={patient.name} />
              </div>
            </div>

            {/* ФИО + конституция как бейдж */}
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-text)' }}>
              {patient.name}
              {patient.birth_date && <span className="text-sm font-normal ml-2" style={{ color: 'var(--sim-text-hint)' }}>{getAge(patient.birth_date)}</span>}
            </h1>
            {patient.constitutional_type && (
              <span className="inline-block mt-1.5 text-[12px] font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--sim-green)' }}>
                {patient.constitutional_type}
              </span>
            )}

            {/* Клиническая формулировка */}
            {clinicalSummary && (
              <p className="text-[15px] font-semibold mt-2 leading-snug" style={{ color: 'var(--sim-forest)' }}>
                {clinicalSummary}
              </p>
            )}

            {/* Доп. факты */}
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

            {/* Динамика */}
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

            {/* Мета — телефон */}
            {patient.phone && (
              <div className="mt-2 text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
                <a href={`tel:${patient.phone}`} className="hover:text-emerald-700 transition-colors">{patient.phone}</a>
              </div>
            )}

            {/* Одна CTA-кнопка */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--sim-border)' }}>
              <StartConsultationButton
                action={newChronicConsultation}
                label={consultations && consultations.filter(c => c.status === 'completed').length > 0
                  ? (lang === 'ru' ? 'Начать повторный приём' : 'Start follow-up')
                  : (lang === 'ru' ? 'Начать первый приём' : 'Start first appointment')
                }
              />
            </div>
          </div>
        </div>

        <FirstTimeHint id="patient_card">
          {lang === 'ru'
            ? 'Это карточка пациента — вся история в одном месте. Кнопки PDF и Редактировать — справа вверху. Анкета и запись на приём — ниже.'
            : 'This is the patient card — full history in one place. PDF and Edit buttons — top right. Questionnaire and scheduling — below.'}
        </FirstTimeHint>

        {/* ═══ 2. ДЕЙСТВИЯ — анкета, запись, оплата ═══ */}
        <div data-tour="action-buttons" className="mb-5 flex flex-wrap gap-2">
          <div data-tour="intake-link" className="flex-1 min-w-[140px]">
            <IntakeLinkButton
              patientId={id}
              patientName={patient.name}
              type={completedPrimaryIntake ? 'acute' : 'primary'}
              hasCompleted={!!completedPrimaryIntake}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <AIIntakeLinkButton patientId={id} />
          </div>
          <div data-tour="schedule-btn" className="flex-1 min-w-[140px]">
            <ScheduleButton patientId={id} />
          </div>
          {(completedPrimaryIntake || lastCompleted) && (
            <div className="flex-1 min-w-[140px]">
              <SendSurveyButton patientId={id} patientName={patient.name} />
            </div>
          )}
        </div>

        {/* Запланированные приёмы */}
        {consultations?.some(c => c.status === 'scheduled') && (
          <div className="mb-4 space-y-1.5">
            {consultations.filter(c => c.status === 'scheduled').map(consultation => (
              <div key={consultation.id} className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.15)' }}>
                <span className="font-medium" style={{ color: 'var(--sim-green)' }}>
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

        {/* ═══ 3. ТЕКУЩЕЕ ЛЕЧЕНИЕ + FOLLOW-UP — связанный блок ═══ */}
        {currentPrescription && (
          <div data-tour="treatment" className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(45,106,79,0.3)' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--sim-green)' }}>
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-white">
                {lang === 'ru' ? 'Текущее лечение' : 'Current treatment'}
              </h2>
              <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {lang === 'ru' ? '● активно' : '● active'}
              </span>
            </div>
            <div className="p-4 sm:p-5" style={{ backgroundColor: 'var(--sim-green-light)' }}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-forest)', letterSpacing: '-0.01em' }}>
                  {currentPrescription.remedy}
                </span>
                <span className="text-xl font-bold" style={{ color: 'var(--sim-green)' }}>
                  {currentPrescription.potency}
                </span>
              </div>
              {currentPrescription.dosage && (
                <div className="flex items-start gap-2 mt-3 text-[13px]" style={{ color: 'var(--sim-text-sec)' }}>
                  <span className="shrink-0 mt-0.5 font-semibold" style={{ color: 'var(--sim-green)' }}>Rx</span>
                  <span>{currentPrescription.dosage}</span>
                </div>
              )}
              {treatmentGoal && (
                <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(45,106,79,0.15)' }}>
                  <p className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--sim-green)' }}>
                    {lang === 'ru' ? 'Цель' : 'Goal'}
                  </p>
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--sim-text-sec)' }}>{treatmentGoal}</p>
                </div>
              )}
              <p className="text-[12px] mt-2.5" style={{ color: 'var(--sim-border)' }}>{formatDate(currentPrescription.date)}</p>
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(45,106,79,0.15)' }}>
                <SharePrescriptionButton consultationId={currentPrescription.id} />
              </div>
            </div>
          </div>
        )}

        {/* Follow-up — сразу после лечения */}
        {lastCompleted && (
          <div className="mb-5">
            <FollowupSection latestConsultationId={lastCompleted.id} patientId={id} existingFollowup={followupByConsultation[lastCompleted.id] || null} />
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
            <a href={`/patients/${id}/consultations/${lastCompleted!.id}`} className="btn btn-sm" style={{ color: 'var(--sim-amber)', borderColor: 'var(--sim-amber)' }}>
              {t(lang).patientCard.prescribe}
            </a>
          </div>
        )}

        {/* Оплаченные сессии */}
        {paid_sessions_enabled && (
          <PaidSessionsBlock patientId={id} initialCount={patient.paid_sessions ?? 0} />
        )}

        {/* ═══ 4. АНКЕТЫ — collapsible ═══ */}
        <details className="mb-5 rounded-2xl overflow-hidden group" style={{ border: '1px solid var(--sim-border)' }} open={!!(completedPrimaryIntake?.answers || completedAcuteIntake?.answers)}>
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--sim-text-muted)' }}>
                {t(lang).patientCard.intakes}
              </h2>
              {(completedPrimaryIntake || completedAcuteIntake) && (
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  ✓ {lang === 'ru' ? 'заполнена' : 'filled'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/patients/${id}/intake-edit`}
                className="btn btn-ghost btn-sm"
              >
                {lang === 'ru' ? '📋 Заполнить' : '📋 Fill'}
              </a>
              <svg className="w-4 h-4 transition-transform" data-details-arrow style={{ color: 'var(--sim-text-hint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </summary>
          <div className="px-4 pb-4 space-y-3">
            {completedPrimaryIntake?.answers && <IntakeView answers={completedPrimaryIntake.answers} completedAt={completedPrimaryIntake.completed_at} type="primary" patientId={id} />}
            {completedAcuteIntake?.answers && <IntakeView answers={completedAcuteIntake.answers} completedAt={completedAcuteIntake.completed_at} type="acute" patientId={id} />}
            {!completedPrimaryIntake && !completedAcuteIntake && (
              <p className="text-[13px] py-2" style={{ color: 'var(--sim-text-hint)' }}>
                {lang === 'ru' ? 'Анкета не заполнена. Отправьте ссылку пациенту — кнопка выше.' : 'No intake data. Send a link to the patient — button above.'}
              </p>
            )}
          </div>
        </details>

        {/* ═══ 5. ИСТОРИЯ ПРИЁМОВ ═══ */}
        {(!consultations || consultations.length === 0) ? (
          <div className="mb-5 rounded-2xl p-5" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1.5px dashed rgba(45,106,79,0.25)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--sim-forest)' }}>
              {lang === 'ru' ? 'Как начать работу с пациентом' : 'How to get started'}
            </p>
            <div className="space-y-2">
              {[
                lang === 'ru' ? '1. Нажмите «Начать первый приём» — откроется редактор' : '1. Click "Start first appointment" — editor will open',
                lang === 'ru' ? '2. Запишите жалобы и ключевые симптомы' : '2. Write down complaints and key symptoms',
                lang === 'ru' ? '3. Назначьте препарат в блоке «Назначение»' : '3. Prescribe a remedy in the "Prescription" block',
                lang === 'ru' ? '4. Нажмите «Завершить приём» — история появится здесь' : '4. Click "Finish" — history will appear here',
              ].map((step, i) => (
                <p key={i} className="text-[13px]" style={{ color: 'var(--sim-text-hint)' }}>{step}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-light" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-green)' }}>
                {t(lang).patientCard.timeline}
              </h2>
              <span className="text-[12px]" style={{ color: 'var(--sim-text-hint)' }}>{t(lang).patientCard.countConsultations(consultations.length)}</span>
            </div>
            <TreatmentProgress consultations={consultations} followupByConsultation={followupByConsultation} />
            <TimelineWithFilter patientId={id} consultations={consultations} followupByConsultation={followupByConsultation} />
          </div>
        )}

        {/* ═══ 6. ФОТО — collapsible ═══ */}
        <details className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--sim-border)' }}>
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
            <h2 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Фотографии' : 'Photos'}
              {photos && photos.length > 0 && <span className="ml-1.5 font-normal">({photos.length})</span>}
            </h2>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" style={{ color: 'var(--sim-text-hint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </summary>
          <div className="p-4">
            <PhotoSection patientId={id} photos={photos || []} />
          </div>
        </details>

        <div className="h-8" />
      </div>
    </AppShell>
  )
}
