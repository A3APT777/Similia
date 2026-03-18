'use client'

import { Consultation } from '@/types'

type Props = {
  previousConsultation: Consultation
  lang: 'ru' | 'en'
}

export default function ActiveRemedy({ previousConsultation, lang }: Props) {
  const { remedy, potency, dosage, date } = previousConsultation

  if (!remedy) return null

  const daysSince = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysLabel = lang === 'ru'
    ? `${daysSince} ${daysSince === 1 ? 'день' : daysSince < 5 ? 'дня' : 'дней'} назад`
    : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`

  return (
    <div className="rounded-md px-3 py-2.5 mb-3" style={{ backgroundColor: '#e8f0e8', borderLeft: '3px solid var(--color-garden)' }}>
      <div className="text-lg font-semibold leading-tight" style={{ fontFamily: 'var(--font-cormorant)', color: 'var(--color-forest)' }}>
        {remedy}
        {potency && (
          <span className="text-sm font-normal ml-1.5" style={{ color: 'var(--color-garden)' }}>
            {potency}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5 mt-1 text-[11px] text-gray-500">
        <span>{daysLabel}</span>
        {dosage && (
          <>
            <span className="text-gray-300">|</span>
            <span>{dosage}</span>
          </>
        )}
      </div>
    </div>
  )
}
