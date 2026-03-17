'use client'

import { useEffect, useState } from 'react'
import { useConsultation } from '../context/ConsultationContext'
import { getTopRemediesFromRubricIds } from '@/lib/actions/repertory'

type Remedy = { abbrev: string; name: string; score: number }

type Props = {
  lang: 'ru' | 'en'
  onAssignRemedy?: (abbrev: string) => void
}

export default function TopRemediesPanel({ lang, onAssignRemedy }: Props) {
  const { consultation } = useConsultation()
  const [remedies, setRemedies] = useState<Remedy[]>([])
  const [loading, setLoading] = useState(false)

  const data = (consultation.repertory_data ?? []) as { rubricId: number; weight: 1 | 2 | 3; eliminate?: boolean }[]
  const key = data.map(e => `${e.rubricId}:${e.weight}:${e.eliminate}`).join(',')

  useEffect(() => {
    if (!data.length) { setRemedies([]); return }
    setLoading(true)
    getTopRemediesFromRubricIds(data).then(r => {
      setRemedies(r)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!data.length) return null

  return (
    <div style={{
      backgroundColor: '#f0f7f0',
      border: '1px solid rgba(45,106,79,0.15)',
      borderRadius: '8px',
      padding: '10px 12px',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{lang === 'ru' ? 'Топ препаратов' : 'Top remedies'}</span>
        <span style={{ color: '#9a8a6a', fontWeight: 400 }}>{data.length} {lang === 'ru' ? 'рубр.' : 'rubrics'}</span>
      </div>

      {loading && (
        <div style={{ fontSize: '11px', color: '#9a8a6a' }}>…</div>
      )}

      {!loading && remedies.length === 0 && (
        <div style={{ fontSize: '11px', color: '#9a8a6a' }}>
          {lang === 'ru' ? 'Нет подходящих препаратов' : 'No matching remedies'}
        </div>
      )}

      {!loading && remedies.map((r, i) => (
        <div key={r.abbrev} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 0',
          borderBottom: i < remedies.length - 1 ? '1px solid rgba(45,106,79,0.08)' : 'none',
        }}>
          <span style={{ fontSize: '10px', color: '#9a8a6a', minWidth: '14px' }}>{i + 1}.</span>
          <span style={{
            fontSize: '13px',
            fontWeight: i === 0 ? 600 : 500,
            color: i === 0 ? '#1a3020' : '#2d4030',
            flex: 1,
            fontFamily: 'var(--sim-font-serif)',
          }}>
            {r.name}
          </span>
          <span style={{ fontSize: '10px', color: '#9a8a6a' }}>{r.score}</span>
          {onAssignRemedy && (
            <button
              type="button"
              onClick={() => onAssignRemedy(r.abbrev)}
              style={{
                fontSize: '9px',
                color: '#2d6a4f',
                backgroundColor: 'rgba(45,106,79,0.08)',
                border: '1px solid rgba(45,106,79,0.2)',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
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
