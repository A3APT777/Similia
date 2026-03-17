'use client'

import { useState } from 'react'
import { Consultation } from '@/types'
import { formatDate } from '@/lib/utils'

type Props = {
  previousConsultation: Consultation
  lang: 'ru' | 'en'
}

export default function PreviousVisitSummary({ previousConsultation, lang }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { remedy, potency, date, complaints, observations, notes, recommendations } = previousConsultation

  const dateStr = formatDate(date)
  const headerText = lang === 'ru'
    ? `${dateStr}${remedy ? ` \u00B7 ${remedy}${potency ? ` ${potency}` : ''}` : ''}`
    : `${dateStr}${remedy ? ` \u00B7 ${remedy}${potency ? ` ${potency}` : ''}` : ''}`

  return (
    <div style={{
      borderRadius: '6px',
      border: '1px solid #e5e0d8',
      overflow: 'hidden',
      marginBottom: '12px',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          backgroundColor: expanded ? '#f0ebe3' : '#faf7f2',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            {lang === 'ru' ? 'Прошлый приём' : 'Previous visit'}
          </span>
          <span style={{
            fontSize: '12px',
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {headerText}
          </span>
        </div>
        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '10px 12px', backgroundColor: '#faf7f2' }}>
          {/* Remedy block */}
          {remedy && (
            <div style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1a3020',
              marginBottom: '8px',
            }}>
              {remedy} {potency && <span style={{ fontSize: '13px', fontWeight: 400, color: '#2d6a4f' }}>{potency}</span>}
            </div>
          )}

          {/* Sections */}
          {complaints && (
            <Section
              title={lang === 'ru' ? 'Жалобы' : 'Complaints'}
              text={complaints}
            />
          )}
          {observations && (
            <Section
              title={lang === 'ru' ? 'Наблюдения' : 'Observations'}
              text={observations}
            />
          )}
          {notes && (
            <Section
              title={lang === 'ru' ? 'Заметки' : 'Notes'}
              text={notes}
            />
          )}
          {recommendations && (
            <Section
              title={lang === 'ru' ? 'Рекомендации' : 'Recommendations'}
              text={recommendations}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '2px',
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '12px',
        color: '#374151',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  )
}
