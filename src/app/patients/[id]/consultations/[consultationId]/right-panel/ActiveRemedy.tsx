'use client'

import { Consultation } from '@/types'

type Props = {
  previousConsultation: Consultation
  lang: 'ru' | 'en'
}

export default function ActiveRemedy({ previousConsultation, lang }: Props) {
  const { remedy, potency, dosage, date } = previousConsultation

  if (!remedy) return null

  // Дней с момента назначения
  const daysSince = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  )

  const daysLabel = lang === 'ru'
    ? `${daysSince} ${daysSince === 1 ? 'день' : daysSince < 5 ? 'дня' : 'дней'} назад`
    : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`

  return (
    <div style={{
      backgroundColor: '#e8f0e8',
      borderLeft: '3px solid #2d6a4f',
      borderRadius: '6px',
      padding: '10px 12px',
      marginBottom: '12px',
    }}>
      <div style={{
        fontFamily: 'var(--font-cormorant)',
        fontSize: '18px',
        fontWeight: 600,
        color: '#1a3020',
        lineHeight: 1.2,
      }}>
        {remedy}
        {potency && (
          <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '6px', color: '#2d6a4f' }}>
            {potency}
          </span>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '4px',
        fontSize: '11px',
        color: '#6b7280',
      }}>
        <span>{daysLabel}</span>
        {dosage && (
          <>
            <span style={{ color: '#d1d5db' }}>|</span>
            <span>{dosage}</span>
          </>
        )}
      </div>
    </div>
  )
}
