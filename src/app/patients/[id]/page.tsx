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
  const dynamicsLabel = lastFollowup?.status === 'better'
    ? (lang === 'ru' ? '↑ Улучшение' : '↑ Improvement')
    : lastFollowup?.status === 'worse'
      ? (lang === 'ru' ? '↓ Ухудшение' : '↓ Worsening')
      : lastFollowup?.status === 'same'
        ? (lang === 'ru' ? '→ Без изменений' : '→ No change')
        : null

  return (
    <AppShell>
      <TourSuccessToast />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* ═══ 1. ШАПКА ПАЦИЕНТА ═══ */}
        <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid #d4c9b8' }}>
          <div style={{ height: '3px', backgroundColor: '#1a3020' }} />
          <div className="p-4 sm:p-5" style={{ backgroundColor: '#f0ebe3' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold leading-tight" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a1a0a' }}>
                  {patient.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  {patient.birth_date && (
                    <span className="text-sm" style={{ color: '#5a5040' }}>{getAge(patient.birth_date)}</span>
                  )}
                  {patient.phone && (
                    <>
                      <span className="text-gray-300">·</span>
                      <a href={`tel:${patient.phone}`} className="text-sm hover:text-emerald-700 transition-colors" style={{ color: '#5a5040' }}>{patient.phone}</a>
                    </>
                  )}
                  {patient.email && (
                    <>
                      <span className="text-gray-300">·</span>
                      <a href={`mailto:${patient.email}`} className="text-sm hover:text-emerald-700 transition-colors truncate" style={{ color: '#5a5040' }}>{patient.email}</a>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[12px]" style={{ color: '#9a8a6a' }}>
                  <span>{t(lang).patientCard.firstVisit} {formatDate(patient.first_visit_date)}</span>
                  {lastVisitDate && (
                    <>
                      <span>·</span>
                      <span>{lang === 'ru' ? 'Последний' : 'Last'}: {formatDate(lastVisitDate)}</span>
                    </>
                  )}
                  {patient.constitutional_type && (
                    <>
                      <span>·</span>
                      <span className="font-medium" style={{ color: '#2d6a4f' }}>{patient.constitutional_type}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={`/patients/${id}/export`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-2 py-1.5 rounded-lg transition-colors">PDF</a>
                <Link href={`/patients/${id}/edit`} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-2 py-1.5 rounded-lg transition-colors">{t(lang).patientCard.edit}</Link>
                <DeletePatientButton patientId={id} patientName={patient.name} />
              </div>
            </div>

            {/* CTA: Начать приём */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #d4c9b8' }}>
              <form action={newChronicConsultation}>
                <button type="submit" className="flex items-center gap-2 font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#1a3020', color: '#f7f3ed', borderRadius: '8px', fontSize: '14px', padding: '9px 18px' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {lang === 'ru' ? 'Начать приём' : 'Start appointment'}
                </button>
              </form>
              <form action={newAcuteConsultation}>
                <button type="submit" className="flex items-center gap-2 font-medium transition-opacity hover:opacity-90" style={{ border: '1.5px solid #c8a035', color: '#c8a035', borderRadius: '8px', fontSize: '13px', padding: '8px 14px' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  {t(lang).patientCard.acute}
                </button>
              </form>
              <ScheduleButton patientId={id} />
            </div>
          </div>
        </div>

        {/* ═══ 2. РЕЗЮМЕ СЛУЧАЯ ═══ */}
        {(lastComplaints || currentPrescription || dynamicsLabel || patient.notes) && (
          <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#9a8a6a' }}>
              {lang === 'ru' ? 'Резюме случая' : 'Case summary'}
            </h2>
            <div className="space-y-2">
              {lastComplaints && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] shrink-0 mt-0.5" style={{ color: '#9a8a6a' }}>{lang === 'ru' ? 'Жалобы:' : 'Complaints:'}</span>
                  <span className="text-sm text-gray-700 leading-snug">{lastComplaints.split('\n')[0].replace(/^ЖАЛОБЫ\n?—?\n?/i, '').trim() || lastComplaints.substring(0, 120)}</span>
                </div>
              )}
              {dynamicsLabel && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] shrink-0 mt-0.5" style={{ color: '#9a8a6a' }}>{lang === 'ru' ? 'Динамика:' : 'Progress:'}</span>
                  <span className={`text-sm font-medium ${lastFollowup?.status === 'better' ? 'text-emerald-600' : lastFollowup?.status === 'worse' ? 'text-red-500' : 'text-gray-500'}`}>
                    {dynamicsLabel}{currentPrescription ? ` ${lang === 'ru' ? 'после' : 'after'} ${currentPrescription.remedy} ${currentPrescription.potency || ''}` : ''}
                  </span>
                </div>
              )}
              {patient.notes && (
                <div className="flex items-start gap-2">
                  <span className="text-[11px] shrink-0 mt-0.5" style={{ color: '#9a8a6a' }}>{lang === 'ru' ? 'Заметка:' : 'Note:'}</span>
                  <span className="text-sm text-gray-500 italic leading-snug">{patient.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ 3. ТЕКУЩЕЕ НАЗНАЧЕНИЕ ═══ */}
        {currentPrescription && (
          <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: '#e8f0e8', border: '1px solid rgba(45,106,79,0.2)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#2d6a4f' }}>
                {lang === 'ru' ? 'Текущее назначение' : 'Current prescription'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: '#2d6a4f' }}>
                {lang === 'ru' ? '● активно' : '● active'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a3020' }}>
                {currentPrescription.remedy}
              </span>
              <span className="text-sm" style={{ color: '#2d6a4f' }}>{currentPrescription.potency}</span>
              {currentPrescription.pellets && (
                <span className="text-xs text-gray-400">· {currentPrescription.pellets} {t(lang).timeline.pellets}</span>
              )}
            </div>
            {currentPrescription.dosage && (
              <p className="text-xs mt-1" style={{ color: '#5a5040' }}>{currentPrescription.dosage}</p>
            )}
            {currentPrescription.recommendations && (
              <p className="text-xs mt-1 italic" style={{ color: '#5a5040' }}>{currentPrescription.recommendations}</p>
            )}
            <p className="text-[11px] mt-2" style={{ color: '#9a8a6a' }}>{formatDate(currentPrescription.date)}</p>
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
          <div className="mb-5 rounded-2xl p-6 text-center" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1.5px dashed var(--color-primary)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>{lang === 'ru' ? 'Начните первый приём' : 'Start first appointment'}</p>
            <p className="text-xs text-gray-400 mb-4">{lang === 'ru' ? 'Создайте консультацию — жалобы, наблюдения, назначение' : 'Create a consultation — complaints, observations, prescription'}</p>
            <form action={newChronicConsultation} className="inline-block">
              <button type="submit" className="font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#1a3020', color: '#f7f3ed', borderRadius: '8px', fontSize: '14px', padding: '10px 24px' }}>{lang === 'ru' ? '→ Начать приём' : '→ Start appointment'}</button>
            </form>
          </div>
        ) : (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-primary)' }}>
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
              <h2 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9a8a6a' }}>{t(lang).patientCard.intakes}</h2>
              {completedPrimaryIntake?.answers && <IntakeView answers={completedPrimaryIntake.answers} completedAt={completedPrimaryIntake.completed_at} type="primary" />}
              {completedAcuteIntake?.answers && <IntakeView answers={completedAcuteIntake.answers} completedAt={completedAcuteIntake.completed_at} type="acute" />}
            </div>
          )}

          {/* Фото */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid #d4c9b8' }}>
            <PhotoSection patientId={id} photos={photos || []} />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  )
}
