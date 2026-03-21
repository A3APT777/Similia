import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'
import PatientListClient from './PatientListClient'
import HeroStatCards from './HeroStatCards'
import CalendarWidget from './CalendarWidget'
import LunarPhaseWidget from './LunarPhaseWidget'
import AddPatientWidget from './AddPatientWidget'
import OnboardingBanner from './OnboardingBanner'
import { getAccessiblePatientIds } from '@/lib/actions/subscription'
import UnpaidWidget from './UnpaidWidget'
import OnboardingFlow from '@/components/OnboardingFlow'
import { getUnpaidPatients } from '@/lib/actions/payments'
import { seedDemoData } from '@/lib/actions/seed'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  function pluralPatients(n: number): string {
    if (n % 100 >= 11 && n % 100 <= 19) return 'пациентов доверяют'
    const last = n % 10
    if (last === 1) return 'пациент доверяет'
    if (last >= 2 && last <= 4) return 'пациента доверяют'
    return 'пациентов доверяют'
  }

  // Создаём демо-данные при первом входе (если пациентов нет)
  const { count: patientCount } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_id', user.id)
  if ((patientCount ?? 0) === 0) {
    await seedDemoData().catch(() => null)
  }

  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const ninetyDaysAgoIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Параллельные запросы с fallback — один сбой не роняет дашборд
  // Обёртка: при ошибке возвращает { data: null } вместо throw
  async function safe<T>(fn: () => PromiseLike<{ data: T | null }>): Promise<{ data: T | null }> {
    try { return await fn() } catch { return { data: null } }
  }

  const [
    { data: appointments },
    { data: patients },
    { data: recentConsultations },
    { data: recentFollowups },
    unpaidPatients,
    { data: activeConsultations },
    { data: pendingFollowups },
  ] = await Promise.all([
    safe(() => supabase
      .from('consultations')
      .select('*, patients(id, name, phone)')
      .eq('doctor_id', user.id)
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .lte('scheduled_at', in30days)
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true })),
    safe(() => supabase
      .from('patients')
      .select('*')
      .eq('doctor_id', user.id)
      .order('updated_at', { ascending: false })),
    safe(() => supabase
      .from('consultations')
      .select('remedy, date, status')
      .eq('doctor_id', user.id)
      .eq('status', 'completed')
      .gte('date', threeMonthsAgo)),
    safe(() => supabase
      .from('followups')
      .select('status, consultations!inner(doctor_id)')
      .not('responded_at', 'is', null)
      .eq('consultations.doctor_id', user.id)
      .gte('created_at', ninetyDaysAgoIso)),
    getUnpaidPatients().catch(() => []),
    safe(() => supabase
      .from('consultations')
      .select('id, patient_id, patients(id, name)')
      .eq('doctor_id', user.id)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(1)),
    safe(() => supabase
      .from('followups')
      .select('id, patient_id, created_at, consultations!inner(doctor_id)')
      .is('responded_at', null)
      .eq('consultations.doctor_id', user.id)
      .lte('created_at', threeDaysAgoIso)),
  ])

  // Graceful downgrade — определяем заблокированных пациентов
  const { ids: accessibleIds, isLimited } = await getAccessiblePatientIds()
  const lockedPatientIds = isLimited
    ? (patients || []).filter(p => !accessibleIds.includes(p.id)).map(p => p.id)
    : []

  // Один запрос для всех последних консультаций вместо N+1
  const patientIds = (patients || []).map(p => p.id)
  const { data: allLastConsultations } = patientIds.length > 0
    ? await supabase
        .from('consultations')
        .select('patient_id, date, notes, remedy, status')
        .eq('doctor_id', user.id)
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

  // Карта patient_id → дней ожидания опросника
  const pendingFollowupMap = new Map<string, number>()
  for (const f of (pendingFollowups || [])) {
    if (!f.patient_id) continue
    const days = Math.floor((Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24))
    if (!pendingFollowupMap.has(f.patient_id) || days > (pendingFollowupMap.get(f.patient_id) ?? 0)) {
      pendingFollowupMap.set(f.patient_id, days)
    }
  }

  const patientsList = (patients || []).map(p => ({ id: p.id, name: p.name }))
  const lang = await getLang()
  // Прямой запрос вместо getDoctorSettings() — экономит 2 лишних вызова (getUser + select)
  const { data: doctorSettingsRow } = await Promise.resolve(supabase
    .from('doctor_settings')
    .select('followup_reminder_days')
    .eq('doctor_id', user.id)
    .single()
  ).catch(() => ({ data: null }))
  const followup_reminder_days = doctorSettingsRow?.followup_reminder_days ?? 14

  // Пациенты без повторного приёма X+ дней и без записи
  const sixtyDaysAgo = new Date(Date.now() - followup_reminder_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const scheduledPatientIds = new Set((appointments || []).map((a: any) => a.patients?.id).filter(Boolean))

  const patientsWithConsultations = (patients || []).map(patient => {
    const last = lastConsultationMap.get(patient.id) || null
    return {
      ...patient,
      last_consultation_date: last?.date || null,
      last_consultation_preview: last?.notes || null,
      pending_prescription: last ? (!last.remedy && (last.notes?.trim() || '').length > 0) : false,
      overdue: !!(last?.date && last.date < sixtyDaysAgo && !scheduledPatientIds.has(patient.id)),
      pending_followup_days: pendingFollowupMap.get(patient.id) ?? null,
    }
  })
  const overdueCount = patientsWithConsultations.filter(p =>
    p.last_consultation_date && p.last_consultation_date < sixtyDaysAgo && !scheduledPatientIds.has(p.id)
  ).length
  const pendingFollowupCount = (pendingFollowups || []).length
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

  // Онбординг — не считаем демо-пациентов как "реальных"
  const hasRealPatients = (patients || []).some(p => !p.notes?.startsWith('⚠️ Демо-пациент'))
  const hasSentIntake = (patients || []).some((p) => p.intake_sent_at && !p.notes?.startsWith('⚠️ Демо-пациент'))
  const realPatientIds = new Set((patients || []).filter(p => !p.notes?.startsWith('⚠️ Демо-пациент')).map(p => p.id))
  const hasScheduled = (appointments || []).some((a: any) => a.patients?.id && realPatientIds.has(a.patients.id))

  const totalPatients = (patients || []).length
  const newPatientsCount = (patients || []).filter(p =>
    p.created_at && new Date(p.created_at) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  ).length
  const pendingCount = patientsWithConsultations.filter(p => p.pending_prescription).length
  const todayCount = todayAppointments.length
  const totalConsultations90d = (recentConsultations || []).length
  const params = await searchParams
  const filterPending = params?.filter === 'pending'
  const filterOverdue = params?.filter === 'overdue'

  // Продающая строка в баннере — по приоритету
  let insightLine: string | null = null
  if (betterPct !== null && betterPct >= 60 && followups.length >= 3) {
    insightLine = lang === 'ru'
      ? `${betterPct}% ваших пациентов чувствуют себя лучше`
      : `${betterPct}% of your patients are feeling better`
  } else if (totalPatients >= 5) {
    insightLine = lang === 'ru'
      ? `${totalPatients} ${pluralPatients(totalPatients)} вам своё здоровье`
      : `${totalPatients} patients trust you with their health`
  } else if (totalPatients > 0) {
    insightLine = lang === 'ru'
      ? 'Хорошее начало — продолжайте вести практику'
      : 'Great start — keep building your practice'
  }

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-7 flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">

        {/* ─── Левая колонка ─── */}
        <div className="flex-1 min-w-0 w-full">

          {/* Hero-баннер */}
          <div data-tour="stats" className="relative overflow-hidden rounded-2xl mb-5 lg:mb-7" style={{ background: 'linear-gradient(135deg, var(--sim-forest) 0%, var(--sim-green) 100%)' }}>
            {/* Иллюстрация арники */}
            <div
              className="absolute right-0 top-0 h-full w-48 sm:w-64 opacity-20 bg-no-repeat bg-right bg-contain pointer-events-none"
              style={{ backgroundImage: 'url(/illustrations/arnica.jpg)' }}
            />
            <div className="relative z-10 px-5 sm:px-7 py-5 sm:py-6">
              <h1
                className="text-[20px] sm:text-[24px] font-light leading-tight mb-5"
                style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.01em' }}
              >
                {t(lang).dashboard.greeting}, {firstName}
              </h1>

              {/* Три равноценных стат-карточки */}
              <HeroStatCards
                todayCount={todayCount}
                totalPatients={totalPatients}
                pendingCount={pendingCount}
                filterPending={filterPending}
                todayLabel={t(lang).dashboard.todayAppointments(todayCount)}
                patientsLabel={t(lang).dashboard.patients}
                noPrescriptionLabel={t(lang).dashboard.noPrescription}
              />

              {/* Продающая строка */}
              {insightLine && (
                <p className="mt-3 text-[13px] font-light italic" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(255,255,255,0.80)' }}>
                  {insightLine}
                </p>
              )}

              {/* Строка внимания — показывается только если есть проблемы */}
              {(overdueCount > 0 || pendingFollowupCount > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#f97316' }} />
                      <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {lang === 'ru'
                          ? `${overdueCount} ${overdueCount === 1 ? 'пациент' : overdueCount < 5 ? 'пациента' : 'пациентов'} без повторного приёма`
                          : `${overdueCount} patient${overdueCount > 1 ? 's' : ''} overdue`}
                      </span>
                    </div>
                  )}
                  {pendingFollowupCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#facc15' }} />
                      <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {lang === 'ru'
                          ? `${pendingFollowupCount} ${pendingFollowupCount === 1 ? 'ожидает' : 'ожидают'} ответа на опросник`
                          : `${pendingFollowupCount} follow-up${pendingFollowupCount > 1 ? 's' : ''} pending`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <OnboardingFlow />
          </div>

          <OnboardingBanner
            hasRealPatients={hasRealPatients}
            hasSentIntake={hasSentIntake}
            hasScheduled={hasScheduled}
            lastPatientId={patients?.[0]?.id}
          />

          {/* AI Pro карточка */}
          <Link
            href="/ai-consultation"
            className="ai-card-dark block mb-5 px-5 py-4 transition-opacity hover:opacity-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.3)' }}>
                <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{lang === 'ru' ? 'AI-анализ случая' : 'AI Case Analysis'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(165,160,255,0.6)' }}>
                  {lang === 'ru' ? '8 линз MDRI · AI-гомеопат · Consensus' : '8 MDRI lenses · AI homeopath · Consensus'}
                </p>
              </div>
              <div className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                {lang === 'ru' ? 'Начать' : 'Start'}
              </div>
            </div>
          </Link>

          {/* Активный приём — идёт прямо сейчас */}
          {activeConsultations && activeConsultations.length > 0 && (() => {
            const active = activeConsultations[0] as unknown as { id: string; patient_id: string; patients: { id: string; name: string } | null }
            const patientName = active.patients?.name || ''
            return (
              <Link
                href={`/patients/${active.patient_id}/consultations/${active.id}`}
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}
              >
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#4ade80' }} />
                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#22c55e' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-none" style={{ color: '#f7f3ed' }}>
                    {lang === 'ru' ? 'Идёт приём' : 'Appointment in progress'}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(247,243,237,0.6)' }}>
                    {patientName}
                  </p>
                </div>
                <span className="text-xs font-medium shrink-0" style={{ color: 'rgba(247,243,237,0.7)' }}>
                  {lang === 'ru' ? 'Продолжить →' : 'Continue →'}
                </span>
              </Link>
            )
          })()}

          {/* Добавить / записать пациента */}
          <div data-tour="questionnaire-btn" className="mb-5">
            <AddPatientWidget patients={patientsList} />
          </div>

          {/* Заголовок списка пациентов */}
          <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
            {t(lang).dashboard.patientsSection}
          </p>

          <div id="patients-section" data-tour="patient-list" className="scroll-mt-6">
            <PatientListClient patients={patientsWithConsultations} filterPending={filterPending} filterOverdue={filterOverdue} lockedPatientIds={lockedPatientIds} />
          </div>
        </div>

        {/* ─── Правая колонка ─── */}
        <div className="w-full lg:w-[280px] lg:shrink-0 lg:sticky lg:top-7 space-y-4">
          <LunarPhaseWidget lang={lang} />
          <div id="appointments-section" className="scroll-mt-6">
            <CalendarWidget
              patients={patientsList}
              lastRemedyMap={Object.fromEntries(
                [...lastConsultationMap.entries()].map(([pid, c]) => [pid, c.remedy]).filter(([, r]) => r) as [string, string][]
              )}
            />
          </div>

          {/* Аналитика за 90 дней */}
          {(totalConsultations90d > 0 || betterPct !== null || topRemedy || newPatientsCount > 0) && (
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
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
                {newPatientsCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{lang === 'ru' ? 'Новых пациентов' : 'New patients'}</span>
                    <span className="text-sm font-semibold text-emerald-700" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                      +{newPatientsCount}
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
                {overdueCount > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: '#e0d8cc' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">
                        {lang === 'ru' ? `Не было более ${followup_reminder_days} дн.` : `No visit ${followup_reminder_days}+ days`}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: '#f97316' }}>{overdueCount}</span>
                    </div>
                    <div className="space-y-1">
                      {patientsWithConsultations
                        .filter(p => p.overdue)
                        .slice(0, 3)
                        .map(p => (
                          <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 transition-colors truncate">
                            <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: '#f97316' }} />
                            {p.name}
                          </Link>
                        ))}
                      {overdueCount > 3 && (
                        <Link href="?filter=overdue#patients-section" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                          {lang === 'ru' ? `+ ещё ${overdueCount - 3}` : `+ ${overdueCount - 3} more`}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                {unpaidPatients.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: '#e0d8cc' }}>
                    <UnpaidWidget patients={unpaidPatients} />
                  </div>
                )}
                {betterPct !== null && followups.length >= 3 && (
                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center justify-between text-[12px] text-gray-300 mb-1">
                      <span>{t(lang).dashboard.dynamics}</span>
                      <span>{followups.length} {t(lang).dashboard.responses}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${betterPct}%`, backgroundColor: 'var(--color-primary)' }}
                      />
                    </div>
                    <div className="flex justify-between text-[12px] text-gray-300 mt-1">
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
