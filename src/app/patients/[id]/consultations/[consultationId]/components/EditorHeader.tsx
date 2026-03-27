'use client'

import Link from 'next/link'
import { useConsultation } from '../context/ConsultationContext'
import { formatDate, getAge } from '@/lib/utils'
import { ConsultationType } from '@/types'
import { useLanguage } from '@/hooks/useLanguage'

const TYPE_BADGE: Record<ConsultationType, { label: string; labelEn: string; bg: string; color: string }> = {
  chronic: { label: 'Хронический', labelEn: 'Chronic', bg: 'rgba(45,106,79,0.08)', color: '#2d6a4f' },
  acute:   { label: 'Острый', labelEn: 'Acute', bg: 'rgba(180,83,9,0.08)', color: '#b45309' },
}

type Props = {
  visitNumber: number
}

export default function EditorHeader({ visitNumber }: Props) {
  const { consultation, patient, state } = useConsultation()
  const { lang } = useLanguage()
  const { type, saveState } = state
  const badge = TYPE_BADGE[type]

  const age = patient.birth_date ? getAge(patient.birth_date) : null

  return (
    <div style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-card)' }}>
      <div className="px-5 lg:px-7 py-3 flex items-center justify-between gap-3 min-w-0">

        {/* Левая часть: навигация + имя */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Кнопка назад */}
          <Link
            href={`/patients/${consultation.patient_id}`}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 hover:bg-black/[0.04]"
          >
            <svg className="w-4 h-4 text-[#6b7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>

          {/* Имя + контекст */}
          <div className="min-w-0">
            <h1
              className="text-[20px] font-light tracking-[-0.01em] truncate leading-tight text-[#1a1a1a]"
              style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
            >
              {patient.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {age && <span className="text-[12px] text-[#6b7280]">{age}</span>}
              {patient.constitutional_type && (
                <>
                  <span className="text-[#6b7280]/30">·</span>
                  <span className="text-[12px] text-[#6b7280]">{patient.constitutional_type}</span>
                </>
              )}
              {visitNumber > 0 && (
                <>
                  <span className="text-[#6b7280]/30">·</span>
                  <span className="text-[12px] text-[#6b7280]">
                    {visitNumber === 1 ? (lang === 'ru' ? '1-й приём' : '1st visit') : `${visitNumber}-${lang === 'ru' ? 'й приём' : 'th visit'}`}
                  </span>
                </>
              )}
              {/* Тип консультации бейдж */}
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {lang === 'ru' ? badge.label : badge.labelEn}
              </span>
            </div>
          </div>
        </div>

        {/* Правая часть: автосейв */}
        <div className="shrink-0 text-[12px] flex items-center gap-1.5">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 animate-pulse text-[#6b7280]">
              <div className="w-3 h-3 border-[1.5px] border-[#6b7280] border-t-transparent rounded-full animate-spin" />
              {lang === 'ru' ? 'Сохранение' : 'Saving'}
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-[#2d6a4f]">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          {saveState === 'unsaved' && (
            <span className="flex items-center gap-1 text-[#c8a035]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8a035]" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
