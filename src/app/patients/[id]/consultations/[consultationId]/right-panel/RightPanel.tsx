'use client'

import { Consultation, Patient, PreVisitSurvey } from '@/types'
import ActiveRemedy from './ActiveRemedy'
import PreviousVisitSummary from './PreviousVisitSummary'
import PreVisitSurveyPanel from './PreVisitSurveyPanel'
import AIResultPanel from './AIResultPanel'
import SuggestionReview from './SuggestionReview'
import DifferentialClarify from './DifferentialClarify'
import { getAge } from '@/lib/utils'
import type { ConsensusResult, ParsedSuggestion, ParseSuggestionsResult } from '@/lib/mdri/types'
import type { DifferentialQuestion } from '@/lib/mdri/differential'

type Props = {
  previousConsultation: Consultation | null
  patient: Patient
  lang: 'ru' | 'en'
  preVisitSurvey?: PreVisitSurvey | null
  primaryIntakeAnswers?: Record<string, unknown> | null
  // unused props kept for compat with ConsultationEditor call site
  symptoms?: unknown
  previousSymptoms?: unknown
  assessment?: unknown
  onOpenRepertory?: () => void
  onAssignRemedy?: (abbrev: string) => void
  // AI-результат из консультации
  aiResult?: ConsensusResult | null
  // Hybrid parsing
  suggestions?: ParseSuggestionsResult | null
  onConfirmSuggestions?: (confirmed: ParsedSuggestion[], familyHistory: string[]) => void
  onCancelSuggestions?: () => void
  analyzingConfirmed?: boolean
  // Differential clarify
  clarifyQuestions?: DifferentialQuestion[]
  onClarifySubmit?: (answers: Record<string, string>) => void
  onClarifySkip?: () => void
  clarifyLoading?: boolean
}

export default function RightPanel({ previousConsultation, patient, lang, preVisitSurvey, primaryIntakeAnswers, onAssignRemedy, aiResult, suggestions, onConfirmSuggestions, onCancelSuggestions, analyzingConfirmed, clarifyQuestions, onClarifySubmit, onClarifySkip, clarifyLoading }: Props) {
  const handleAIAssign = onAssignRemedy
    ? (abbrev: string, _potency: string) => onAssignRemedy(abbrev)
    : undefined

  // Suggestion review (шаг 1 hybrid parsing)
  const suggestionPanel = suggestions && onConfirmSuggestions && onCancelSuggestions ? (
    <SuggestionReview
      data={suggestions}
      onConfirm={onConfirmSuggestions}
      onCancel={onCancelSuggestions}
      loading={analyzingConfirmed}
    />
  ) : null

  if (!previousConsultation) {
    const hasPatientContext = patient.constitutional_type || patient.birth_date || patient.notes
    return (
      <div className="p-4 space-y-3">
        {hasPatientContext && <FirstVisitContext patient={patient} lang={lang} />}
        {suggestionPanel}
        {aiResult && !suggestions && <AIResultPanel aiResult={aiResult} lang={lang} onAssignRemedy={handleAIAssign} />}
      {clarifyQuestions && clarifyQuestions.length > 0 && onClarifySubmit && onClarifySkip && (
        <DifferentialClarify questions={clarifyQuestions} onSubmit={onClarifySubmit} onSkip={onClarifySkip} loading={clarifyLoading} />
      )}
        {preVisitSurvey && <PreVisitSurveyPanel survey={preVisitSurvey} lang={lang} />}
        {primaryIntakeAnswers && <PrimaryIntakeSection answers={primaryIntakeAnswers} lang={lang} />}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {suggestionPanel}
      {aiResult && !suggestions && <AIResultPanel aiResult={aiResult} lang={lang} onAssignRemedy={handleAIAssign} />}
      {clarifyQuestions && clarifyQuestions.length > 0 && onClarifySubmit && onClarifySkip && (
        <DifferentialClarify questions={clarifyQuestions} onSubmit={onClarifySubmit} onSkip={onClarifySkip} loading={clarifyLoading} />
      )}
      {preVisitSurvey && <PreVisitSurveyPanel survey={preVisitSurvey} lang={lang} />}

      {previousConsultation.remedy && (
        <ActiveRemedy previousConsultation={previousConsultation} lang={lang} />
      )}

      <PreviousVisitSummary previousConsultation={previousConsultation} lang={lang} />

      {primaryIntakeAnswers && <PrimaryIntakeSection answers={primaryIntakeAnswers} lang={lang} />}
    </div>
  )
}

function PrimaryIntakeSection({ answers, lang }: { answers: Record<string, unknown>; lang: 'ru' | 'en' }) {
  const DEFAULT_LABELS: Record<string, string> = {
    chief_complaint: 'Жалобы',
    duration: 'Как давно',
    etiology: 'С чего началось',
    modality_worse: 'Хуже от',
    modality_better: 'Лучше от',
    mental: 'Психика',
    general: 'Общие симптомы',
    sleep: 'Сон',
    appetite: 'Аппетит',
    thirst: 'Жажда',
    perspiration: 'Потоотделение',
    family_history: 'Наследственность',
  }

  // Показываем все непустые ответы — и стандартные и кастомные
  const SKIP_KEYS = ['patient_name', 'birth_date', 'phone', 'email']
  const entries = Object.entries(answers)
    .filter(([k, v]) => !SKIP_KEYS.includes(k) && v && String(v).trim())
    .map(([k, v]) => ({
      key: k,
      label: DEFAULT_LABELS[k] || k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
      value: String(v),
    }))

  if (entries.length === 0) return null

  return (
    <details className="rounded-lg" style={{ backgroundColor: '#faf6f1', border: '1px solid #e8ddd0' }}>
      <summary className="px-3 py-2.5 cursor-pointer text-xs font-semibold uppercase tracking-wide" style={{ color: '#8a7e6c' }}>
        {lang === 'ru' ? 'Первичная анкета' : 'Primary intake'} ({entries.length})
      </summary>
      <div className="px-3 pb-3 space-y-2">
        {entries.map(e => (
          <div key={e.key}>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#a09080' }}>{e.label}</p>
            <p className="text-xs leading-relaxed" style={{ color: '#4a4a3a' }}>{e.value}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

function FirstVisitContext({ patient, lang }: { patient: Patient; lang: 'ru' | 'en' }) {
  const hasContext = patient.constitutional_type || patient.birth_date || patient.notes
  return (
    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: '#f4f9f5', border: '1px solid #c6e5cc' }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--sim-green)' }}>
        {lang === 'ru' ? 'Первичный приём' : 'First visit'}
      </div>
      {patient.constitutional_type && (
        <div className="text-base font-semibold mb-1.5" style={{ fontFamily: 'var(--font-cormorant)', color: '#1a3d2b' }}>
          {patient.constitutional_type}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 text-[12px]" style={{ color: '#6b7280' }}>
        {patient.birth_date && <span>{getAge(patient.birth_date)}</span>}
        {!hasContext && (
          <span style={{ color: '#b0a090' }}>
            {lang === 'ru' ? 'Данные не заполнены' : 'No data yet'}
          </span>
        )}
      </div>
      {patient.notes && (
        <div className="text-[12px] mt-2 leading-relaxed pt-2" style={{ color: '#5a6878', borderTop: '1px solid #d4ead8' }}>
          {patient.notes.length > 150 ? patient.notes.slice(0, 150) + '…' : patient.notes}
        </div>
      )}
    </div>
  )
}
