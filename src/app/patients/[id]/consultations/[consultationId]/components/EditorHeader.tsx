'use client'

import Link from 'next/link'
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
  const { consultation, patient, state } = useConsultation()
  const { type, saveState } = state

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
    <div style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-card)' }}>
      {/* Хлебные крошки */}
      <div className="px-5 lg:px-6 pt-2.5 pb-1 flex items-center gap-1.5 min-w-0">
        <Link href="/dashboard" className="text-[11px] transition-colors hover:underline" style={{ color: 'var(--sim-text-hint)' }}>
          Пациенты
        </Link>
        <svg className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--sim-border)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <Link href={`/patients/${consultation.patient_id}`} className="text-[11px] truncate transition-colors hover:underline max-w-[120px]" style={{ color: 'var(--sim-text-hint)' }}>
          {patient.name}
        </Link>
        <svg className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--sim-border)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[11px] truncate" style={{ color: 'var(--sim-text-sec)' }}>
          {formatDate(consultation.date)}
        </span>
      </div>

      {/* Основная строка */}
      <div className="px-5 lg:px-6 pb-2.5 flex items-center justify-between gap-2.5 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight truncate leading-tight" style={{ color: 'var(--sim-text)' }}>
              {patient.name}
            </h1>
            {contextParts.length > 0 && (
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--sim-text-hint)' }}>
                {contextParts.join(' · ')}
              </p>
            )}
          </div>
        </div>
        {/* Индикатор автосейва — всегда виден */}
        <div className="shrink-0 text-[11px] flex items-center gap-1">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1 animate-pulse" style={{ color: 'var(--sim-text-hint)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
              Сохранение…
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1" style={{ color: 'var(--sim-green)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Сохранено
            </span>
          )}
          {saveState === 'unsaved' && (
            <span className="flex items-center gap-1" style={{ color: 'var(--sim-amber)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sim-amber)' }} />
              Не сохранено
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
