'use client'

import { Consultation, StructuredSymptom, ClinicalAssessment, ClinicalDecision, Patient } from '@/types'
import ActiveRemedy from './ActiveRemedy'
import SymptomDynamicsPanel from './SymptomDynamics'
import DecisionBlock from './DecisionBlock'
import PreviousVisitSummary from './PreviousVisitSummary'
import TopRemediesPanel from './TopRemediesPanel'
import { getAge } from '@/lib/utils'

type Props = {
  previousConsultation: Consultation | null
  patient: Patient
  symptoms: StructuredSymptom[]
  previousSymptoms: StructuredSymptom[]
  assessment: ClinicalAssessment | null
  onOpenRepertory: () => void
  onAssignRemedy?: (abbrev: string) => void
  lang: 'ru' | 'en'
}

export default function RightPanel({
  previousConsultation,
  patient,
  symptoms,
  previousSymptoms,
  assessment,
  onOpenRepertory,
  onAssignRemedy,
  lang,
}: Props) {
  if (!previousConsultation) {
    return (
      <div className="p-3">
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
        <TopRemediesPanel lang={lang} onAssignRemedy={onAssignRemedy} />
      </div>
    )
  }

  const hasDynamics = symptoms.length > 0 || previousSymptoms.length > 0

  return (
    <div className="p-3">
      {previousConsultation.remedy && (
        <ActiveRemedy previousConsultation={previousConsultation} lang={lang} />
      )}

      {symptoms.length === 0 && !previousConsultation.remedy && (
        <EmptySymptomHint lang={lang} />
      )}

      {symptoms.length === 0 && previousConsultation.remedy && (
        <div className="text-xs leading-relaxed px-3 py-2.5 rounded-lg mb-3" style={{ color: '#7a6a5a', backgroundColor: '#faf7f2', borderLeft: '3px solid #d4c9b8' }}>
          {lang === 'ru'
            ? 'Добавьте ключевые симптомы слева — правая панель покажет как изменилась динамика по сравнению с прошлым приёмом'
            : 'Add key symptoms on the left — panel will show how dynamics changed since last visit'}
        </div>
      )}

      {hasDynamics && (
        <SymptomDynamicsPanel
          symptoms={symptoms}
          previousSymptoms={previousSymptoms}
          assessment={assessment}
          lang={lang}
        />
      )}

      <TopRemediesPanel lang={lang} onAssignRemedy={onAssignRemedy} />

      {assessment && (
        <DecisionBlock
          assessment={assessment}
          onConfirm={(_decision: ClinicalDecision) => {}}
          onOpenRepertory={onOpenRepertory}
          lang={lang}
        />
      )}

      <PreviousVisitSummary previousConsultation={previousConsultation} lang={lang} />
    </div>
  )
}

function FirstVisitContext({ patient, lang }: { patient: Patient; lang: 'ru' | 'en' }) {
  const hasContext = patient.constitutional_type || patient.birth_date || patient.notes

  return (
    <div className="rounded-md px-3 py-2.5 mb-3" style={{ backgroundColor: '#f0f7f0', borderLeft: '3px solid var(--color-garden)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.5px] mb-1.5" style={{ color: 'var(--color-garden)' }}>
        {lang === 'ru' ? 'Первый приём' : 'First visit'}
      </div>
      {patient.constitutional_type && (
        <div className="text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-cormorant)', color: 'var(--color-forest)' }}>
          {patient.constitutional_type}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
        {patient.birth_date && <span>{getAge(patient.birth_date)}</span>}
        {!hasContext && (
          <span className="text-[#b0a090]">
            {lang === 'ru' ? 'Данные не заполнены' : 'No data yet'}
          </span>
        )}
      </div>
      {patient.notes && (
        <div className="text-[11px] text-gray-500 mt-1.5 leading-relaxed pt-1.5" style={{ borderTop: '1px solid rgba(45,106,79,0.1)' }}>
          {patient.notes.length > 120 ? patient.notes.slice(0, 120) + '…' : patient.notes}
        </div>
      )}
    </div>
  )
}

function EmptySymptomHint({ lang }: { lang: 'ru' | 'en' }) {
  return (
    <div className="text-xs leading-relaxed px-3.5 py-3 rounded-lg mb-3" style={{ color: '#7a6a5a', backgroundColor: '#faf7f2', borderLeft: '3px solid #d4c9b8' }}>
      <div className="font-semibold mb-1.5 text-[#5a4a3a]">
        {lang === 'ru' ? 'Заполните приём слева:' : 'Fill in the visit on the left:'}
      </div>
      <ol className="list-decimal pl-3.5 m-0 space-y-0.5">
        {lang === 'ru' ? (
          <>
            <li>Запишите жалобы пациента</li>
            <li>Добавьте ключевые симптомы</li>
            <li>Назначьте препарат в блоке «Назначение»</li>
          </>
        ) : (
          <>
            <li>Write down patient complaints</li>
            <li>Add key symptoms</li>
            <li>Prescribe a remedy in the &quot;Prescription&quot; block</li>
          </>
        )}
      </ol>
    </div>
  )
}
