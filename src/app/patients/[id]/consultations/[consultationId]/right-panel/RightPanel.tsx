'use client'

import { useState } from 'react'
import { Consultation, StructuredSymptom, ClinicalAssessment, ClinicalDecision } from '@/types'
import ActiveRemedy from './ActiveRemedy'
import ClinicalSummaryBlock from './ClinicalSummaryBlock'
import CaseStateBlock from './CaseStateBlock'
import SymptomDynamicsPanel from './SymptomDynamics'
import DecisionBlock from './DecisionBlock'
import PreviousVisitSummary from './PreviousVisitSummary'

type Props = {
  previousConsultation: Consultation | null
  symptoms: StructuredSymptom[]
  previousSymptoms: StructuredSymptom[]
  assessment: ClinicalAssessment | null
  onOpenRepertory: () => void
  lang: 'ru' | 'en'
}

export default function RightPanel({
  previousConsultation,
  symptoms,
  previousSymptoms,
  assessment,
  onOpenRepertory,
  lang,
}: Props) {
  const [showDecisions, setShowDecisions] = useState(false)

  // Первая консультация — нет предыдущей
  if (!previousConsultation) {
    return (
      <div style={{
        padding: '16px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
          {lang === 'ru' ? 'Первая консультация' : 'First consultation'}
        </span>
      </div>
    )
  }

  // Определяем, есть ли симптомы с dynamics
  const hasDynamicSymptoms = symptoms.some(s => s.dynamics) ||
    (previousSymptoms.length > 0 && symptoms.length > 0)

  return (
    <div style={{
      padding: '12px',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* 1. Активный препарат */}
      {previousConsultation.remedy && (
        <ActiveRemedy
          previousConsultation={previousConsultation}
          lang={lang}
        />
      )}

      {/* 2. Clinical summary (badges) */}
      {assessment && symptoms.length > 0 && (
        <ClinicalSummaryBlock assessment={assessment} lang={lang} />
      )}

      {/* 3. Case state badge */}
      {assessment && (
        <CaseStateBlock caseState={assessment.caseState} lang={lang} />
      )}

      {/* 4. Symptom dynamics list */}
      {hasDynamicSymptoms && (
        <SymptomDynamicsPanel
          symptoms={symptoms}
          previousSymptoms={previousSymptoms}
          lang={lang}
        />
      )}

      {/* 5. Decision block toggle */}
      {assessment && (
        <>
          {!showDecisions ? (
            <button
              onClick={() => setShowDecisions(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e0d8',
                backgroundColor: '#faf7f2',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                color: '#2d6a4f',
                marginBottom: '12px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0ebe3')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#faf7f2')}
            >
              {/* Action icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.75V12.25M1.75 7H12.25" stroke="#2d6a4f" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              {lang === 'ru' ? 'Варианты действий' : 'Action options'}
            </button>
          ) : (
            <div>
              <button
                onClick={() => setShowDecisions(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: '#9ca3af',
                  padding: '0 0 6px 0',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {lang === 'ru' ? 'Скрыть' : 'Hide'}
              </button>
              <DecisionBlock
                assessment={assessment}
                onConfirm={(decision: ClinicalDecision) => {
                  // Здесь можно добавить сохранение решения
                  setShowDecisions(false)
                }}
                onOpenRepertory={onOpenRepertory}
                lang={lang}
              />
            </div>
          )}
        </>
      )}

      {/* 6. Previous visit summary (collapsible) */}
      <PreviousVisitSummary
        previousConsultation={previousConsultation}
        lang={lang}
      />
    </div>
  )
}
