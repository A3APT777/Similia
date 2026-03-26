import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
import { getAccessiblePatientIds } from '@/lib/actions/subscription'
import UnpaidWidget from './UnpaidWidget'
import DemoBanner from './DemoBanner'

import { getUnpaidPatients } from '@/lib/actions/payments'
// seedDemoData убран — новые врачи начинают с пустого dashboard

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  // Авторизация через NextAuth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  function pluralPatients(n: number): string {
    if (n % 100 >= 11 && n % 100 <= 19) return 'пациентов доверяют'
    const last = n % 10
    if (last === 1) return 'пациент доверяет'
    if (last >= 2 && last <= 4) return 'пациента доверяют'
    return 'пациентов доверяют'
  }

  // Количество пациентов для статистики
  const patientCount = await prisma.patient.count({ where: { doctorId: userId } })

  // Первый вход — создаём демо-пациента с заполненной историей
  if (patientCount === 0) {
    const { seedDemoData } = await import('@/lib/actions/seed')
    await seedDemoData().catch(() => null)
  }

  // Находим демо-пациента для баннера
  const demoPatient = await prisma.patient.findFirst({
    where: { doctorId: userId, isDemo: true },
    select: { id: true, name: true },
  })

  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const threeMonthsAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const ninetyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Параллельные запросы с fallback — один сбой не роняет дашборд
  async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
    try { return await fn() } catch { return null }
  }

  const [
    appointments,
    patients,
    recentConsultations,
    recentFollowups,
    unpaidPatients,
    activeConsultations,
    pendingFollowups,
  ] = await Promise.all([
    // Приёмы (запланированные)
    safe(() => prisma.consultation.findMany({
      where: {
        doctorId: userId,
        scheduledAt: {
          not: null,
          gte: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lte: new Date(in30days),
        },
        status: { not: 'cancelled' },
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
      orderBy: { scheduledAt: 'asc' },
    })),
    // Все пациенты (лимит для защиты от перегрузки)
    safe(() => prisma.patient.findMany({
      where: { doctorId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })),
    // Консультации за 30 дней
    safe(() => prisma.consultation.findMany({
      where: {
        doctorId: userId,
        status: 'completed',
        date: { gte: threeMonthsAgo },
      },
      select: { remedy: true, date: true, status: true },
      take: 1000,
    })),
    // Фоллоу-апы за 90 дней
    safe(() => prisma.followup.findMany({
      where: {
        respondedAt: { not: null },
        consultation: { doctorId: userId },
        createdAt: { gte: new Date(ninetyDaysAgoIso) },
      },
      select: { status: true },
      take: 500,
    })),
    getUnpaidPatients().catch(() => []),
    // Активные консультации (in_progress)
    safe(() => prisma.consultation.findMany({
      where: { doctorId: userId, status: 'in_progress' },
      select: { id: true, patientId: true, patient: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    })),
    // Ожидающие ответа фоллоу-апы
    safe(() => prisma.followup.findMany({
      where: {
        respondedAt: null,
        consultation: { doctorId: userId },
        createdAt: { lte: new Date(threeDaysAgoIso) },
      },
      select: { id: true, patientId: true, createdAt: true },
      take: 200,
    })),
  ])

  // Один запрос для всех последних консультаций вместо N+1
  const patientIds = (patients || []).map(p => p.id)
  const allLastConsultations = patientIds.length > 0
    ? await prisma.consultation.findMany({
        where: {
          doctorId: userId,
          patientId: { in: patientIds },
          status: 'completed',
        },
        select: { patientId: true, date: true, notes: true, remedy: true },
        orderBy: { date: 'desc' },
        take: 1000,
      })
    : []

  const lastConsultationMap = new Map<string, { date: string | null; notes: string | null; remedy: string | null }>()
  for (const c of allLastConsultations) {
    if (!lastConsultationMap.has(c.patientId)) {
      lastConsultationMap.set(c.patientId, c)
    }
  }

  // Карта patient_id → дней ожидания опросника
  const pendingFollowupMap = new Map<string, number>()
  for (const f of (pendingFollowups || [])) {
    if (!f.patientId) continue
    const days = Math.floor((Date.now() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    if (!pendingFollowupMap.has(f.patientId) || days > (pendingFollowupMap.get(f.patientId) ?? 0)) {
      pendingFollowupMap.set(f.patientId, days)
    }
  }

  const patientsList = (patients || []).map(p => ({ id: p.id, name: p.name }))
  const lang = await getLang()

  // Расписание врача для CalendarWidget
  const { getDoctorScheduleAuth } = await import('@/lib/actions/schedule')
  const doctorSchedule = await getDoctorScheduleAuth().catch(() => null)

  // Прямой запрос настроек доктора
  const doctorSettingsRow = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { followupReminderDays: true },
  }).catch(() => null)
  const followup_reminder_days = doctorSettingsRow?.followupReminderDays ?? 14

  // Пациенты без повторного приёма X+ дней и без записи
  const sixtyDaysAgo = new Date(Date.now() - followup_reminder_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const scheduledPatientIds = new Set((appointments || []).map((a: any) => a.patient?.id).filter(Boolean))

  const patientsWithConsultations = (patients || []).map(patient => {
    const last = lastConsultationMap.get(patient.id) || null
    return {
      ...patient,
      // TODO: перевести Patient type и PatientListClient на camelCase, убрать этот маппинг
      doctor_id: patient.doctorId,
      birth_date: patient.birthDate,
      first_visit_date: patient.firstVisitDate,
      constitutional_type: patient.constitutionalType,
      paid_sessions: patient.paidSessions,
      is_demo: patient.isDemo,
      created_at: patient.createdAt.toISOString(),
      updated_at: patient.updatedAt.toISOString(),
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
  const name = session.user.name || session.user.email || ''
  const firstName = name.split(' ')[0] || name

  // Приёмы сегодня (по МСК)
  const todayMsk = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
  const todayAppointments = (appointments || []).filter(a => {
    const d = new Date(a.scheduledAt!).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
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
  const hasSentIntake = false // intake_sent_at нет в Prisma-модели, упрощаем
  const realPatientIds = new Set((patients || []).filter(p => !p.notes?.startsWith('⚠️ Демо-пациент')).map(p => p.id))
  const hasScheduled = (appointments || []).some((a: any) => a.patient?.id && realPatientIds.has(a.patient.id))

  const totalPatients = (patients || []).length
  const newPatientsCount = (patients || []).filter(p =>
    p.createdAt && new Date(p.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length
  const pendingCount = patientsWithConsultations.filter(p => p.pending_prescription).length
  const todayCount = todayAppointments.length
  const totalConsultations30d = (recentConsultations || []).length
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

          {/* Баннер для новых пользователей с демо-пациентом */}
          {demoPatient && <DemoBanner demoPatientId={demoPatient.id} demoPatientName={demoPatient.name} />}


          {/* Hero-баннер — Forest Mist */}
          <div data-tour="stats" className="relative overflow-hidden rounded-xl mb-5 lg:mb-7" style={{ border: '1px solid rgba(45,106,79,0.12)' }}>
            {/* Зелёный акцент — верхняя линия */}
            <div style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.2))' }} />
            {/* Фоновый мист */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(45,106,79,0.04) 0%, rgba(45,106,79,0.01) 40%, transparent 100%)' }} />
            <div className="relative px-5 sm:px-7 py-5 sm:py-6">
              <h1
                className="text-[20px] sm:text-[24px] font-light leading-tight mb-5"
                style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)', letterSpacing: '0.01em' }}
              >
                {t(lang).dashboard.greeting}, {firstName}
              </h1>

              {/* Три равноценных стат-карточки (с 5+ пациентов) */}
              {totalPatients >= 0 && <HeroStatCards
                todayCount={todayCount}
                totalPatients={totalPatients}
                pendingCount={pendingCount}
                filterPending={filterPending}
                todayLabel={t(lang).dashboard.todayAppointments(todayCount)}
                patientsLabel={t(lang).dashboard.patients}
                noPrescriptionLabel={t(lang).dashboard.noPrescription}
              />}

              {/* Продающая строка */}
              {insightLine && (
                <p className="mt-3 text-[13px] font-light italic" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text-muted)' }}>
                  {insightLine}
                </p>
              )}

              {/* Строка внимания — показывается только если есть проблемы */}
              {(overdueCount > 0 || pendingFollowupCount > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#f97316' }} />
                      <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
                        {lang === 'ru'
                          ? `${overdueCount} ${overdueCount === 1 ? 'пациент' : overdueCount < 5 ? 'пациента' : 'пациентов'} без повторного приёма`
                          : `${overdueCount} patient${overdueCount > 1 ? 's' : ''} overdue`}
                      </span>
                    </div>
                  )}
                  {pendingFollowupCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#facc15' }} />
                      <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
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

          <div className="mb-4" />

          {/* AI Pro карточка */}
          {totalPatients >= 0 && <Link
            href="/ai-consultation"
            className="group block mb-5 px-5 py-4 rounded-xl transition-all duration-300 hover:shadow-sm"
            style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}
              >
                <svg className="w-4.5 h-4.5" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>{lang === 'ru' ? 'AI-анализ случая' : 'AI Case Analysis'}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--sim-text-muted)' }}>
                  {lang === 'ru' ? '8 линз MDRI · AI-гомеопат · Consensus' : '8 MDRI lenses · AI homeopath · Consensus'}
                </p>
              </div>
              <svg className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity duration-200" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>}

          {/* Активный приём */}
          {activeConsultations && activeConsultations.length > 0 && (() => {
            const active = activeConsultations[0] as { id: string; patientId: string; patient: { id: string; name: string } | null }
            const patientName = active.patient?.name || ''
            return (
              <Link
                href={`/patients/${active.patientId}/consultations/${active.id}`}
                className="group flex items-center gap-3 rounded-xl px-4 py-3.5 mb-5 transition-all duration-300 hover:shadow-sm"
                style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-green)', borderLeftWidth: '3px' }}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: 'var(--sim-green)' }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: 'var(--sim-green)' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>
                    {lang === 'ru' ? 'Идёт приём' : 'In progress'} · {patientName}
                  </p>
                </div>
                <span className="text-[12px] font-medium shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--sim-green)' }}>
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
            <PatientListClient patients={patientsWithConsultations} filterPending={filterPending} filterOverdue={filterOverdue}  />
          </div>
        </div>

        {/* ─── Правая колонка (с 5+ пациентов) ─── */}
        {<div className="w-full lg:w-[280px] lg:shrink-0 lg:sticky lg:top-7 space-y-4">
          <LunarPhaseWidget lang={lang} />
          <div id="appointments-section" className="scroll-mt-6">
            <CalendarWidget
              patients={patientsList}
              schedule={doctorSchedule}
              lastRemedyMap={Object.fromEntries(
                [...lastConsultationMap.entries()].map(([pid, c]) => [pid, c.remedy]).filter(([, r]) => r) as [string, string][]
              )}
            />
          </div>

          {/* Аналитика за 90 дней */}
          {(totalConsultations30d > 0 || betterPct !== null || topRemedy || newPatientsCount > 0) && (
            <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
                {t(lang).dashboard.last30days}
              </p>
              <div className="space-y-3">
                {totalConsultations30d > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t(lang).dashboard.consultations}</span>
                    <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                      {totalConsultations30d}
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
        </div>}

      </div>
    </AppShell>
  )
}
