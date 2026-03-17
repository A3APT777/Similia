'use client'

import { useMemo } from 'react'
import { StructuredSymptom, SymptomDynamics as DynType } from '@/types'

type Props = {
  symptoms: StructuredSymptom[]
  previousSymptoms: StructuredSymptom[]
  lang: 'ru' | 'en'
}

// Иконки и цвета для каждого типа динамики
const DYNAMICS_CONFIG: Record<DynType, { icon: string; color: string; label: { ru: string; en: string } }> = {
  better:   { icon: '\u2191', color: '#059669', label: { ru: 'Лучше',   en: 'Better'   } },
  worse:    { icon: '\u2193', color: '#dc2626', label: { ru: 'Хуже',    en: 'Worse'    } },
  new:      { icon: '+',      color: '#2563eb', label: { ru: 'Новый',   en: 'New'      } },
  resolved: { icon: '\u2713', color: '#0d9488', label: { ru: 'Ушёл',    en: 'Resolved' } },
  same:     { icon: '=',      color: '#6b7280', label: { ru: 'Без изм.',en: 'Same'     } },
}

// Порядок отображения групп
const ORDER: DynType[] = ['worse', 'new', 'same', 'better', 'resolved']

// Локализация категорий симптомов
const CATEGORY_SHORT: Record<string, { ru: string; en: string }> = {
  chief_complaint: { ru: 'Жалоба',      en: 'Chief'    },
  concomitant:     { ru: 'Сопутств.',    en: 'Concom.'  },
  modality_worse:  { ru: 'Хуже от',     en: 'Worse'    },
  modality_better: { ru: 'Лучше от',    en: 'Better'   },
  mental:          { ru: 'Психика',      en: 'Mental'   },
  general:         { ru: 'Общее',        en: 'General'  },
  sleep:           { ru: 'Сон',          en: 'Sleep'    },
  appetite:        { ru: 'Аппетит',      en: 'Appetite' },
  observation:     { ru: 'Наблюд.',      en: 'Observ.'  },
  other:           { ru: 'Другое',       en: 'Other'    },
}

type EnrichedSymptom = StructuredSymptom & { dynamics: DynType }

export default function SymptomDynamicsPanel({ symptoms, previousSymptoms, lang }: Props) {
  // Вычисляем dynamics для всех симптомов
  const enriched = useMemo(() => {
    const prevIds = new Set(previousSymptoms.map(s => s.id))
    const currIds = new Set(symptoms.map(s => s.id))

    // Текущие симптомы с авто-определением dynamics
    const current: EnrichedSymptom[] = symptoms.map(s => {
      if (s.dynamics) return s as EnrichedSymptom
      const dyn: DynType = prevIds.has(s.id) ? 'same' : 'new'
      return { ...s, dynamics: dyn }
    })

    // Resolved: были в предыдущих, нет в текущих
    const resolved: EnrichedSymptom[] = previousSymptoms
      .filter(s => !currIds.has(s.id))
      .map(s => ({ ...s, dynamics: 'resolved' as DynType }))

    return [...current, ...resolved]
  }, [symptoms, previousSymptoms])

  // Группируем по dynamics
  const grouped = useMemo(() => {
    const map = new Map<DynType, EnrichedSymptom[]>()
    for (const s of enriched) {
      const list = map.get(s.dynamics) || []
      list.push(s)
      map.set(s.dynamics, list)
    }
    return map
  }, [enriched])

  if (enriched.length === 0) return null

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '6px',
      }}>
        {lang === 'ru' ? 'Динамика симптомов' : 'Symptom dynamics'}
      </div>
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
                padding: '3px 0',
                fontSize: '13px',
                lineHeight: 1.3,
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                fontSize: '11px',
                fontWeight: 600,
                color: cfg.color,
                backgroundColor: cfg.color + '14',
                flexShrink: 0,
              }}>
                {cfg.icon}
              </span>
              <span style={{ color: '#1a3020', flex: 1, minWidth: 0 }}>
                {s.label}
              </span>
              <span style={{
                fontSize: '10px',
                color: '#9ca3af',
                backgroundColor: '#f3f4f6',
                padding: '1px 5px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {CATEGORY_SHORT[s.category]?.[lang] || s.category}
              </span>
            </div>
          ))
        })}
      </div>
    </div>
  )
}
