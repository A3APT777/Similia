import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PatientListClient from './PatientListClient'
import AppointmentList from './AppointmentList'
import MoscowClock from '@/components/MoscowClock'
import CalendarWidget from './CalendarWidget'
import NewPatientButton from './NewPatientButton'
import OnboardingBanner from './OnboardingBanner'
import UnpaidWidget from './UnpaidWidget'
import { getUnpaidPatients } from '@/lib/actions/payments'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Параллельные запросы — не зависят друг от друга
  const [
    { data: appointments },
    { data: patients },
    { data: recentConsultations },
    { data: recentFollowups },
    { data: bookingRequests },
    unpaidPatients,
  ] = await Promise.all([
    supabase
      .from('consultations')
      .select('*, patients(id, name, phone)')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .lte('scheduled_at', in30days)
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('patients')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase
      .from('consultations')
      .select('remedy, date, status')
      .eq('status', 'completed')
      .gte('date', threeMonthsAgo),
    supabase
      .from('followups')
      .select('status')
      .not('responded_at', 'is', null)
      .gte('created_at', ninetyDaysAgoIso),
    supabase
      .from('intake_forms')
      .select('id, patient_name, answers, created_at')
      .eq('doctor_id', user.id)
      .eq('status', 'pending')
      .eq('answers->>_booking', 'true')
      .order('created_at', { ascending: false })
      .limit(10),
    getUnpaidPatients(),
  ])

  // Один запрос для всех последних консультаций вместо N+1
  const patientIds = (patients || []).map(p => p.id)
  const { data: allLastConsultations } = patientIds.length > 0
    ? await supabase
        .from('consultations')
        .select('patient_id, date, notes, remedy')
        .in('patient_id', patientIds)
        .eq('status', 'completed')
        .order('date', { ascending: false })
    : { data: [] }

  const lastConsultationMap = new Map<string, { date: string; notes: string | null; remedy: string | null }>()
  for (const c of (allLastConsultations || [])) {
    if (!lastConsultationMap.has(c.patient_id)) {
      lastConsultationMap.set(c.patient_id, c)
    }
  }

  const patientsWithConsultations = (patients || []).map(patient => {
    const last = lastConsultationMap.get(patient.id) || null
    return {
      ...patient,
      last_consultation_date: last?.date || null,
      last_consultation_preview: last?.notes || null,
      pending_prescription: last ? !last.remedy : false,
    }
  })

  const patientsList = (patients || []).map(p => ({ id: p.id, name: p.name }))
  const name = user?.user_metadata?.name || user?.email || ''
  const firstName = name.split(' ')[0] || name

  // Приёмы сегодня (по МСК)
  const todayMsk = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
  const todayAppointments = (appointments || []).filter(a => {
    const d = new Date(a.scheduled_at!).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
    return d === todayMsk
  })

  // Самый частый препарат
  const remedyCount: Record<string, number> = {}
  for (const c of (recentConsultations || [])) {
    if (c.remedy) remedyCount[c.remedy] = (remedyCount[c.remedy] || 0) + 1
  }
  const topRemedy = Object.entries(remedyCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // Процент позитивной динамики
  const followups = recentFollowups || []
  const betterCount = followups.filter(f => f.status === 'better').length
  const betterPct = followups.length > 0 ? Math.round((betterCount / followups.length) * 100) : null

  // Онбординг
  const hasRealPatients = (patients || []).length > 0
  const hasSentIntake = (patients || []).some((p) => p.intake_sent_at)
  const hasScheduled = (appointments || []).length > 0

  const totalPatients = (patients || []).length
  const pendingCount = patientsWithConsultations.filter(p => p.pending_prescription).length
  const todayCount = todayAppointments.length
  const totalConsultations90d = (recentConsultations || []).length

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-7 flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">

        {/* ─── Левая колонка ─── */}
        <div className="flex-1 min-w-0 w-full">

          {/* Hero-баннер */}
          <div data-tour="stats" className="relative overflow-hidden rounded-2xl mb-5 lg:mb-7" style={{ background: 'linear-gradient(135deg, var(--color-sidebar) 0%, #2d5a40 100%)' }}>
            {/* Иллюстрация арники */}
            <div
              className="absolute right-0 top-0 h-full w-48 sm:w-64 opacity-20 bg-no-repeat bg-right bg-contain pointer-events-none"
              style={{ backgroundImage: 'url(/illustrations/arnica.jpg)' }}
            />
            <div className="relative z-10 px-5 sm:px-7 py-5 sm:py-6">
              <h1
                className="text-[26px] sm:text-[32px] font-light leading-tight mb-1"
                style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.95)' }}
              >
                Добрый день, {firstName}
              </h1>
              <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {todayCount > 0
                  ? `Сегодня ${todayCount} ${todayCount === 1 ? 'приём' : todayCount < 5 ? 'приёма' : 'приёмов'}`
                  : 'Сегодня нет приёмов'}
              </p>

              {/* Stat-карточки */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[22px] sm:text-[26px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.9)' }}>
                    {totalPatients}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Пациентов</p>
                </div>
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[22px] sm:text-[26px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.9)' }}>
                    {todayCount}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Сегодня</p>
                </div>
                <div className="rounded-xl px-3 py-2.5" style={{ background: pendingCount > 0 ? 'rgba(200,160,53,0.2)' : 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[22px] sm:text-[26px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: pendingCount > 0 ? 'var(--color-amber)' : 'rgba(255,255,255,0.9)' }}>
                    {pendingCount}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Без назначения</p>
                </div>
              </div>
            </div>
          </div>

          <OnboardingBanner
            hasRealPatients={hasRealPatients}
            hasSentIntake={hasSentIntake}
            hasScheduled={hasScheduled}
          />

          {/* Быстрый доступ к репертою */}
          <Link
            href="/repertory"
            className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all mb-5 group hover:bg-[#e8e0d4]"
            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#1a1a0a' }}>Репертоий</p>
              <p className="text-xs text-gray-400 mt-0.5">74 482 рубрики · Repertorium Publicum · поиск на русском и английском</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <AppointmentList appointments={(appointments || []) as any} />

          {/* Заголовок списка пациентов */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
            Пациенты
          </p>

          {/* Запись нового пациента */}
          <div data-tour="questionnaire-btn" className="mb-3">
            <NewPatientButton />
          </div>

          {/* Запросы на онлайн-запись */}
          {(bookingRequests || []).length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-2">
                Запросы на запись ({bookingRequests!.length})
              </p>
              <div className="rounded-2xl overflow-hidden divide-y" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)', borderColor: 'rgba(45,106,79,0.2)' }}>
                {bookingRequests!.map((req) => {
                  const ans = req.answers as Record<string, string> | null
                  return (
                    <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{req.patient_name || '—'}</p>
                        {ans?.patient_phone && (
                          <a href={`tel:${ans.patient_phone}`} className="text-xs text-gray-400 hover:text-emerald-700 transition-colors">
                            {ans.patient_phone}
                          </a>
                        )}
                        {ans?.preferred_date && (
                          <p className="text-xs text-teal-600 mt-0.5">
                            Желаемая дата: {new Date(ans.preferred_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </p>
                        )}
                        {ans?.message && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{ans.message}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-300 shrink-0 mt-0.5">
                        {new Date(req.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div data-tour="patient-list">
            <PatientListClient patients={patientsWithConsultations} />
          </div>
        </div>

        {/* ─── Правая колонка ─── */}
        <div className="w-full lg:w-[260px] lg:shrink-0 lg:sticky lg:top-7 space-y-4">
          <div className="hidden lg:block">
            <MoscowClock />
          </div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3 lg:hidden">
            Календарь
          </p>
          <CalendarWidget patients={patientsList} />

          {/* Аналитика за 90 дней */}
          {(totalConsultations90d > 0 || betterPct !== null || topRemedy) && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
                За последние 90 дней
              </p>
              <div className="space-y-3">
                {totalConsultations90d > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Консультаций</span>
                    <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                      {totalConsultations90d}
                    </span>
                  </div>
                )}
                {betterPct !== null && followups.length >= 3 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Стало лучше</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                      {betterPct}%
                    </span>
                  </div>
                )}
                {topRemedy && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Топ препарат</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                      {topRemedy}
                    </span>
                  </div>
                )}
                {unpaidPatients.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: '#e0d8cc' }}>
                    <UnpaidWidget patients={unpaidPatients} />
                  </div>
                )}
                {betterPct !== null && followups.length >= 3 && (
                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center justify-between text-[10px] text-gray-300 mb-1">
                      <span>Динамика самочувствия</span>
                      <span>{followups.length} отв.</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${betterPct}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                      <span>{betterCount} лучше</span>
                      <span>{followups.length - betterCount} не лучше</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
