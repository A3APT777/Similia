'use client'

import { useConsultation } from '../context/ConsultationContext'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const TYPE_STYLE = {
  chronic: {
    badgeStyle: { backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--sim-green)', borderColor: 'rgba(45,106,79,0.2)' },
  },
  acute: {
    badgeStyle: { backgroundColor: 'rgba(200,160,53,0.08)', color: 'var(--sim-amber)', borderColor: 'rgba(200,160,53,0.3)' },
  },
}

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
  const badgeStyle = TYPE_STYLE[type].badgeStyle
  const typeLabel = type === 'chronic' ? t(lang).consultation.chronicShort : t(lang).consultation.acuteShort

  return (
    <div data-tour="editor-toolbar" className="px-4 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-card)' }}>
      {/* Тип */}
      <button
        data-tour="type-toggle"
        type="button"
        onClick={toggleType}
        title={t(lang).consultation.changeTypeHint}
        aria-label={lang === 'ru' ? `Тип: ${typeLabel}. Нажмите для переключения` : `Type: ${typeLabel}. Click to toggle`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0"
        style={badgeStyle}
      >
        {type === 'acute' ? (
          <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
        ) : (
          <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        )}
        {typeLabel}
      </button>

      {/* Мини-реперторий (в правой панели) */}
      <button
        data-tour="open-repertory"
        type="button"
        onClick={onOpenRepertory}
        className="btn btn-secondary btn-sm shrink-0"
        title={lang === 'ru' ? 'Открыть мини-реперторий' : 'Open mini-repertory'}
        aria-label={lang === 'ru' ? 'Открыть мини-реперторий' : 'Open mini-repertory'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
        {t(lang).consultation.repertory}
      </button>

      {/* AI-анализ */}
      {onRunAI && (
        <button
          type="button"
          onClick={onRunAI}
          disabled={aiLoading}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
            hasAIResult
              ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
          } disabled:opacity-50`}
          title={lang === 'ru' ? 'Запустить AI-анализ' : 'Run AI analysis'}
        >
          {aiLoading ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
          {aiLoading ? (lang === 'ru' ? 'Анализ...' : 'Analyzing...') : hasAIResult ? 'AI ✓' : 'AI'}
        </button>
      )}

      {/* Обучение по мини-реперторию */}
      {onStartMiniTour && (
        <button
          type="button"
          onClick={onStartMiniTour}
          className="btn btn-ghost btn-sm hidden sm:inline-flex shrink-0"
          title={lang === 'ru' ? 'Запустить обучение по реперторию' : 'Start repertory tutorial'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
          </svg>
          {lang === 'ru' ? 'Обучение' : 'Tutorial'}
        </button>
      )}

    </div>
  )
}
