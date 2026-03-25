'use client'

import Link from 'next/link'
import type { SubscriptionInfo } from '@/lib/subscription'

type Props = {
  subscription: SubscriptionInfo
  patientCount: number
  lang?: 'ru' | 'en'
}

export default function SubscriptionBadge({ subscription, patientCount, lang = 'ru' }: Props) {
  const isFree = subscription.planId === 'free'
  const max = subscription.maxPatients

  return (
    <Link
      href="/pricing"
      className="block rounded-full px-3 py-2 transition-colors hover:opacity-80"
      style={{
        backgroundColor: isFree ? 'rgba(200,160,53,0.1)' : 'rgba(45,106,79,0.1)',
        border: `1px solid ${isFree ? 'rgba(200,160,53,0.2)' : 'rgba(45,106,79,0.2)'}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: isFree ? '#8a7030' : 'var(--sim-green)' }}
        >
          {isFree
            ? (lang === 'ru' ? 'Бесплатный' : 'Free')
            : (lang === 'ru' ? 'Стандарт' : 'Standard')}
        </span>
        {!isFree && subscription.periodEnd && (
          <span className="text-xs" style={{ color: 'var(--sim-green)' }}>
            {lang === 'ru' ? 'до' : 'until'} {new Date(subscription.periodEnd).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {isFree && max !== null && (
        <div className="mt-1.5">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--sim-text-sec)' }}>
            <span>{patientCount}/{max} {lang === 'ru' ? 'пациентов' : 'patients'}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((patientCount / max) * 100, 100)}%`,
                backgroundColor: patientCount >= max ? '#dc2626' : patientCount >= max * 0.8 ? '#c8a035' : 'var(--sim-green)',
              }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}
