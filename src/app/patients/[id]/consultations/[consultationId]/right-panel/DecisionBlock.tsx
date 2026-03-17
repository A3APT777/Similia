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
  const [confirmed, setConfirmed] = useState(assessment.decisionStatus === 'confirmed')

  function handleConfirm() {
    setConfirmed(true)
    onConfirm(selected)
  }

  if (confirmed) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: '6px',
        backgroundColor: '#ecfdf5',
        border: '1px solid #a7f3d0',
        marginBottom: '12px',
      }}>
        {/* SVG checkmark */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="8" fill="#059669" />
          <path d="M4.5 8L7 10.5L11.5 5.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: '13px', color: '#1a3020' }}>
          {DECISION_LABELS[lang][selected]}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      padding: '12px',
      borderRadius: '6px',
      backgroundColor: '#faf7f2',
      border: '1px solid #e5e0d8',
      marginBottom: '12px',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        color: '#6b7280',
        marginBottom: '8px',
      }}>
        {lang === 'ru' ? 'Возможные действия' : 'Possible actions'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
        {ALL_DECISIONS.map(d => {
          const isSelected = d === selected
          const isSuggested = d === assessment.suggestedDecision

          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: isSelected
                  ? '1.5px solid #2d6a4f'
                  : isSuggested
                    ? '1px solid #d1d5db'
                    : '1px solid transparent',
                backgroundColor: isSelected
                  ? '#e8f0e8'
                  : isSuggested
                    ? '#faf7f2'
                    : 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#1a3020',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Radio circle */}
              <span style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: isSelected ? '4px solid #2d6a4f' : '1.5px solid #9ca3af',
                backgroundColor: '#fff',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }} />
              <span>{DECISION_LABELS[lang][d]}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleConfirm}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#2d6a4f',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {lang === 'ru' ? 'Подтвердить' : 'Confirm'}
        </button>
        <button
          onClick={onOpenRepertory}
          style={{
            flex: 1,
            padding: '7px 12px',
            borderRadius: '6px',
            border: '1px solid #2d6a4f',
            backgroundColor: 'transparent',
            color: '#2d6a4f',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#e8f0e8')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {lang === 'ru' ? 'Подобрать препарат' : 'Find remedy'}
        </button>
      </div>
    </div>
  )
}
