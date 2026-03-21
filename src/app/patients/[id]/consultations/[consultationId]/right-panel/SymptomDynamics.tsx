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

type DynamicsCfg = { icon: string; color: string; bgColor: string }

const DYNAMICS_CONFIG: Record<DynType, DynamicsCfg> = {
  better:   { icon: '↑', color: '#059669', bgColor: 'rgba(5,150,105,0.09)' },
  worse:    { icon: '↓', color: '#dc2626', bgColor: 'rgba(220,38,38,0.09)' },
  new:      { icon: '+', color: '#2563eb', bgColor: 'rgba(37,99,235,0.09)' },
  resolved: { icon: '✓', color: '#0d9488', bgColor: 'rgba(13,148,136,0.09)' },
  same:     { icon: '=', color: '#9ca3af', bgColor: 'rgba(156,163,175,0.09)' },
}

const ORDER: DynType[] = ['worse', 'new', 'same', 'better', 'resolved']

type EnrichedSymptom = StructuredSymptom & { dynamics: DynType }

export default function SymptomDynamicsPanel({ symptoms, previousSymptoms, assessment, lang }: Props) {
  const enriched = useMemo(() => {
    const prevIds = new Set(previousSymptoms.map(s => s.id))
    const currIds = new Set(symptoms.map(s => s.id))

    const current: EnrichedSymptom[] = symptoms.map(s => {
      if (s.dynamics) return s as EnrichedSymptom
      return { ...s, dynamics: (prevIds.has(s.id) ? 'same' : 'new') as DynType }
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
    <div className="mb-3">
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.5px]">
          {lang === 'ru' ? 'Динамика' : 'Dynamics'}
        </span>
        {enriched.length > 0 && (
          <>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">
              {enriched.length} {lang === 'ru' ? 'симпт.' : 'sympt.'}
            </span>
          </>
        )}
        {stateLabel && stateColors && (
          <>
            <span className="text-xs text-gray-400">·</span>
            <span
              className="text-xs font-medium px-2 py-px rounded-[10px]"
              style={{ color: stateColors.color, backgroundColor: stateColors.bg, border: `1px solid ${stateColors.border}` }}
            >
              {stateLabel}
            </span>
          </>
        )}
      </div>

      {enriched.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {ORDER.map(dynType => {
            const items = grouped.get(dynType)
            if (!items?.length) return null
            const cfg = DYNAMICS_CONFIG[dynType]
            return items.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 py-0.5 text-[13px] leading-tight">
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold shrink-0"
                  style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                >
                  {cfg.icon}
                </span>
                <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-forest)' }}>
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
