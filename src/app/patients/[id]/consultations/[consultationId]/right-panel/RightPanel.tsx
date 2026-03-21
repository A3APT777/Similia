'use client'

import { Consultation, Patient, PreVisitSurvey } from '@/types'
import ActiveRemedy from './ActiveRemedy'
import PreviousVisitSummary from './PreviousVisitSummary'
import PreVisitSurveyPanel from './PreVisitSurveyPanel'
import AIResultPanel from './AIResultPanel'
import { getAge } from '@/lib/utils'
import type { ConsensusResult } from '@/lib/mdri/types'

type Props = {
  previousConsultation: Consultation | null
  patient: Patient
  lang: 'ru' | 'en'
  preVisitSurvey?: PreVisitSurvey | null
  // unused props kept for compat with ConsultationEditor call site
  symptoms?: unknown
  previousSymptoms?: unknown
  assessment?: unknown
  onOpenRepertory?: () => void
  onAssignRemedy?: (abbrev: string) => void
  // AI-результат из консультации
  aiResult?: ConsensusResult | null
}

export default function RightPanel({ previousConsultation, patient, lang, preVisitSurvey, onAssignRemedy, aiResult }: Props) {
  // Обёртка для onAssignRemedy — AI передаёт (abbrev, potency), RightPanel принимает (abbrev)
  const handleAIAssign = onAssignRemedy
    ? (abbrev: string, _potency: string) => onAssignRemedy(abbrev)
    : undefined

  if (!previousConsultation) {
    return (
      <div className="p-4 space-y-3">
        <FirstVisitContext patient={patient} lang={lang} />
        {aiResult && <AIResultPanel aiResult={aiResult} lang={lang} onAssignRemedy={handleAIAssign} />}
        {preVisitSurvey && <PreVisitSurveyPanel survey={preVisitSurvey} lang={lang} />}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {aiResult && <AIResultPanel aiResult={aiResult} lang={lang} onAssignRemedy={handleAIAssign} />}
      {preVisitSurvey && <PreVisitSurveyPanel survey={preVisitSurvey} lang={lang} />}

      {previousConsultation.remedy && (
        <ActiveRemedy previousConsultation={previousConsultation} lang={lang} />
      )}

      <PreviousVisitSummary previousConsultation={previousConsultation} lang={lang} />
    </div>
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
