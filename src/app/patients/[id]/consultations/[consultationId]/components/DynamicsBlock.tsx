'use client'

import { useState } from 'react'
import { saveDoctorDynamics } from '@/lib/actions/consultations'
import { DoctorDynamics } from '@/types'

const OPTIONS: { value: DoctorDynamics; labelRu: string; labelEn: string; hintRu: string; hintEn: string; icon: string; color: string; bg: string }[] = [
  { value: 'improving',    labelRu: 'Улучшение',        labelEn: 'Improving',    hintRu: 'Состояние пациента улучшилось',                                           hintEn: 'Patient condition improved',                          icon: '↑', color: 'var(--sim-green)', bg: 'rgba(45,106,79,0.1)'   },
  { value: 'aggravation',  labelRu: 'Обострение',       labelEn: 'Aggravation',  hintRu: 'Гомеопатическая аггравация — временное ухудшение после назначения (хороший знак)', hintEn: 'Homeopathic aggravation — temporary worsening after prescription (good sign)', icon: '⚡', color: '#b45309', bg: 'rgba(180,83,9,0.1)'    },
  { value: 'no_change',    labelRu: 'Без изменений',    labelEn: 'No change',    hintRu: 'Состояние не изменилось',                                                  hintEn: 'No change in condition',                              icon: '→', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  { value: 'worsening',    labelRu: 'Ухудшение',        labelEn: 'Worsening',    hintRu: 'Состояние пациента ухудшилось — болезнь прогрессирует',                     hintEn: 'Patient condition worsened — disease progressing',     icon: '↓', color: '#dc2626', bg: 'rgba(220,38,38,0.1)'   },
  { value: 'deterioration',labelRu: 'Без реакции',      labelEn: 'No reaction',  hintRu: 'Нет реакции на препарат — ни улучшения, ни ухудшения',                     hintEn: 'No reaction to remedy — neither improvement nor worsening', icon: '✕', color: '#9a3412', bg: 'rgba(154,52,18,0.1)'   },
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
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--sim-bg-input)', border: '1px solid var(--sim-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
            {lang === 'ru' ? 'Динамика с прошлого приёма' : 'Dynamics since last visit'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sim-text-hint)' }}>
            {lang === 'ru' ? 'Как пациент отреагировал на предыдущее назначение?' : 'How did the patient respond to the previous prescription?'}
          </p>
        </div>
        {saving && <span className="text-xs text-gray-400">{lang === 'ru' ? 'Сохраняю...' : 'Saving...'}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(opt => {
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              title={lang === 'ru' ? opt.hintRu : opt.hintEn}
              aria-label={lang === 'ru' ? opt.hintRu : opt.hintEn}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium"
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
