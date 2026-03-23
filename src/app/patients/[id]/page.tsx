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


export default async function PatientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { id } = await params
  const { welcome } = await searchParams
  const isWelcome = welcome === '1'
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

  // Вычисляемые данные
  const currentPrescription = lastCompleted && lastCompleted.remedy ? lastCompleted : null
  const lastComplaints = lastCompleted?.complaints || ''
  const lastFollowup = lastCompleted ? followupByConsultation[lastCompleted.id] : null
  const caseState = lastCompleted?.case_state
  const assessment = lastCompleted?.clinical_assessment as { summary?: string } | null
  const hasAcute = consultations?.some(c => c.type === 'acute' && c.status !== 'completed')

  const STATE_CONFIG: Record<string, { label: { ru: string; en: string }; color: string }> = {
    improving:     { label: { ru: 'Улучшение',    en: 'Improving' },     color: '#059669' },
    aggravation:   { label: { ru: 'Обострение',   en: 'Aggravation' },   color: '#d97706' },
    no_effect:     { label: { ru: 'Нет эффекта',  en: 'No effect' },     color: '#6b7280' },
    deterioration: { label: { ru: 'Ухудшение',    en: 'Worsening' },     color: '#dc2626' },
    relapse:       { label: { ru: 'Рецидив',      en: 'Relapse' },       color: '#ea580c' },
    unclear:       { label: { ru: 'Наблюдение',   en: 'Monitoring' },    color: '#6b7280' },
  }

  const patientStatus = hasAcute
    ? { label: lang === 'ru' ? 'Острый случай' : 'Acute', color: '#dc2626' }
    : caseState && STATE_CONFIG[caseState]
      ? { label: STATE_CONFIG[caseState].label[lang], color: STATE_CONFIG[caseState].color }
      : lastFollowup?.status === 'better'
        ? { label: lang === 'ru' ? 'Улучшение' : 'Improving', color: '#059669' }
        : lastFollowup?.status === 'worse'
          ? { label: lang === 'ru' ? 'Ухудшение' : 'Worsening', color: '#dc2626' }
          : consultations && consultations.length > 0
            ? { label: lang === 'ru' ? 'Наблюдение' : 'Monitoring', color: '#6b7280' }
            : { label: lang === 'ru' ? 'Новый' : 'New', color: '#2563eb' }

  const dynamicsInfo = caseState === 'improving' || lastFollowup?.status === 'better'
    ? { arrow: '↑', text: lang === 'ru' ? 'Улучшение' : 'Improvement', color: '#059669' }
    : caseState === 'deterioration' || lastFollowup?.status === 'worse'
      ? { arrow: '↓', text: lang === 'ru' ? 'Ухудшение' : 'Worsening', color: '#dc2626' }
      : caseState === 'no_effect' || lastFollowup?.status === 'same'
        ? { arrow: '→', text: lang === 'ru' ? 'Без изменений' : 'No change', color: '#ca8a04' }
        : caseState === 'aggravation'
          ? { arrow: '~', text: lang === 'ru' ? 'Обострение' : 'Aggravation', color: '#d97706' }
          : null

  const assessmentSummary = assessment?.summary || null
  const rawComplaint = lastComplaints
    ? lastComplaints.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l))[0]?.substring(0, 80) || ''
    : ''

  const clinicalSummary = (() => {
    if (!lastCompleted) return ''
    const isAcuteCase = lastCompleted.type === 'acute'
    const hasDynamics = lastFollowup?.status
    if (isAcuteCase && rawComplaint) return lang === 'ru' ? `Острое состояние: ${rawComplaint.toLowerCase()}` : `Acute: ${rawComplaint.toLowerCase()}`
    if (hasDynamics === 'better' && rawComplaint) return lang === 'ru' ? `${rawComplaint}. Положительная динамика` : `${rawComplaint}. Improving`
    if (hasDynamics === 'worse' && rawComplaint) return lang === 'ru' ? `${rawComplaint}. Ухудшение` : `${rawComplaint}. Worsening`
    if (hasDynamics === 'same' && rawComplaint) return lang === 'ru' ? `${rawComplaint}. Без динамики` : `${rawComplaint}. No change`
    return rawComplaint
  })()

  const symptomBullets = lastComplaints
    ? lastComplaints.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l)).slice(1, 4)
    : []

  const treatmentGoal = currentPrescription?.recommendations || ''

  return (
    <AppShell>
      <StickyPatientHeader
        name={patient.name}
        status={patientStatus}
        remedy={currentPrescription?.remedy}
        potency={currentPrescription?.potency}
      />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── Welcome ── */}
        {isWelcome && (
          <div className="mb-6 px-5 py-4 rounded-xl" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.12)' }}>
            <p className="text-sm" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru'
                ? 'Это демо-пациент. Нажмите «Начать приём» ниже, чтобы попробовать.'
                : 'Demo patient. Click "Start appointment" below to try it.'}
            </p>
          </div>
        )}

        {/* ═══ HERO ═══ */}
        <div data-tour="patient-hero" className="mb-8">
          {/* Статус + тулбар */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: patientStatus.color }}
              />
              <span className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: patientStatus.color }}>
                {patientStatus.label}
              </span>
            </div>
            {!isWelcome && (
              <div className="flex items-center gap-1">
                <a
                  href={`/patients/${id}/export`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg transition-colors duration-200 hover:bg-black/[0.04]"
                  title="PDF"
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </a>
                <Link
                  href={`/patients/${id}/edit`}
                  className="p-2.5 rounded-lg transition-colors duration-200 hover:bg-black/[0.04]"
                  title={t(lang).patientCard.edit}
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                  </svg>
                </Link>
                <DeletePatientButton patientId={id} patientName={patient.name} />
              </div>
            )}
          </div>

          {/* Имя */}
          <h1
            className="text-[28px] sm:text-[36px] font-light leading-[1.15] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
          >
            {patient.name}
          </h1>

          {/* Мета-строка */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {patient.birth_date && (
              <span className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>{getAge(patient.birth_date)}</span>
            )}
            {patient.constitutional_type && (
              <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.06)', color: 'var(--sim-green)' }}>
                {patient.constitutional_type}
              </span>
            )}
            {patient.phone && (
              <a href={`tel:${patient.phone}`} className="text-[13px] transition-colors hover:underline" style={{ color: 'var(--sim-text-muted)' }}>{patient.phone}</a>
            )}
          </div>

          {/* Клиническая формулировка */}
          {clinicalSummary && (
            <p className="text-[15px] mt-3 leading-relaxed" style={{ color: 'var(--sim-text)' }}>
              {clinicalSummary}
            </p>
          )}

          {/* Симптомы */}
          {symptomBullets.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {symptomBullets.map((s: string, i: number) => (
                <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
                  {s}
                </p>
              ))}
            </div>
          )}

          {/* Динамика */}
          {dynamicsInfo && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-medium" style={{ color: dynamicsInfo.color }}>{dynamicsInfo.arrow} {dynamicsInfo.text}</span>
              {assessmentSummary && (
                <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>— {assessmentSummary}</span>
              )}
              {!assessmentSummary && lastFollowup?.comment && (
                <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>— {lastFollowup.comment.substring(0, 60)}</span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className={`mt-6 ${isWelcome ? 'animate-pulse' : ''}`} style={{ animationDuration: '2.5s' }}>
            <StartConsultationButton
              action={newChronicConsultation}
              label={consultations && consultations.filter(c => c.status === 'completed').length > 0
                ? (lang === 'ru' ? 'Начать повторный приём' : 'Start follow-up')
                : isWelcome
                  ? (lang === 'ru' ? 'Попробовать — начать приём' : 'Try — start appointment')
                  : (lang === 'ru' ? 'Начать первый приём' : 'Start first appointment')
              }
            />
          </div>
        </div>

        {isWelcome ? (
          <p className="text-center text-[12px] py-6" style={{ color: 'var(--sim-text-muted)' }}>
            {lang === 'ru' ? 'Остальные функции откроются после первого приёма' : 'More features after first appointment'}
          </p>
        ) : (
          <>
          <FirstTimeHint id="patient_card">
            {lang === 'ru'
              ? 'Карточка пациента — вся история в одном месте. Нажмите «Начать приём» для консультации.'
              : 'Patient card — full history. Click "Start appointment" for consultation.'}
          </FirstTimeHint>

          {/* ── Действия ── */}
          <div data-tour="action-buttons" className="mb-6 flex flex-wrap gap-2">
            <div data-tour="intake-link">
              <IntakeLinkButton patientId={id} patientName={patient.name} type={completedPrimaryIntake ? 'acute' : 'primary'} hasCompleted={!!completedPrimaryIntake} />
            </div>
            <div data-tour="schedule-btn">
              <ScheduleButton patientId={id} />
            </div>
            {(completedPrimaryIntake || lastCompleted) && (
              <SendSurveyButton patientId={id} patientName={patient.name} />
            )}
          </div>

          {/* Запланированные */}
          {consultations?.some(c => c.status === 'scheduled') && (
            <div className="mb-5 space-y-2">
              {consultations.filter(c => c.status === 'scheduled').map(consultation => (
                <div
                  key={consultation.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sim-green)' }} />
                    <span className="font-medium" style={{ color: 'var(--sim-text)' }}>
                      {t(lang).patientCard.scheduled}{' '}
                      {consultation.scheduled_at
                        ? new Date(consultation.scheduled_at).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                  <CancelAppointmentButton consultationId={consultation.id} patientId={id} />
                </div>
              ))}
            </div>
          )}

          {/* ── Лечение ── */}
          {currentPrescription && (
            <div data-tour="treatment" className="mb-6 rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
                  {lang === 'ru' ? 'Текущее лечение' : 'Current treatment'}
                </p>
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--sim-green)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sim-green)' }} />
                  {lang === 'ru' ? 'активно' : 'active'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span
                  className="text-[28px] sm:text-[32px] font-light tracking-[-0.02em]"
                  style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
                >
                  {currentPrescription.remedy}
                </span>
                <span className="text-lg font-light" style={{ color: 'var(--sim-green)' }}>
                  {currentPrescription.potency}
                </span>
              </div>

              {currentPrescription.dosage && (
                <p className="text-[13px] mt-2" style={{ color: 'var(--sim-text-muted)' }}>
                  {currentPrescription.dosage}
                </p>
              )}

              {treatmentGoal && (
                <p className="text-[13px] mt-2 pt-2" style={{ borderTop: '1px solid var(--sim-border)', color: 'var(--sim-text-muted)' }}>
                  {treatmentGoal}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--sim-border)' }}>
                <p className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>{formatDate(currentPrescription.date)}</p>
                <SharePrescriptionButton consultationId={currentPrescription.id} />
              </div>
            </div>
          )}

          {/* Follow-up */}
          {lastCompleted && (
            <div className="mb-6">
              <FollowupSection latestConsultationId={lastCompleted.id} patientId={id} existingFollowup={followupByConsultation[lastCompleted.id] || null} />
            </div>
          )}

          {/* Назначение не выписано */}
          {pendingPrescription && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: 'rgba(180,83,9,0.04)', border: '1px solid rgba(180,83,9,0.15)' }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#b45309' }} />
              <p className="text-sm flex-1" style={{ color: 'var(--sim-text)' }}>{t(lang).patientCard.noPrescription}</p>
              <a href={`/patients/${id}/consultations/${lastCompleted!.id}`} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: '#b45309' }}>
                {t(lang).patientCard.prescribe}
              </a>
            </div>
          )}

          {/* Оплаченные сессии */}
          {paid_sessions_enabled && (
            <PaidSessionsBlock patientId={id} initialCount={patient.paid_sessions ?? 0} />
          )}

          {/* ── Анкеты ── */}
          <details className="mb-5 group">
            <summary className="flex items-center justify-between py-3 cursor-pointer select-none" style={{ borderBottom: '1px solid var(--sim-border)' }}>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
                  {t(lang).patientCard.intakes}
                </p>
                {(completedPrimaryIntake || completedAcuteIntake) && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#059669' }} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <a href={`/patients/${id}/intake-edit`} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: 'var(--sim-green)' }}>
                  {lang === 'ru' ? 'Заполнить' : 'Fill'}
                </a>
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </summary>
            <div className="pt-4 space-y-3">
              {completedPrimaryIntake?.answers && <IntakeView answers={completedPrimaryIntake.answers} completedAt={completedPrimaryIntake.completed_at} type="primary" patientId={id} />}
              {completedAcuteIntake?.answers && <IntakeView answers={completedAcuteIntake.answers} completedAt={completedAcuteIntake.completed_at} type="acute" patientId={id} />}
              {!completedPrimaryIntake && !completedAcuteIntake && (
                <p className="text-[13px] py-2" style={{ color: 'var(--sim-text-muted)' }}>
                  {lang === 'ru' ? 'Анкета не заполнена. Отправьте ссылку пациенту.' : 'No intake. Send link to patient.'}
                </p>
              )}
            </div>
          </details>

          {/* ── История ── */}
          {(!consultations || consultations.length === 0) ? (
            <div className="mb-5 py-8 text-center">
              <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
                {lang === 'ru' ? 'Нажмите «Начать приём» выше — история появится здесь' : 'Click "Start appointment" — history will appear here'}
              </p>
            </div>
          ) : (
            <details className="mb-5 group" open>
              <summary className="flex items-center justify-between py-3 cursor-pointer select-none" style={{ borderBottom: '1px solid var(--sim-border)' }}>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
                  {t(lang).patientCard.timeline}
                  <span className="ml-1.5 font-normal">({consultations.length})</span>
                </p>
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <div className="pt-4">
                <TreatmentProgress consultations={consultations} followupByConsultation={followupByConsultation} />
                <TimelineWithFilter patientId={id} consultations={consultations} followupByConsultation={followupByConsultation} />
              </div>
            </details>
          )}

          {/* ── Фото ── */}
          <details className="mb-5 group">
            <summary className="flex items-center justify-between py-3 cursor-pointer select-none" style={{ borderBottom: '1px solid var(--sim-border)' }}>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
                {lang === 'ru' ? 'Фотографии' : 'Photos'}
                {photos && photos.length > 0 && <span className="ml-1.5 font-normal">({photos.length})</span>}
              </p>
              <svg className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <div className="pt-4">
              <PhotoSection patientId={id} photos={photos || []} />
            </div>
          </details>

          <div className="h-10" />
          </>
        )}
      </div>
    </AppShell>
  )
}
