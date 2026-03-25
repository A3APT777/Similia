'use client'

import { useConsultation } from '../context/ConsultationContext'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  onOpenRepertory: () => void
  onStartMiniTour?: () => void
  onRunAI?: () => void
  aiLoading?: boolean
  hasAIResult?: boolean
}

export default function EditorToolbar({ onOpenRepertory, onStartMiniTour, onRunAI, aiLoading, hasAIResult }: Props) {
  const { state, toggleType } = useConsultation()
  const { lang } = useLanguage()

  const { type } = state
  const typeLabel = type === 'chronic' ? t(lang).consultation.chronicShort : t(lang).consultation.acuteShort

  return (
    <div
      data-tour="editor-toolbar"
      className="px-5 lg:px-7 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none"
      style={{ borderBottom: '1px solid var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
    >
      {/* Тип */}
      <button
        data-tour="type-toggle"
        type="button"
        onClick={toggleType}
        title={t(lang).consultation.changeTypeHint}
        aria-label={lang === 'ru' ? `Тип: ${typeLabel}` : `Type: ${typeLabel}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-200 shrink-0"
        style={{
          backgroundColor: type === 'acute' ? 'rgba(180,83,9,0.06)' : 'rgba(45,106,79,0.06)',
          color: type === 'acute' ? '#b45309' : 'var(--sim-green)',
          border: `1px solid ${type === 'acute' ? 'rgba(180,83,9,0.15)' : 'rgba(45,106,79,0.15)'}`,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: type === 'acute' ? '#b45309' : 'var(--sim-green)' }}
        />
        {typeLabel}
      </button>

      {/* Реперторий */}
      <button
        data-tour="open-repertory"
        type="button"
        onClick={onOpenRepertory}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-200 shrink-0"
        style={{
          backgroundColor: 'var(--sim-bg-card)',
          color: 'var(--sim-text)',
          border: '1px solid var(--sim-border)',
        }}
        title={lang === 'ru' ? 'Открыть мини-реперторий' : 'Open mini-repertory'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        {t(lang).consultation.repertory}
      </button>

      {/* AI */}
      {onRunAI && (
        <button
          type="button"
          onClick={onRunAI}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all duration-200 shrink-0 disabled:opacity-50"
          style={{
            backgroundColor: hasAIResult ? 'rgba(45,106,79,0.06)' : 'var(--sim-green)',
            color: hasAIResult ? 'var(--sim-green)' : '#fff',
            border: `1px solid ${hasAIResult ? 'rgba(45,106,79,0.2)' : 'var(--sim-green)'}`,
          }}
          title={lang === 'ru' ? 'AI-анализ' : 'AI analysis'}
        >
          {aiLoading ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
          {aiLoading ? (lang === 'ru' ? 'Анализ...' : 'Analyzing...') : hasAIResult ? 'AI ✓' : 'AI'}
        </button>
      )}
    </div>
  )
}
