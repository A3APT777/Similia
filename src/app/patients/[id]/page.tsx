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

  // Статус пациента — badge
  const hasAcute = consultations?.some(c => c.type === 'acute' && c.status !== 'completed')
  const patientStatus = hasAcute
    ? { label: lang === 'ru' ? 'ОСТРЫЙ СЛУЧАЙ' : 'ACUTE', color: '#dc2626', bg: '#fef2f2' }
    : lastFollowup?.status === 'better'
      ? { label: lang === 'ru' ? 'УЛУЧШЕНИЕ' : 'IMPROVING', color: '#16a34a', bg: '#f0fdf4' }
      : lastFollowup?.status === 'worse'
        ? { label: lang === 'ru' ? 'УХУДШЕНИЕ' : 'WORSENING', color: '#dc2626', bg: '#fef2f2' }
        : lastFollowup?.status === 'same'
          ? { label: lang === 'ru' ? 'СТАБИЛЬНО' : 'STABLE', color: '#ca8a04', bg: '#fefce8' }
          : consultations && consultations.length > 0
            ? { label: lang === 'ru' ? 'НА НАБЛЮДЕНИИ' : 'MONITORING', color: '#6b7280', bg: '#f3f4f6' }
            : { label: lang === 'ru' ? 'НОВЫЙ' : 'NEW', color: '#2563eb', bg: '#eff6ff' }

  // Динамика — стрелка + текст
  const dynamicsInfo = lastFollowup?.status === 'better'
    ? { arrow: '↑', text: lang === 'ru' ? 'Улучшение' : 'Improvement', color: '#16a34a' }
    : lastFollowup?.status === 'worse'
      ? { arrow: '↓', text: lang === 'ru' ? 'Ухудшение' : 'Worsening', color: '#dc2626' }
      : lastFollowup?.status === 'same'
        ? { arrow: '→', text: lang === 'ru' ? 'Без изменений' : 'No change', color: '#ca8a04' }
        : null

  // Ключевое состояние — первая строка жалоб, чистая
  const keyCondition = lastComplaints
    ? lastComplaints.split('\n').map((l: string) => l.trim()).filter((l: string) => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l))[0]?.substring(0, 100) || ''
    : ''

  // Симптомы как список пунктов (для блока диагноз)
  const symptomBullets = lastComplaints
    ? lastComplaints.split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l))
        .slice(0, 4)
    : []

  return (
    <AppShell>
      <TourSuccessToast />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* ═══ 1. HERO — статус + состояние + действие ═══ */}
        <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid #d4c9b8' }}>
          {/* Цветная полоса статуса */}
          <div style={{ height: '4px', backgroundColor: patientStatus.color }} />
          <div className="p-4 sm:p-5" style={{ backgroundColor: '#f0ebe3' }}>

            {/* Строка 1: статус-badge + действия */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: patientStatus.color, backgroundColor: patientStatus.bg, letterSpacing: '0.08em' }}>
                {patientStatus.label}
              </span>
              <div className="flex items-center gap-1.5">
                <a href={`/patients/${id}/export`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors">PDF</a>
                <Link href={`/patients/${id}/edit`} className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors">{t(lang).patientCard.edit}</Link>
                <DeletePatientButton patientId={id} patientName={patient.name} />
              </div>
            </div>

            {/* Строка 2: ФИО + возраст */}
            <h1 className="text-xl sm:text-2xl font-semibold leading-tight" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a1a0a' }}>
              {patient.name}
              {patient.birth_date && <span className="text-sm font-normal ml-2" style={{ color: '#8a7a6a' }}>{getAge(patient.birth_date)}</span>}
            </h1>

            {/* Строка 3: Ключевое состояние — самая важная строка */}
            {keyCondition && (
              <p className="text-sm font-medium mt-1 leading-snug" style={{ color: '#3a3020' }}>
                {keyCondition}
              </p>
            )}

            {/* Строка 4: Динамика */}
            {dynamicsInfo && (
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-lg font-bold" style={{ color: dynamicsInfo.color }}>{dynamicsInfo.arrow}</span>
                <span className="text-sm font-medium" style={{ color: dynamicsInfo.color }}>{dynamicsInfo.text}</span>
                {lastFollowup?.comment && (
                  <span className="text-xs text-gray-400 truncate max-w-[200px]">— {lastFollowup.comment.substring(0, 50)}{lastFollowup.comment.length > 50 ? '…' : ''}</span>
                )}
              </div>
            )}

            {/* Контакты — мелко */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-2 text-[11px]" style={{ color: '#a09080' }}>
              {patient.phone && <a href={`tel:${patient.phone}`} className="hover:text-emerald-700 transition-colors">{patient.phone}</a>}
              {patient.email && <><span>·</span><a href={`mailto:${patient.email}`} className="hover:text-emerald-700 transition-colors truncate">{patient.email}</a></>}
              {patient.constitutional_type && <><span>·</span><span style={{ color: '#2d6a4f' }}>{patient.constitutional_type}</span></>}
              <span>·</span>
              <span>{t(lang).patientCard.firstVisit} {formatDate(patient.first_visit_date)}</span>
              {lastVisitDate && <><span>·</span><span>{lang === 'ru' ? 'Посл.' : 'Last'}: {formatDate(lastVisitDate)}</span></>}
            </div>

            {/* CTA: единственная главная кнопка */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid #d4c9b8' }}>
              <form action={newChronicConsultation}>
                <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold tracking-wide transition-all hover:opacity-90 hover:shadow-md" style={{ backgroundColor: '#1a3020', color: '#f7f3ed', borderRadius: '12px', fontSize: '16px' }}>
                  {lang === 'ru' ? 'НАЧАТЬ ПРИЁМ' : 'START APPOINTMENT'}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
              </form>
              <div className="flex items-center justify-center gap-6 mt-2">
                <ScheduleButton patientId={id} />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 2. ТЕКУЩЕЕ ЛЕЧЕНИЕ — главный блок ═══ */}
        {currentPrescription && (
          <div className="mb-5 rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(45,106,79,0.25)' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#2d6a4f' }}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">
                {lang === 'ru' ? 'Текущее лечение' : 'Current treatment'}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                {lang === 'ru' ? '● активно' : '● active'}
              </span>
            </div>
            <div className="p-4" style={{ backgroundColor: '#f0f7f0' }}>
              {/* Препарат — крупно */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a3020' }}>
                  {currentPrescription.remedy}
                </span>
                <span className="text-lg font-semibold" style={{ color: '#2d6a4f' }}>
                  {currentPrescription.potency}
                </span>
                {currentPrescription.pellets && (
                  <span className="text-sm text-gray-500">{currentPrescription.pellets} {t(lang).timeline.pellets}</span>
                )}
              </div>
              {/* Схема приёма */}
              {currentPrescription.dosage && (
                <div className="mt-2 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#2d6a4f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm" style={{ color: '#3a3020' }}>{currentPrescription.dosage}</p>
                </div>
              )}
              {/* Рекомендации */}
              {currentPrescription.recommendations && (
                <div className="mt-1.5 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#9a8a6a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  <p className="text-sm italic" style={{ color: '#6a604a' }}>{currentPrescription.recommendations}</p>
                </div>
              )}
              <p className="text-[10px] mt-3" style={{ color: '#9a8a6a' }}>{lang === 'ru' ? 'Назначено' : 'Prescribed'}: {formatDate(currentPrescription.date)}</p>
            </div>
          </div>
        )}

        {/* ═══ 3. ДИАГНОЗ — пункты, не простыня ═══ */}
        {symptomBullets.length > 0 && (
          <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
            <h2 className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#9a8a6a' }}>
              {lang === 'ru' ? 'Ключевые жалобы' : 'Key complaints'}
            </h2>
            <ul className="space-y-1">
              {symptomBullets.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#3a3020' }}>
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2d6a4f' }} />
                  <span className="leading-snug">{s}</span>
                </li>
              ))}
            </ul>
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

          {/* Заметки */}
          {patient.notes && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
              <h2 className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#9a8a6a' }}>
                {lang === 'ru' ? 'Заметка' : 'Note'}
              </h2>
              <p className="text-sm text-gray-500 italic leading-snug">{patient.notes}</p>
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
