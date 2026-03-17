'use client'

import { useConsultation } from '../context/ConsultationContext'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const TYPE_STYLE = {
  chronic: {
    badgeStyle: { backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--color-primary)', borderColor: 'rgba(45,106,79,0.2)' },
  },
  acute: {
    badgeStyle: { backgroundColor: 'rgba(200,160,53,0.08)', color: 'var(--color-amber)', borderColor: 'rgba(200,160,53,0.3)' },
  },
}

type Props = {
  onOpenRepertory: () => void
}

export default function EditorToolbar({ onOpenRepertory }: Props) {
  const { state, toggleType } = useConsultation()
  const { lang } = useLanguage()

  const { type, complaints, observations, notes, recommendations } = state
  const badgeStyle = TYPE_STYLE[type].badgeStyle
  const typeLabel = type === 'chronic' ? t(lang).consultation.chronicShort : t(lang).consultation.acuteShort

  const allText = [complaints, observations, notes, recommendations].filter(Boolean).join(' ')
  const wordCount = allText.trim() ? allText.trim().split(/\s+/).length : 0

  return (
    <div className="px-5 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-card)' }}>
      {/* Тип */}
      <button
        type="button"
        onClick={toggleType}
        title={t(lang).consultation.changeTypeHint}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
        style={badgeStyle}
      >
        {type === 'acute' ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        )}
        {typeLabel}
      </button>

      {/* Реперторий */}
      <button
        type="button"
        onClick={onOpenRepertory}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 bg-[#ede7dd] text-gray-400 hover:text-emerald-700 hover:border-emerald-200 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
        {t(lang).consultation.repertory}
      </button>

      {/* Счётчик слов */}
      <span className="text-[10px] text-gray-300 ml-auto tabular-nums">
        {wordCount > 0 && t(lang).consultation.words(wordCount)}
      </span>
    </div>
  )
}
