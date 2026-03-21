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

  const headerText = `${formatDate(date)}${remedy ? ` · ${remedy}${potency ? ` ${potency}` : ''}` : ''}`

  return (
    <div className="rounded-md border border-[#e5e0d8] overflow-hidden mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 border-none text-left transition-colors duration-150"
        style={{ backgroundColor: expanded ? '#f0ebe3' : '#faf7f2' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-gray-400 shrink-0">
            {lang === 'ru' ? 'Прошлый приём' : 'Previous visit'}
          </span>
          <span className="text-xs text-gray-500 truncate">{headerText}</span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className="shrink-0 transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-2.5" style={{ backgroundColor: '#faf7f2' }}>
          {remedy && (
            <div className="text-base font-semibold mb-2" style={{ fontFamily: 'var(--font-cormorant)', color: 'var(--color-forest)' }}>
              {remedy}{potency && <span className="text-[13px] font-normal ml-1" style={{ color: 'var(--color-garden)' }}>{potency}</span>}
            </div>
          )}
          {complaints && <Section title={lang === 'ru' ? 'Жалобы' : 'Complaints'} text={complaints} />}
          {observations && <Section title={lang === 'ru' ? 'Наблюдения' : 'Observations'} text={observations} />}
          {notes && <Section title={lang === 'ru' ? 'Заметки' : 'Notes'} text={notes} />}
          {recommendations && <Section title={lang === 'ru' ? 'Рекомендации' : 'Recommendations'} text={recommendations} />}
        </div>
      )}
    </div>
  )
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-[0.5px] mb-0.5">
        {title}
      </div>
      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}
