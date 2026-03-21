'use client'

import { useState, useTransition } from 'react'
import { updatePaidSessionsEnabled } from '@/lib/actions/payments'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function SettingsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [, startTransition] = useTransition()
  const { toast } = useToast()
  const { lang } = useLanguage()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      try {
        await updatePaidSessionsEnabled(next)
        toast(next ? t(lang).settings.paymentEnabled : t(lang).settings.paymentDisabled)
      } catch {
        setEnabled(!next)
        toast(lang === 'ru' ? 'Ошибка сохранения' : 'Save error')
      }
    })
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: enabled ? 'rgba(45,106,79,0.12)' : 'rgba(0,0,0,0.05)' }}
          >
            <svg className="w-5 h-5" style={{ color: enabled ? '#2d6a4f' : '#6b5f4f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: '#1a1a0a' }}>
              {t(lang).settings.paymentToggle}
            </p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--sim-text-sec)' }}>
              {enabled
                ? t(lang).settings.paymentOn
                : t(lang).settings.paymentOff}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className="relative shrink-0 mt-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 rounded-full"
          style={{ width: 44, height: 24 }}
          aria-label={enabled ? t(lang).settings.disable : t(lang).settings.enable}
        >
          <div
            className="absolute inset-0 rounded-full transition-colors duration-200"
            style={{ backgroundColor: enabled ? '#2d6a4f' : '#d4c9b8' }}
          />
          <div
            className="absolute top-0.5 rounded-full bg-white shadow transition-transform duration-200"
            style={{
              width: 20,
              height: 20,
              transform: enabled ? 'translateX(22px)' : 'translateX(2px)',
            }}
          />
        </button>
      </div>

      <p className="text-[12px] mt-4 pt-4" style={{ color: '#6b5f4f', borderTop: '1px solid #d4c9b8' }}>
        {enabled
          ? `● ${t(lang).settings.paymentEnabled} — ${lang === 'ru' ? 'изменение сохраняется автоматически' : 'changes saved automatically'}`
          : `○ ${t(lang).settings.paymentDisabled} — ${lang === 'ru' ? 'изменение сохраняется автоматически' : 'changes saved automatically'}`}
      </p>
    </div>
  )
}
