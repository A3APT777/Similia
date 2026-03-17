'use client'

import { useConsultation } from '../context/ConsultationContext'
import { formatDate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { ConsultationType } from '@/types'

const TYPE_STYLE = {
  chronic: {
    dotStyle: { backgroundColor: 'var(--color-primary)' },
  },
  acute: {
    dotStyle: { backgroundColor: 'var(--color-amber)' },
  },
}

type Props = {
  onFinish: () => void
}

export default function EditorHeader({ onFinish }: Props) {
  const { state, consultation, patient } = useConsultation()
  const { lang } = useLanguage()

  const { saveState, savedAt, notes, type } = state
  const dotStyle = TYPE_STYLE[type].dotStyle

  return (
    <div className="px-6 py-3.5" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-card)' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={dotStyle} />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 tracking-tight truncate">{patient.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400">{formatDate(consultation.date)}</span>
              {patient.phone && <span className="text-gray-200 text-xs hidden sm:inline">&middot;</span>}
              {patient.phone && <span className="text-xs text-gray-400 hidden sm:inline">{patient.phone}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs">
            {saveState === 'saved' && notes.trim().length > 0 && (
              <span className="flex items-center gap-1 text-emerald-500">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {savedAt ? t(lang).consultation.savedAt(savedAt) : t(lang).consultation.save}
              </span>
            )}
            {saveState === 'saving' && <span className="text-gray-400 animate-pulse">{t(lang).consultation.saving}</span>}
            {saveState === 'unsaved' && (
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {t(lang).consultation.unsaved}
              </span>
            )}
          </div>

          <button
            onClick={onFinish}
            className="bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-sm shadow-emerald-900/10"
          >
            {t(lang).consultation.finish}
          </button>
        </div>
      </div>
    </div>
  )
}
