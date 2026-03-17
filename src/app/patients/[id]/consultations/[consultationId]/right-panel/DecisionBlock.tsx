'use client'

import { useState } from 'react'
import { ClinicalAssessment, ClinicalDecision } from '@/types'
import { DECISION_LABELS } from '@/lib/clinicalEngine'

type Props = {
  assessment: ClinicalAssessment
  onConfirm: (decision: ClinicalDecision) => void
  onOpenRepertory: () => void
  lang: 'ru' | 'en'
}

const ALL_DECISIONS: ClinicalDecision[] = [
  'continue', 'wait', 'increase', 'change', 'antidote', 'refer',
]

export default function DecisionBlock({ assessment, onConfirm, onOpenRepertory, lang }: Props) {
  const [selected, setSelected] = useState<ClinicalDecision>(
    assessment.confirmedDecision || assessment.suggestedDecision
  )

  function handleSelect(d: ClinicalDecision) {
    setSelected(d)
    onConfirm(d)
  }

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
        {lang === 'ru' ? 'Решение' : 'Decision'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {ALL_DECISIONS.map(d => {
          const isSelected = d === selected
          const isSuggested = d === assessment.suggestedDecision

          return (
            <button
              key={d}
              onClick={() => handleSelect(d)}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: isSelected
                  ? '1.5px solid #2d6a4f'
                  : isSuggested
                    ? '1.5px dashed #b0c4b0'
                    : '1px solid #e5e0d8',
                backgroundColor: isSelected ? '#2d6a4f' : isSuggested ? '#f0f7f0' : 'transparent',
                color: isSelected ? '#fff' : '#374151',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                lineHeight: 1.4,
              }}
            >
              {DECISION_LABELS[lang][d]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
