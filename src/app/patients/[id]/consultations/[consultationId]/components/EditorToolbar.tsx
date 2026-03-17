'use client'

import Link from 'next/link'
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
}

export default function EditorToolbar({ onOpenRepertory }: Props) {
  const { state, toggleType, dispatch } = useConsultation()
  const { lang } = useLanguage()

  const { type } = state
  const badgeStyle = TYPE_STYLE[type].badgeStyle
  const typeLabel = type === 'chronic' ? t(lang).consultation.chronicShort : t(lang).consultation.acuteShort

  return (
    <div className="px-4 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-card)' }}>
      {/* Тип */}
      <button
        type="button"
        onClick={toggleType}
        title={t(lang).consultation.changeTypeHint}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0"
        style={badgeStyle}
      >
        {type === 'acute' ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        )}
        {typeLabel}
      </button>

      {/* Quick / Deep */}
      <div className="inline-flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--sim-border)', backgroundColor: 'var(--sim-bg-muted)' }}>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_FIELD', field: 'mode', value: 'quick' })}
          className="text-[11px] font-semibold px-2.5 py-1.5 transition-all"
          style={{
            backgroundColor: state.mode === 'quick' ? 'var(--sim-green)' : 'transparent',
            color: state.mode === 'quick' ? '#fff' : 'var(--sim-text-hint)',
          }}
        >
          Быстрый {state.mode === 'quick' && '●'}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_FIELD', field: 'mode', value: 'deep' })}
          className="text-[11px] font-semibold px-2.5 py-1.5 transition-all"
          style={{
            backgroundColor: state.mode === 'deep' ? 'var(--sim-green)' : 'transparent',
            color: state.mode === 'deep' ? '#fff' : 'var(--sim-text-hint)',
          }}
        >
          Глубокий {state.mode === 'deep' && '●'}
        </button>
      </div>

      {/* Мини-реперторий (в правой панели) */}
      <button
        data-tour="open-repertory"
        type="button"
        onClick={onOpenRepertory}
        className="btn btn-secondary btn-sm shrink-0"
        title={lang === 'ru' ? 'Открыть мини-реперторий' : 'Open mini-repertory'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
        {t(lang).consultation.repertory}
      </button>

      {/* Полный реперторий — внешняя ссылка (скрыт на мобильном, чтобы тулбар не переполнялся) */}
      <Link
        href="/repertory"
        target="_blank"
        rel="noopener"
        className="btn btn-ghost btn-sm hidden sm:inline-flex shrink-0"
        title={lang === 'ru' ? 'Открыть полный реперторий в новой вкладке' : 'Open full repertory in new tab'}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
        {lang === 'ru' ? 'Полный' : 'Full'}
      </Link>

    </div>
  )
}
