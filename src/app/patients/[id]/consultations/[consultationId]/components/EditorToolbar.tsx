'use client'

import { useConsultation } from '../context/ConsultationContext'
import { t } from '@/lib/shared/i18n'
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
  const isChronic = type === 'chronic'

  return (
    <div
      data-tour="editor-toolbar"
      className="px-5 lg:px-7 py-2.5 flex items-center gap-2.5 overflow-x-auto scrollbar-none"
      style={{ borderBottom: '1px solid var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
    >
      {/* Сегментированный переключатель: хронический / острый */}
      <div
        data-tour="type-toggle"
        className="inline-flex items-center gap-0.5 rounded-lg p-[3px] shrink-0"
        style={{ backgroundColor: '#eae6de' }}
      >
        {[
          { key: 'chronic', label: lang === 'ru' ? 'Хронический' : 'Chronic', active: isChronic, color: '#2d6a4f' },
          { key: 'acute', label: lang === 'ru' ? 'Острый' : 'Acute', active: !isChronic, color: '#b45309' },
        ].map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={opt.active ? undefined : toggleType}
            className="relative text-[11px] font-medium px-3.5 py-[5px] rounded-md transition-all duration-200"
            style={{
              backgroundColor: opt.active ? '#ffffff' : 'transparent',
              color: opt.active ? opt.color : '#9a9080',
              boxShadow: opt.active
                ? '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)'
                : 'none',
              cursor: opt.active ? 'default' : 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Реперторий */}
      <button
        data-tour="open-repertory"
        type="button"
        onClick={onOpenRepertory}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3.5 py-[7px] rounded-lg shrink-0 transition-all duration-200 hover:-translate-y-px"
        style={{
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          border: '1px solid #e0d8cc',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
        title={lang === 'ru' ? 'Открыть мини-реперторий' : 'Open mini-repertory'}
      >
        <svg className="w-3.5 h-3.5" style={{ color: '#2d6a4f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3.5 py-[7px] rounded-lg shrink-0 transition-all duration-200 disabled:opacity-50 hover:-translate-y-px"
          style={{
            backgroundColor: hasAIResult ? 'rgba(45,106,79,0.06)' : '#2d6a4f',
            color: hasAIResult ? '#2d6a4f' : '#ffffff',
            border: `1px solid ${hasAIResult ? 'rgba(45,106,79,0.2)' : '#2d6a4f'}`,
            boxShadow: hasAIResult ? 'none' : '0 1px 3px rgba(45,106,79,0.3)',
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
