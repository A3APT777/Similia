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

  async function newChronicConsultation() {
    'use server'
    await createConsultation(id, 'chronic')
  }

  async function newAcuteConsultation() {
    'use server'
    await createConsultation(id, 'acute')
  }

  return (
    <AppShell>
      <TourSuccessToast />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* Назад */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6 group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Все пациенты
        </Link>

        {/* Карточка пациента */}
        <div className="mb-5" style={{ border: '0.5px solid #d4c9b8', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ height: '3px', backgroundColor: '#1a3020' }} />
        <div className="relative p-4 sm:p-6" style={{ backgroundColor: '#f0ebe3' }}>
          {/* Пульсатилла — декоративный элемент в правом углу */}
          <div
            className="absolute right-0 top-0 w-28 h-28 sm:w-36 sm:h-36 bg-no-repeat bg-right-top bg-contain pointer-events-none"
            style={{ backgroundImage: 'url(/illustrations/pulsatilla.jpg)', opacity: 0.07 }}
          />
          <div className="flex items-start gap-3 sm:gap-4 relative z-10">
            {/* Большой аватар */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#1a3020' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f7f3ed', lineHeight: 1 }}>
                {patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold leading-tight" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a1a0a' }}>{patient.name}</h1>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`/patients/${id}/export`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span className="hidden sm:inline">PDF</span>
                  </a>
                  <Link
                    href={`/patients/${id}/edit`}
                    className="text-xs text-gray-400 hover:text-gray-700 transition-colors border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="hidden sm:inline">Изменить</span>
                    <svg className="w-3.5 h-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </Link>
                  <DeletePatientButton patientId={id} patientName={patient.name} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {patient.birth_date && (
                  <span className="text-[15px]" style={{ color: '#5a5040' }}>{getAge(patient.birth_date)}</span>
                )}
                {patient.phone && (
                  <a href={`tel:${patient.phone}`} className="text-[15px] hover:text-emerald-700 transition-colors" style={{ color: '#5a5040' }}>
                    {patient.phone}
                  </a>
                )}
                {patient.email && (
                  <a href={`mailto:${patient.email}`} className="text-[15px] hover:text-emerald-700 transition-colors truncate" style={{ color: '#5a5040' }}>
                    {patient.email}
                  </a>
                )}
              </div>
              {/* Конституциональный тип */}
              {patient.constitutional_type && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[13px]" style={{ color: '#9a8a6a' }}>Конст. тип:</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13px', fontWeight: 500, padding: '3px 12px', borderRadius: '20px', border: '1px solid #2d6a4f', color: '#1a3020', backgroundColor: '#e8f0e8' }}>
                    {patient.constitutional_type}
                  </span>
                </div>
              )}
              {patient.notes && (
                <p className="mt-2 italic" style={{ fontSize: '14px', color: '#5a5040', lineHeight: '1.6' }}>{patient.notes}</p>
              )}
              <p className="mt-1.5" style={{ fontSize: '13px', color: '#9a8a6a' }}>
                Первый приём: {formatDate(patient.first_visit_date)}
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Кнопки действий */}
        <div className="mb-5 flex flex-wrap gap-2">
          <form action={newChronicConsultation}>
            <button
              type="submit"
              className="flex items-center gap-2 font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1a3020', color: '#f7f3ed', borderRadius: '8px', fontSize: '15px', fontWeight: 500, padding: '11px 20px' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Хроническая консультация</span>
              <span className="sm:hidden">Консультация</span>
            </button>
          </form>
          <form action={newAcuteConsultation}>
            <button
              type="submit"
              className="flex items-center gap-2 font-medium transition-opacity hover:opacity-90"
              style={{ border: '1.5px solid #c8a035', color: '#c8a035', backgroundColor: 'transparent', borderRadius: '8px', fontSize: '14px', padding: '10px 18px' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Острый случай
            </button>
          </form>
          <ScheduleButton patientId={id} />
        </div>

        {/* Блок оплаченных консультаций */}
        {paid_sessions_enabled && (
          <PaidSessionsBlock
            patientId={id}
            initialCount={patient.paid_sessions ?? 0}
          />
        )}

        {/* Баннер о невыписанном назначении */}
        {pendingPrescription && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
            <svg className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Назначение не выписано</p>
              <p className="text-xs text-amber-600 mt-0.5">Последняя консультация завершена без указания препарата</p>
            </div>
            <a
              href={`/patients/${id}/consultations/${lastCompleted.id}`}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 hover:border-amber-400 rounded-lg px-3 py-1.5 transition-colors shrink-0"
            >
              Выписать
            </a>
          </div>
        )}

        {/* Анкеты пациента (заполненные до регистрации) */}
        {(completedPrimaryIntake || completedAcuteIntake) && (
          <div className="mb-5 space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Анкеты пациента
            </h2>

            {completedPrimaryIntake?.answers && (
              <IntakeView
                answers={completedPrimaryIntake.answers}
                completedAt={completedPrimaryIntake.completed_at}
                type="primary"
              />
            )}
            {completedAcuteIntake?.answers && (
              <IntakeView
                answers={completedAcuteIntake.answers}
                completedAt={completedAcuteIntake.completed_at}
                type="acute"
              />
            )}
          </div>
        )}

        {/* Динамика лечения (цепочка: препарат → реакция → следующий) */}
        <TreatmentProgress
          consultations={consultations || []}
          followupByConsultation={followupByConsultation}
        />

        {/* Follow-up */}
        {lastCompleted && (
          <FollowupSection
            latestConsultationId={lastCompleted.id}
            patientId={id}
            existingFollowup={followupByConsultation[lastCompleted.id] || null}
          />
        )}

        {/* Фото динамики */}
        <div className="mb-6 rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid #d4c9b8' }}>
          <PhotoSection patientId={id} photos={photos || []} />
        </div>

        {/* Таймлайн лечения */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-primary)' }}>
              Таймлайн лечения
            </h2>
            <span className="text-xs text-gray-300">
              {consultations?.length || 0} {(consultations?.length || 0) === 1 ? 'консультация' : (consultations?.length || 0) < 5 ? 'консультации' : 'консультаций'}
            </span>
          </div>

          {/* Кнопки отмены запланированных — отдельно от таймлайна */}
          {consultations?.some(c => c.status === 'scheduled') && (
            <div className="mb-4 space-y-1.5">
              {consultations.filter(c => c.status === 'scheduled').map(consultation => (
                <div key={consultation.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm">
                  <span className="text-emerald-700 font-medium">
                    Запись:{' '}
                    {consultation.scheduled_at
                      ? new Date(consultation.scheduled_at).toLocaleString('ru-RU', {
                          timeZone: 'Europe/Moscow',
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })
                      : ''}
                  </span>
                  <CancelAppointmentButton consultationId={consultation.id} patientId={id} />
                </div>
              ))}
            </div>
          )}

          <TimelineWithFilter
            patientId={id}
            consultations={consultations || []}
            followupByConsultation={followupByConsultation}
          />
        </div>
      </div>
    </AppShell>
  )
}
