import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { getDoctorSettings } from '@/lib/actions/payments'
import { getDoctorScheduleAuth } from '@/lib/actions/schedule'
import { getSubscription } from '@/lib/actions/subscription'
import { isFeatureAllowed } from '@/lib/subscription'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'
import ScheduleSettings from './ScheduleSettings'
import FollowupReminderSetting from './FollowupReminderSetting'
import PrescriptionRulesEditor from './PrescriptionRulesEditor'
import { getPrescriptionRules } from '@/lib/actions/prescriptionShare'
import FirstTimeHint from '@/components/FirstTimeHint'
import ChangePasswordSection from './ChangePasswordSection'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ paid_sessions_enabled, followup_reminder_days }, scheduleData, sub, prescriptionRules] = await Promise.all([
    getDoctorSettings(),
    getDoctorScheduleAuth(),
    getSubscription(),
    getPrescriptionRules(),
  ])
  // AI-кредиты
  const { data: aiSettings } = await supabase
    .from('doctor_settings')
    .select('ai_credits, subscription_plan')
    .eq('doctor_id', user.id)
    .single()
  const aiCredits = aiSettings?.ai_credits ?? 0
  const isAIPro = aiSettings?.subscription_plan === 'ai_pro'
  const lang = await getLang()
  const hasSchedule = isFeatureAllowed(sub, 'online_booking')
  const hasFollowup = isFeatureAllowed(sub, 'followup_reminders')

  // Динамический импорт чтобы избежать проблем с SSR
  const SettingsToggle = (await import('./SettingsToggle')).default

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <h1
          className="text-2xl font-light mb-6"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a1a0a' }}
        >
          {t(lang).settings.title}
        </h1>

        <FirstTimeHint id="settings">
          {lang === 'ru'
            ? 'Настройте расписание приёмов — пациенты смогут записываться сами по ссылке. Включите напоминания — пациенты, которые давно не приходили, будут выделены в дашборде.'
            : 'Set up appointment schedule — patients can book via link. Enable follow-up reminders — patient gets auto-survey N days after visit.'}
        </FirstTimeHint>

        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b5f4f' }}>
              {t(lang).settings.payment}
            </p>
            <SettingsToggle initialEnabled={paid_sessions_enabled} />
          </div>

          {/* Напоминания */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b5f4f' }}>
              {t(lang).settings.reminders}
            </h2>
            {hasFollowup ? (
              <FollowupReminderSetting initial={followup_reminder_days} />
            ) : (
              <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--sim-text-sec)' }}>
                  {lang === 'ru' ? 'Напоминания доступны на тарифе Стандарт' : 'Reminders available on Standard plan'}
                </p>
                <Link href="/pricing" className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}>
                  {lang === 'ru' ? 'Подключить' : 'Upgrade'}
                </Link>
              </div>
            )}
          </section>

          {/* Расписание */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b5f4f' }}>
              {t(lang).settings.schedule}
            </h2>
            {hasSchedule ? (
              <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}>
                <ScheduleSettings initial={scheduleData} />
              </div>
            ) : (
              <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--sim-text-sec)' }}>
                  {lang === 'ru' ? 'Онлайн-запись доступна на тарифе Стандарт' : 'Online booking available on Standard plan'}
                </p>
                <Link href="/pricing" className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}>
                  {lang === 'ru' ? 'Подключить' : 'Upgrade'}
                </Link>
              </div>
            )}
          </section>

          {/* AI Pro */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6366f1' }}>
              {lang === 'ru' ? 'AI-анализ' : 'AI Analysis'}
            </h2>
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
              {isAIPro ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">AI Pro</p>
                    <p className="text-xs text-gray-500">{lang === 'ru' ? 'Безлимитные AI-консультации' : 'Unlimited AI consultations'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{lang === 'ru' ? 'AI-кредиты' : 'AI Credits'}</p>
                      <p className="text-xs text-gray-500">
                        {aiCredits > 0
                          ? (lang === 'ru' ? `Осталось: ${aiCredits}` : `Remaining: ${aiCredits}`)
                          : (lang === 'ru' ? 'Нет кредитов' : 'No credits')}
                      </p>
                    </div>
                    <span className="text-2xl font-bold" style={{ color: aiCredits > 0 ? '#6366f1' : '#d1d5db' }}>
                      {aiCredits}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/pricing"
                      className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg text-white transition-colors"
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      {lang === 'ru' ? 'AI Pro — 1 990 ₽/мес' : 'AI Pro — $19.90/mo'}
                    </Link>
                    <Link
                      href="/pricing#packages"
                      className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
                      style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}
                    >
                      {lang === 'ru' ? 'Пакет 5 шт — 299 ₽' : 'Pack of 5 — $2.99'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Правила приёма */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b5f4f' }}>
              {lang === 'ru' ? 'Правила приёма препаратов' : 'Prescription rules'}
            </h2>
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}>
              <PrescriptionRulesEditor initialRules={prescriptionRules} />
            </div>
          </section>

          {/* Смена пароля */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6b5f4f' }}>
              {lang === 'ru' ? 'Безопасность' : 'Security'}
            </h2>
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}>
              <ChangePasswordSection />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
