'use client'

import { useState } from 'react'
import { saveDoctorDynamics } from '@/lib/actions/consultations'
import { DoctorDynamics } from '@/types'

const OPTIONS: { value: DoctorDynamics; labelRu: string; labelEn: string; icon: string; color: string; bg: string }[] = [
  { value: 'improving',    labelRu: 'Улучшение',        labelEn: 'Improving',       icon: '↑', color: '#2d6a4f', bg: 'rgba(45,106,79,0.1)'   },
  { value: 'aggravation',  labelRu: 'Обострение',       labelEn: 'Aggravation',     icon: '⚡', color: '#b45309', bg: 'rgba(180,83,9,0.1)'    },
  { value: 'no_change',    labelRu: 'Без изменений',    labelEn: 'No change',       icon: '→', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  { value: 'worsening',    labelRu: 'Ухудшение',        labelEn: 'Worsening',       icon: '↓', color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
  { value: 'deterioration',labelRu: 'Без реакции',      labelEn: 'No reaction',     icon: '✕', color: '#9a3412', bg: 'rgba(154,52,18,0.1)'   },
]

type Props = {
  consultationId: string
  initial: DoctorDynamics | null
  lang: 'ru' | 'en'
}

export default function DynamicsBlock({ consultationId, initial, lang }: Props) {
  const [selected, setSelected] = useState<DoctorDynamics | null>(initial)
  const [saving, setSaving] = useState(false)

  async function handleSelect(val: DoctorDynamics) {
    setSelected(val)
    setSaving(true)
    await saveDoctorDynamics(consultationId, val)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--sim-bg-input)', border: '1px solid var(--sim-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          {lang === 'ru' ? 'Динамика с прошлого приёма' : 'Dynamics since last visit'}
        </p>
        {saving && <span className="text-[10px] text-gray-400">{lang === 'ru' ? 'Сохраняю...' : 'Saving...'}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(opt => {
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
              style={{
                backgroundColor: active ? opt.bg : 'transparent',
                color: active ? opt.color : '#6b7280',
                borderColor: active ? opt.color : 'var(--sim-border)',
                fontWeight: active ? 600 : 400,
              }}
            >
              <span>{opt.icon}</span>
              <span>{lang === 'ru' ? opt.labelRu : opt.labelEn}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
