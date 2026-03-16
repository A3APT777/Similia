import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getDoctorSettings } from '@/lib/actions/payments'
import { getDoctorScheduleAuth } from '@/lib/actions/schedule'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'
import ScheduleSettings from './ScheduleSettings'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { paid_sessions_enabled } = await getDoctorSettings()
  const scheduleData = await getDoctorScheduleAuth()
  const lang = await getLang()

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

        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9a8a6a' }}>
              {t(lang).settings.payment}
            </p>
            <SettingsToggle initialEnabled={paid_sessions_enabled} />
          </div>

          {/* Расписание */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#9a8a6a' }}>
              {t(lang).settings.schedule}
            </h2>
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid #d4c9b8' }}>
              <ScheduleSettings initial={scheduleData} />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
