import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { createConsultation, cancelConsultation } from '@/lib/actions/consultations'
import { getAge, formatDate } from '@/lib/utils'
import FollowupSection from './FollowupSection'
import ScheduleButton from '@/components/ScheduleButton'
import PatientTimeline from './PatientTimeline'
import IntakeView from './IntakeView'
import PhotoSection from './PhotoSection'


export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* Назад */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6 group">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Все пациенты
        </Link>

        {/* Карточка пациента */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 mb-5 shadow-sm">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Большой аватар */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
              <span className="text-base sm:text-lg font-bold text-emerald-700">
                {patient.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">{patient.name}</h1>
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
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {patient.birth_date && (
                  <span className="text-sm text-gray-500">{getAge(patient.birth_date)}</span>
                )}
                {patient.phone && (
                  <a href={`tel:${patient.phone}`} className="text-sm text-gray-500 hover:text-emerald-700 transition-colors">
                    {patient.phone}
                  </a>
                )}
                {patient.email && (
                  <a href={`mailto:${patient.email}`} className="text-sm text-gray-500 hover:text-emerald-700 transition-colors truncate">
                    {patient.email}
                  </a>
                )}
              </div>
              {patient.notes && (
                <p className="mt-2 text-sm text-gray-400 italic">{patient.notes}</p>
              )}
              <p className="mt-1.5 text-xs text-gray-300">
                Первый приём: {formatDate(patient.first_visit_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
          <form action={newChronicConsultation}>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-900/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Хроническая консультация</span>
              <span className="sm:hidden">Консультация</span>
            </button>
          </form>
          <form action={newAcuteConsultation}>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-orange-500 text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm shadow-orange-900/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Острый случай
            </button>
          </form>
          <ScheduleButton patientId={id} />
        </div>

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

        {/* Follow-up */}
        {lastCompleted && (
          <FollowupSection
            latestConsultationId={lastCompleted.id}
            patientId={id}
            existingFollowup={followupByConsultation[lastCompleted.id] || null}
          />
        )}

        {/* Фото динамики */}
        <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <PhotoSection patientId={id} photos={photos || []} />
        </div>

        {/* Таймлайн лечения */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                  <form action={cancelConsultation.bind(null, consultation.id, id)}>
                    <button type="submit" className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                      Отменить
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <PatientTimeline
            patientId={id}
            consultations={consultations || []}
            followupByConsultation={followupByConsultation}
          />
        </div>
      </div>
    </AppShell>
  )
}
