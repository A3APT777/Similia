import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'
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
  const lang = await getLang()
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
                className="text-[20px] sm:text-[24px] font-light leading-tight mb-3"
                style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.7)' }}
              >
                {t(lang).dashboard.greeting}, {firstName}
              </h1>

              {/* Главный акцент — приёмы сегодня */}
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-[40px] sm:text-[48px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.95)' }}>
                    {todayCount}
                  </p>
                  <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {t(lang).dashboard.todayAppointments(todayCount)}
                  </p>
                </div>
                <Link
                  href="/patients"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                  style={{ color: '#1a2e1a' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  {lang === 'ru' ? 'Начать приём' : 'Start appointment'}
                </Link>
              </div>

              {/* Stat-карточки: Today — главная, остальные — вторичные */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[18px] sm:text-[20px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.7)' }}>
                    {totalPatients}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{t(lang).dashboard.patients}</p>
                </div>
                <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.14)' }}>
                  <p className="text-[24px] sm:text-[28px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.95)' }}>
                    {todayCount}
                  </p>
                  <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{t(lang).dashboard.today}</p>
                </div>
                <div className="rounded-xl px-3 py-2.5" style={{ background: pendingCount > 0 ? 'rgba(200,160,53,0.2)' : 'rgba(255,255,255,0.08)' }}>
                  <p className="text-[18px] sm:text-[20px] font-light leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: pendingCount > 0 ? 'var(--color-amber)' : 'rgba(255,255,255,0.7)' }}>
                    {pendingCount}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{t(lang).dashboard.noPrescription}</p>
                </div>
              </div>
            </div>
          </div>

          <OnboardingBanner
            hasRealPatients={hasRealPatients}
            hasSentIntake={hasSentIntake}
            hasScheduled={hasScheduled}
          />

          <AppointmentList appointments={(appointments || []) as any} />

          {/* Заголовок списка пациентов */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
            {t(lang).dashboard.patientsSection}
          </p>

          {/* Запись нового пациента */}
          <div data-tour="questionnaire-btn" className="mb-3">
            <NewPatientButton />
          </div>

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
            {t(lang).dashboard.calendar}
          </p>
          <CalendarWidget patients={patientsList} />

          {/* Аналитика за 90 дней */}
          {(totalConsultations90d > 0 || betterPct !== null || topRemedy) && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
                {t(lang).dashboard.last90days}
              </p>
              <div className="space-y-3">
                {totalConsultations90d > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t(lang).dashboard.consultations}</span>
                    <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                      {totalConsultations90d}
                    </span>
                  </div>
                )}
                {betterPct !== null && followups.length >= 3 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t(lang).dashboard.gotBetter}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                      {betterPct}%
                    </span>
                  </div>
                )}
                {topRemedy && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t(lang).dashboard.topRemedy}</span>
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
                      <span>{t(lang).dashboard.dynamics}</span>
                      <span>{followups.length} {t(lang).dashboard.responses}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${betterPct}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                      <span>{betterCount} {t(lang).dashboard.better}</span>
                      <span>{followups.length - betterCount} {t(lang).dashboard.notBetter}</span>
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
