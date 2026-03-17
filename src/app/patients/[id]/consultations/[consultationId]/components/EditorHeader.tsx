'use client'

import { useConsultation } from '../context/ConsultationContext'
import { formatDate, getAge } from '@/lib/utils'
import { ConsultationType } from '@/types'

const TYPE_DOT: Record<ConsultationType, string> = {
  chronic: '#2d6a4f',
  acute:   '#c8a035',
}

type Props = {
  visitNumber: number
}

export default function EditorHeader({ visitNumber }: Props) {
  const { consultation, patient } = useConsultation()
  const { type } = useConsultation().state

  const dotColor = TYPE_DOT[type]

  const contextParts: string[] = []
  if (patient.birth_date) contextParts.push(getAge(patient.birth_date))
  if (patient.constitutional_type) contextParts.push(patient.constitutional_type)
  if (visitNumber > 0) {
    const n = visitNumber
    const suffix = n === 1 ? '1-й приём' : `${n}-й приём`
    contextParts.push(suffix)
  }

  return (
    <div className="px-5 lg:px-6 py-3" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-card)' }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight truncate leading-tight" style={{ color: 'var(--sim-text)' }}>
            {patient.name}
          </h1>
          {contextParts.length > 0 ? (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--sim-text-hint)' }}>
              {contextParts.join(' · ')}
            </p>
          ) : (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--sim-text-hint)' }}>
              {formatDate(consultation.date)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
