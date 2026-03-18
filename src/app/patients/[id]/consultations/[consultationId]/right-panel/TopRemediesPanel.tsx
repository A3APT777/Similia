'use client'

import { useEffect, useMemo, useState } from 'react'
import { useConsultation } from '../context/ConsultationContext'
import { getTopRemediesFromRubricIds } from '@/lib/actions/repertory'

type Remedy = { abbrev: string; name: string; score: number }
type RubricEntry = { rubricId: number; weight: 1 | 2 | 3; eliminate?: boolean }

type Props = {
  lang: 'ru' | 'en'
  onAssignRemedy?: (abbrev: string) => void
}

export default function TopRemediesPanel({ lang, onAssignRemedy }: Props) {
  const { consultation } = useConsultation()
  const [remedies, setRemedies] = useState<Remedy[]>([])
  const [loading, setLoading] = useState(false)

  const data = useMemo(
    () => (consultation.repertory_data ?? []) as RubricEntry[],
    [consultation.repertory_data]
  )

  useEffect(() => {
    if (!data.length) { setRemedies([]); return }
    setLoading(true)
    getTopRemediesFromRubricIds(data).then(r => {
      setRemedies(r)
      setLoading(false)
    })
  }, [data])

  if (!data.length) return null

  return (
    <div className="rounded-lg px-3 py-2.5 mb-3" style={{ backgroundColor: '#f0f7f0', border: '1px solid rgba(45,106,79,0.15)' }}>
      <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: 'var(--color-garden)' }}>
        <span>{lang === 'ru' ? 'Топ препаратов' : 'Top remedies'}</span>
        <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>
          {data.length} {lang === 'ru' ? 'рубр.' : 'rubrics'}
        </span>
      </div>

      {loading && (
        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>…</div>
      )}
      {!loading && remedies.length === 0 && (
        <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'ru' ? 'Нет подходящих препаратов' : 'No matching remedies'}
        </div>
      )}

      {!loading && remedies.map((r, i) => (
        <div
          key={r.abbrev}
          className="flex items-center gap-1.5 py-1"
          style={{ borderBottom: i < remedies.length - 1 ? '1px solid rgba(45,106,79,0.08)' : 'none' }}
        >
          <span className="text-[10px] text-gray-400 min-w-[14px]">{i + 1}.</span>
          <span
            className="flex-1 text-[13px]"
            style={{
              fontFamily: 'var(--sim-font-serif)',
              fontWeight: i === 0 ? 600 : 500,
              color: i === 0 ? 'var(--color-forest)' : '#2d4030',
            }}
          >
            {r.name}
          </span>
          <span className="text-[10px] text-gray-400">{r.score}</span>
          {onAssignRemedy && (
            <button
              type="button"
              onClick={() => onAssignRemedy(r.abbrev)}
              className="text-[9px] px-1.5 py-0.5 rounded cursor-pointer whitespace-nowrap"
              style={{
                color: 'var(--color-garden)',
                backgroundColor: 'rgba(45,106,79,0.08)',
                border: '1px solid rgba(45,106,79,0.2)',
              }}
            >
              {lang === 'ru' ? 'Назн.' : 'Rx'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
