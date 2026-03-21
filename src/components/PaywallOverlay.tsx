'use client'

import Link from 'next/link'

type Props = {
  current: number
  max: number
  lang?: 'ru' | 'en'
}

export default function PaywallOverlay({ current, max, lang = 'ru' }: Props) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="mx-4 max-w-md w-full rounded-2xl p-6 sm:p-8 text-center shadow-xl"
        style={{ backgroundColor: 'var(--sim-bg)' }}
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'rgba(45,106,79,0.1)' }}
        >
          <svg className="w-7 h-7" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2
          className="text-xl font-light mb-2"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-forest)' }}
        >
          {lang === 'ru' ? 'Лимит бесплатного тарифа' : 'Free plan limit reached'}
        </h2>

        <p className="text-sm mb-6" style={{ color: 'var(--sim-text-sec)' }}>
          {lang === 'ru'
            ? `У вас ${current} из ${max} пациентов. Перейдите на Стандарт для безлимитного доступа.`
            : `You have ${current} of ${max} patients. Upgrade to Standard for unlimited access.`}
        </p>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--sim-forest)' }}
          >
            {lang === 'ru' ? 'Посмотреть тарифы — от 290 ₽/мес' : 'View plans — from 290 ₽/mo'}
          </Link>

          <Link
            href="/dashboard"
            className="block w-full py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--sim-text-sec)' }}
          >
            {lang === 'ru' ? 'Вернуться на главную' : 'Back to dashboard'}
          </Link>
        </div>
      </div>
    </div>
  )
}
