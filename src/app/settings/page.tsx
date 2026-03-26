import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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
import ExportDataSection from './ExportDataSection'
import QuestionnaireEditor from './QuestionnaireEditor'
import { getAllTemplates } from '@/lib/actions/questionnaire-templates'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const [{ paid_sessions_enabled, followup_reminder_days }, scheduleData, sub, prescriptionRules, templates] = await Promise.all([
    getDoctorSettings(),
    getDoctorScheduleAuth(),
    getSubscription(),
    getPrescriptionRules(),
    getAllTemplates(),
  ])

  // AI-кредиты
  const aiSettings = await prisma.doctorSettings.findUnique({
    where: { doctorId: session.user.id },
    select: { aiCredits: true, subscriptionPlan: true },
  })
  const aiCredits = aiSettings?.aiCredits ?? 0
  const isAIPro = aiSettings?.subscriptionPlan === 'ai_pro'
  const lang = await getLang()
  const hasSchedule = isFeatureAllowed(sub, 'online_booking')
  const hasFollowup = isFeatureAllowed(sub, 'followup_reminders')

  // Динамический импорт чтобы избежать проблем с SSR
  const SettingsToggle = (await import('./SettingsToggle')).default

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <h1
          className="text-[28px] sm:text-[32px] font-light mb-8"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
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
            <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
              {t(lang).settings.payment}
            </p>
            <SettingsToggle initialEnabled={paid_sessions_enabled} />
          </div>

          {/* Напоминания */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {t(lang).settings.reminders}
            </h2>
            {hasFollowup ? (
              <FollowupReminderSetting initial={followup_reminder_days} />
            ) : (
              <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--sim-text-sec)' }}>
                  {lang === 'ru' ? 'Напоминания доступны на тарифе Стандарт' : 'Reminders available on Standard plan'}
                </p>
                <Link href="/pricing" className="text-sm font-semibold px-4 py-2 rounded-full" style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}>
                  {lang === 'ru' ? 'Подключить' : 'Upgrade'}
                </Link>
              </div>
            )}
          </section>

          {/* Расписание */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {t(lang).settings.schedule}
            </h2>
            {hasSchedule ? (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)' }}>
                <ScheduleSettings initial={scheduleData} />
              </div>
            ) : (
              <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--sim-text-sec)' }}>
                  {lang === 'ru' ? 'Онлайн-запись доступна на тарифе Стандарт' : 'Online booking available on Standard plan'}
                </p>
                <Link href="/pricing" className="text-sm font-semibold px-4 py-2 rounded-full" style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}>
                  {lang === 'ru' ? 'Подключить' : 'Upgrade'}
                </Link>
              </div>
            )}
          </section>

          {/* AI Pro */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-green)' }}>
              {lang === 'ru' ? 'AI-анализ' : 'AI Analysis'}
            </h2>
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
              {isAIPro ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
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
                      className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-full text-white transition-colors"
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      {lang === 'ru' ? 'AI Pro — 1 990 ₽/мес' : 'AI Pro — $19.90/mo'}
                    </Link>
                    <Link
                      href="/pricing"
                      className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-full border transition-colors"
                      style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}
                    >
                      {lang === 'ru' ? 'Все тарифы' : 'All plans'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Правила приёма */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Правила приёма препаратов' : 'Prescription rules'}
            </h2>
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)' }}>
              <PrescriptionRulesEditor initialRules={prescriptionRules} />
            </div>
          </section>

          {/* Редактор анкет */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Шаблоны анкет' : 'Questionnaire templates'}
            </h2>
            <div className="rounded-xl p-5 space-y-1" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
              <p className="text-xs mb-4" style={{ color: 'var(--sim-text-muted)', lineHeight: '1.6' }}>
                {lang === 'ru'
                  ? 'Настройте вопросы которые видит пациент при заполнении анкеты. Добавляйте, удаляйте и переименовывайте поля.'
                  : 'Customize questions that patients see when filling out forms.'}
              </p>
              <QuestionnaireEditor type="primary" title={lang === 'ru' ? 'Первичная анкета' : 'Primary intake'} initialFields={templates.primary} />
              <QuestionnaireEditor type="acute" title={lang === 'ru' ? 'Острый случай' : 'Acute case'} initialFields={templates.acute} />
              <QuestionnaireEditor type="pre_visit" title={lang === 'ru' ? 'Опросник перед визитом' : 'Pre-visit survey'} initialFields={templates.pre_visit} />
            </div>
          </section>

          {/* Экспорт данных */}
          <ExportDataSection />

          {/* Смена пароля */}
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Безопасность' : 'Security'}
            </h2>
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)' }}>
              <ChangePasswordSection />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
