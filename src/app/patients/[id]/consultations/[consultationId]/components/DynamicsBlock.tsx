'use client'

import { useState } from 'react'
import { saveDoctorDynamics } from '@/lib/actions/consultations'
import { DoctorDynamics } from '@/types'

const OPTIONS: { value: DoctorDynamics; labelRu: string; labelEn: string; hintRu: string; hintEn: string; color: string }[] = [
  { value: 'improving',     labelRu: 'Улучшение',     labelEn: 'Improving',   hintRu: 'Состояние улучшилось',                          hintEn: 'Condition improved',                     color: 'var(--sim-green)' },
  { value: 'aggravation',   labelRu: 'Обострение',    labelEn: 'Aggravation', hintRu: 'Гомеопатическая аггравация — временное ухудшение (хороший знак)', hintEn: 'Homeopathic aggravation (good sign)', color: '#b45309' },
  { value: 'no_change',     labelRu: 'Без изменений', labelEn: 'No change',   hintRu: 'Состояние не изменилось',                       hintEn: 'No change',                              color: '#6b7280' },
  { value: 'worsening',     labelRu: 'Ухудшение',     labelEn: 'Worsening',   hintRu: 'Болезнь прогрессирует',                          hintEn: 'Disease progressing',                    color: '#dc2626' },
  { value: 'deterioration', labelRu: 'Без реакции',   labelEn: 'No reaction', hintRu: 'Нет реакции на препарат',                        hintEn: 'No reaction to remedy',                  color: '#9a3412' },
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
    <div className="pb-5 mb-1" style={{ borderBottom: '1px solid var(--sim-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
          {lang === 'ru' ? 'Динамика с прошлого приёма' : 'Dynamics since last visit'}
        </p>
        {saving && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--sim-text-muted)' }} />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(opt => {
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              title={lang === 'ru' ? opt.hintRu : opt.hintEn}
              aria-label={lang === 'ru' ? opt.hintRu : opt.hintEn}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all duration-200"
              style={{
                backgroundColor: active ? `color-mix(in srgb, ${opt.color} 8%, transparent)` : 'transparent',
                color: active ? opt.color : 'var(--sim-text-muted)',
                borderColor: active ? `color-mix(in srgb, ${opt.color} 25%, transparent)` : 'var(--sim-border)',
                fontWeight: active ? 500 : 400,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                style={{ backgroundColor: opt.color, opacity: active ? 1 : 0.3 }}
              />
              {lang === 'ru' ? opt.labelRu : opt.labelEn}
            </button>
          )
        })}
      </div>
    </div>
  )
}
