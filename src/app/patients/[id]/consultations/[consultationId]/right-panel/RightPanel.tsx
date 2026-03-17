'use client'

import { Consultation, StructuredSymptom, ClinicalAssessment, ClinicalDecision, Patient } from '@/types'
import ActiveRemedy from './ActiveRemedy'
import SymptomDynamicsPanel from './SymptomDynamics'
import DecisionBlock from './DecisionBlock'
import PreviousVisitSummary from './PreviousVisitSummary'
import { getAge } from '@/lib/utils'

type Props = {
  previousConsultation: Consultation | null
  patient: Patient
  symptoms: StructuredSymptom[]
  previousSymptoms: StructuredSymptom[]
  assessment: ClinicalAssessment | null
  onOpenRepertory: () => void
  lang: 'ru' | 'en'
}

export default function RightPanel({
  previousConsultation,
  patient,
  symptoms,
  previousSymptoms,
  assessment,
  onOpenRepertory,
  lang,
}: Props) {

  // Первая консультация — показываем карточку пациента
  if (!previousConsultation) {
    return (
      <div style={{ padding: '12px' }}>
        <FirstVisitContext patient={patient} lang={lang} />
        {symptoms.length === 0 && <EmptySymptomHint lang={lang} />}
        {symptoms.length > 0 && assessment && (
          <SymptomDynamicsPanel
            symptoms={symptoms}
            previousSymptoms={[]}
            assessment={assessment}
            lang={lang}
          />
        )}
      </div>
    )
  }

  const hasDynamics = symptoms.length > 0 || previousSymptoms.length > 0

  return (
    <div style={{ padding: '12px' }}>

      {/* 1. Активный препарат — всегда первым если есть */}
      {previousConsultation.remedy && (
        <ActiveRemedy previousConsultation={previousConsultation} lang={lang} />
      )}

      {/* Если нет симптомов — подсказка */}
      {symptoms.length === 0 && !previousConsultation.remedy && (
        <EmptySymptomHint lang={lang} />
      )}

      {/* Если нет симптомов но есть препарат — краткая подсказка */}
      {symptoms.length === 0 && previousConsultation.remedy && (
        <div style={{
          fontSize: '12px', color: '#b0a090', lineHeight: 1.5,
          padding: '10px 12px',
          backgroundColor: '#faf7f2',
          borderRadius: '8px',
          marginBottom: '12px',
        }}>
          {lang === 'ru'
            ? 'Добавьте симптомы слева — здесь появится анализ динамики'
            : 'Add symptoms on the left — dynamics will appear here'}
        </div>
      )}

      {/* 2. Динамика симптомов + статус */}
      {hasDynamics && (
        <SymptomDynamicsPanel
          symptoms={symptoms}
          previousSymptoms={previousSymptoms}
          assessment={assessment}
          lang={lang}
        />
      )}

      {/* 3. Решение */}
      {assessment && (
        <DecisionBlock
          assessment={assessment}
          onConfirm={(_decision: ClinicalDecision) => {/* сохранение при необходимости */}}
          onOpenRepertory={onOpenRepertory}
          lang={lang}
        />
      )}

      {/* 4. Прошлый приём */}
      <PreviousVisitSummary previousConsultation={previousConsultation} lang={lang} />
    </div>
  )
}

// Карточка контекста для первого визита
function FirstVisitContext({ patient, lang }: { patient: Patient; lang: 'ru' | 'en' }) {
  const hasContext = patient.constitutional_type || patient.birth_date || patient.notes

  return (
    <div style={{
      backgroundColor: '#f0f7f0',
      borderLeft: '3px solid #2d6a4f',
      borderRadius: '6px',
      padding: '10px 12px',
      marginBottom: '12px',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#2d6a4f', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        {lang === 'ru' ? 'Первый приём' : 'First visit'}
      </div>

      {patient.constitutional_type && (
        <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: '16px', fontWeight: 600, color: '#1a3020', marginBottom: '4px' }}>
          {patient.constitutional_type}
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {patient.birth_date && <span>{getAge(patient.birth_date)}</span>}
        {!hasContext && (
          <span style={{ color: '#b0a090' }}>
            {lang === 'ru' ? 'Данные не заполнены' : 'No data yet'}
          </span>
        )}
      </div>

      {patient.notes && (
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', lineHeight: 1.5, borderTop: '1px solid rgba(45,106,79,0.1)', paddingTop: '6px' }}>
          {patient.notes.length > 120 ? patient.notes.slice(0, 120) + '…' : patient.notes}
        </div>
      )}
    </div>
  )
}

// Подсказка когда симптомов нет
function EmptySymptomHint({ lang }: { lang: 'ru' | 'en' }) {
  return (
    <div style={{
      fontSize: '12px',
      color: '#b0a090',
      lineHeight: 1.6,
      padding: '10px 12px',
      backgroundColor: '#faf7f2',
      borderRadius: '8px',
      marginBottom: '12px',
    }}>
      {lang === 'ru'
        ? 'Добавьте симптомы слева — здесь появится анализ динамики'
        : 'Add symptoms on the left — dynamics will appear here'}
    </div>
  )
}
