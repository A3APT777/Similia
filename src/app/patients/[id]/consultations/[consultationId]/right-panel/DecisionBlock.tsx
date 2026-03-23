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

export default function DecisionBlock({ assessment, onConfirm, lang }: Props) {
  const [selected, setSelected] = useState<ClinicalDecision>(
    assessment.confirmedDecision || assessment.suggestedDecision
  )

  function handleSelect(d: ClinicalDecision) {
    setSelected(d)
    onConfirm(d)
  }

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-[0.5px] mb-1.5">
        {lang === 'ru' ? 'Решение' : 'Decision'}
      </div>
      <div className="flex flex-wrap gap-1">
        {ALL_DECISIONS.map(d => {
          const isSelected = d === selected
          const isSuggested = d === assessment.suggestedDecision
          return (
            <button
              key={d}
              onClick={() => handleSelect(d)}
              className="px-2.5 py-1 rounded-[20px] text-xs leading-snug transition-all duration-[120ms] cursor-pointer"
              style={{
                border: isSelected ? '1.5px solid var(--color-garden)' : isSuggested ? '1.5px dashed #b0c4b0' : '1px solid rgba(0,0,0,0.08)',
                backgroundColor: isSelected ? 'var(--color-garden)' : isSuggested ? '#f0f7f0' : 'transparent',
                color: isSelected ? '#fff' : '#374151',
                fontWeight: isSelected ? 600 : 400,
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
