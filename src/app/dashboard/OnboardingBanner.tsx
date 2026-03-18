'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  hasRealPatients: boolean
  hasSentIntake: boolean
  hasScheduled: boolean
  lastPatientId?: string
}

function getSteps(lang: 'ru' | 'en', lastPatientId?: string) {
  const patientUrl = lastPatientId ? `/patients/${lastPatientId}` : null
  return [
    {
      key: 'patient',
      done: (p: Props) => p.hasRealPatients,
      title: t(lang).onboarding.addPatient,
      desc: t(lang).onboarding.addPatientDesc,
      href: '/patients/new',
      label: t(lang).onboarding.addPatientBtn,
    },
    {
      key: 'intake',
      done: (p: Props) => p.hasSentIntake,
      title: t(lang).onboarding.sendIntake,
      desc: lang === 'ru' ? 'Откройте карточку пациента → «Анкета до приёма»' : 'Open patient card → "Intake form"',
      href: patientUrl,
      label: lang === 'ru' ? 'Открыть карточку' : 'Open patient',
    },
    {
      key: 'schedule',
      done: (p: Props) => p.hasScheduled,
      title: t(lang).onboarding.scheduleFirst,
      desc: lang === 'ru' ? 'Откройте карточку пациента → «Запланировать»' : 'Open patient card → "Schedule"',
      href: patientUrl,
      label: lang === 'ru' ? 'Открыть карточку' : 'Open patient',
    },
  ]
}

export default function OnboardingBanner(props: Props) {
  const { lang } = useLanguage()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('onboarding_dismissed') === '1') {
      setDismissed(true)
    }
    setReady(true)
  }, [])

  // Не рендерим пока не прочитали localStorage — убирает мелькание
  if (!ready || dismissed) return null

  const STEPS = getSteps(lang, props.lastPatientId)
  const completedCount = STEPS.filter(s => s.done(props)).length
  if (completedCount === STEPS.length) return null

  function dismiss() {
    localStorage.setItem('onboarding_dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="mb-5 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{t(lang).onboarding.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t(lang).onboarding.completed(completedCount, STEPS.length)}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-0.5"
          title={t(lang).common.hide}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Прогресс-бар */}
      <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ backgroundColor: 'var(--color-border-light)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(completedCount / STEPS.length) * 100}%`, backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const done = step.done(props)
          return (
            <div
              key={step.key}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ opacity: done ? 0.5 : 1, backgroundColor: done ? 'transparent' : 'var(--color-muted-bg)' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={done
                  ? { backgroundColor: 'var(--color-primary)' }
                  : { border: '2px solid var(--color-border)' }
                }
              >
                {done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{step.title}</p>
                {!done && <p className="text-xs text-gray-400">{step.desc}</p>}
              </div>
              {!done && step.href && (
                <Link
                  href={step.href}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {step.label}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
