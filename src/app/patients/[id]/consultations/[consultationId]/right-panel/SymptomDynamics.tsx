'use client'

import { useMemo } from 'react'
import { StructuredSymptom, SymptomDynamics as DynType, ClinicalAssessment } from '@/types'
import { CASE_STATE_LABELS, CASE_STATE_COLORS } from '@/lib/clinicalEngine'

type Props = {
  symptoms: StructuredSymptom[]
  previousSymptoms: StructuredSymptom[]
  assessment?: ClinicalAssessment | null
  lang: 'ru' | 'en'
}

const DYNAMICS_CONFIG: Record<DynType, { icon: string; color: string }> = {
  better:   { icon: '↑', color: '#059669' },
  worse:    { icon: '↓', color: '#dc2626' },
  new:      { icon: '+', color: '#2563eb' },
  resolved: { icon: '✓', color: '#0d9488' },
  same:     { icon: '=', color: '#9ca3af' },
}

const ORDER: DynType[] = ['worse', 'new', 'same', 'better', 'resolved']

type EnrichedSymptom = StructuredSymptom & { dynamics: DynType }

export default function SymptomDynamicsPanel({ symptoms, previousSymptoms, assessment, lang }: Props) {
  const enriched = useMemo(() => {
    const prevIds = new Set(previousSymptoms.map(s => s.id))
    const currIds = new Set(symptoms.map(s => s.id))

    const current: EnrichedSymptom[] = symptoms.map(s => {
      if (s.dynamics) return s as EnrichedSymptom
      const dyn: DynType = prevIds.has(s.id) ? 'same' : 'new'
      return { ...s, dynamics: dyn }
    })

    const resolved: EnrichedSymptom[] = previousSymptoms
      .filter(s => !currIds.has(s.id))
      .map(s => ({ ...s, dynamics: 'resolved' as DynType }))

    return [...current, ...resolved]
  }, [symptoms, previousSymptoms])

  const grouped = useMemo(() => {
    const map = new Map<DynType, EnrichedSymptom[]>()
    for (const s of enriched) {
      const list = map.get(s.dynamics) || []
      list.push(s)
      map.set(s.dynamics, list)
    }
    return map
  }, [enriched])

  if (enriched.length === 0 && !assessment) return null

  const stateColors = assessment ? CASE_STATE_COLORS[assessment.caseState] : null
  const stateLabel = assessment ? CASE_STATE_LABELS[lang][assessment.caseState] : null

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Строка статуса: "Динамика · N симпт. · Улучшение" */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: enriched.length > 0 ? '8px' : '0',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {lang === 'ru' ? 'Динамика' : 'Dynamics'}
        </span>
        {enriched.length > 0 && (
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>·</span>
        )}
        {enriched.length > 0 && (
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            {enriched.length} {lang === 'ru' ? 'симпт.' : 'sympt.'}
          </span>
        )}
        {stateLabel && stateColors && (
          <>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>·</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: stateColors.color,
              backgroundColor: stateColors.bg,
              border: `1px solid ${stateColors.border}`,
              borderRadius: '10px',
              padding: '1px 8px',
            }}>
              {stateLabel}
            </span>
          </>
        )}
      </div>

      {/* Список симптомов */}
      {enriched.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {ORDER.map(dynType => {
            const items = grouped.get(dynType)
            if (!items || items.length === 0) return null
            const cfg = DYNAMICS_CONFIG[dynType]

            return items.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '2px 0',
                  fontSize: '13px',
                  lineHeight: 1.3,
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: cfg.color,
                  backgroundColor: cfg.color + '18',
                  flexShrink: 0,
                }}>
                  {cfg.icon}
                </span>
                <span style={{ color: '#1a3020', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
            ))
          })}
        </div>
      )}
    </div>
  )
}
