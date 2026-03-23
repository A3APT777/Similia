'use client'

import { useState } from 'react'
import type { ConsensusResult, MDRIResult } from '@/lib/mdri/types'
import type { AIQuestion } from '@/lib/actions/ai-consultation'

type Props = {
  aiResult: ConsensusResult
  lang: 'ru' | 'en'
  onAssignRemedy?: (abbrev: string, potency: string) => void
  onClarify?: (questions: AIQuestion[]) => void
  clarifyingQuestions?: AIQuestion[]
}

// Названия линз
const LENS_LABELS: Record<string, { ru: string; en: string }> = {
  'Kent': { ru: 'Кент', en: 'Kent' },
  'Polarity': { ru: 'Полярность', en: 'Polarity' },
  'Hierarchy': { ru: 'Иерархия', en: 'Hierarchy' },
  'Constellation': { ru: 'Созвездие', en: 'Constellation' },
  'Negative': { ru: 'Негативный', en: 'Negative' },
  'Miasm': { ru: 'Миазм', en: 'Miasm' },
}

// Цвет полоски по score
function getBarColor(score: number): string {
  if (score >= 70) return 'bg-indigo-500'
  if (score >= 50) return 'bg-indigo-400'
  if (score >= 30) return 'bg-indigo-300'
  return 'bg-gray-300'
}

// Бейдж метода
function MethodBadge({ method, lang }: { method: ConsensusResult['method']; lang: 'ru' | 'en' }) {
  const labels: Record<string, { ru: string; en: string; color: string }> = {
    'consensus': { ru: 'Консенсус', en: 'Consensus', color: 'bg-emerald-100 text-emerald-700' },
    'sonnet_priority': { ru: 'AI приоритет', en: 'AI Priority', color: 'bg-blue-100 text-blue-700' },
    'opus_arbiter': { ru: 'Арбитраж', en: 'Arbitration', color: 'bg-amber-100 text-amber-700' },
  }
  const l = labels[method] ?? labels['consensus']
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${l.color}`}>
      {lang === 'ru' ? l.ru : l.en}
    </span>
  )
}

// Бейдж product confidence (v5)
function ProductConfidenceBadge({ confidence }: { confidence: ConsensusResult['productConfidence'] }) {
  if (!confidence) return null
  const colors: Record<string, string> = {
    'green': 'bg-emerald-100 text-emerald-700',
    'blue': 'bg-blue-100 text-blue-700',
    'yellow': 'bg-amber-100 text-amber-700',
    'gray': 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[confidence.color] ?? colors['blue']}`}>
      {confidence.label}
    </span>
  )
}

// Fallback бейдж (для старых результатов без productConfidence)
function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    'high': 'bg-emerald-100 text-emerald-700',
    'medium': 'bg-blue-100 text-blue-700',
    'low': 'bg-amber-100 text-amber-700',
    'insufficient': 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    'high': 'Высокая', 'medium': 'Средняя', 'low': 'Низкая', 'insufficient': 'Недостаточно',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[confidence] ?? colors['low']}`}>
      {labels[confidence] ?? confidence}
    </span>
  )
}

// Карточка препарата
function RemedyCard({ result, rank, expanded, onToggle, onAssign, idx }: {
  result: MDRIResult
  rank: number
  expanded: boolean
  onToggle: () => void
  onAssign?: () => void
  idx: number
}) {
  return (
    <div
      className={`ai-fade-in rounded-2xl border transition-all ${rank === 0 ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-white'}`}
      style={{ animationDelay: `${idx * 0.1}s` }}
    >
      {/* Заголовок */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          rank === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900 uppercase">{result.remedy}</span>
            <span className="text-[11px] text-gray-400 truncate">{result.remedyName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`ai-counter text-sm font-bold ${rank === 0 ? 'text-indigo-600' : 'text-gray-600'}`}>
            {result.totalScore}%
          </span>
          <ConfidenceBadge confidence={result.confidence} />
          <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Детали */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Линзы */}
          <div className="space-y-1">
            {result.lenses.map(lens => (
              <div key={lens.name} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-16 shrink-0 truncate">
                  {LENS_LABELS[lens.name]?.ru ?? lens.name}
                </span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`ai-lens-bar h-full rounded-full ${getBarColor(lens.score)}`} style={{ width: `${lens.score}%` }} />
                </div>
                <span className="text-[10px] text-gray-400 w-7 text-right">{lens.details}</span>
              </div>
            ))}
          </div>

          {/* Потенция */}
          {result.potency && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-gray-400">Потенция:</span>
              <span className="font-medium text-gray-700">{result.potency.potency}</span>
              <span className="text-gray-400">—</span>
              <span className="text-gray-500">{result.potency.reasoning}</span>
            </div>
          )}

          {/* Миазм */}
          {result.miasm && (
            <div className="text-[11px]">
              <span className="text-gray-400">Миазм: </span>
              <span className="font-medium text-gray-700">{result.miasm}</span>
            </div>
          )}

          {/* Differential */}
          {result.differential && (
            <div className="text-[11px] bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
              <span className="text-amber-600 font-medium">Уточнить: </span>
              <span className="text-amber-700">{result.differential.differentiatingQuestion}</span>
            </div>
          )}

          {/* Кнопка назначить */}
          {onAssign && (
            <button
              onClick={onAssign}
              className="w-full text-xs font-medium py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Назначить {result.remedy.toUpperCase()} {result.potency?.potency ?? '30C'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function AIResultPanel({ aiResult, lang, onAssignRemedy, onClarify, clarifyingQuestions }: Props) {
  const [expandedIdx, setExpandedIdx] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const results = aiResult.mdriResults
  const visible = showAll ? results : results.slice(0, 3)

  return (
    <div className="ai-glass ai-slide-up rounded-2xl overflow-hidden">
      {/* Заголовок */}
      <div className="px-3 py-2.5 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="text-xs font-semibold text-gray-900">
              {lang === 'ru' ? 'AI-анализ' : 'AI Analysis'}
            </span>
            {aiResult.productConfidence
              ? <ProductConfidenceBadge confidence={aiResult.productConfidence} />
              : <MethodBadge method={aiResult.method} lang={lang} />
            }
          </div>
          <span className="text-[10px] text-gray-400">${aiResult.cost.toFixed(2)}</span>
        </div>

        {/* Warnings из product layer */}
        {aiResult.warnings && aiResult.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {aiResult.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <div>
                  <span className="font-medium">{w.message}</span>
                  <span className="text-amber-500"> — {w.hint}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sonnet мнение если отличается (legacy) */}
        {aiResult.aiResult && aiResult.sonnetRemedy !== aiResult.mdriRemedy && (
          <div className="mt-1.5 text-[11px] text-gray-500">
            <span className="text-gray-400">AI-гомеопат: </span>
            <span className="font-medium">{aiResult.sonnetRemedy.toUpperCase()}</span>
            <span className="text-gray-300"> · </span>
            <span className="text-gray-400">MDRI: </span>
            <span className="font-medium">{aiResult.mdriRemedy.toUpperCase()}</span>
            <span className="text-gray-300"> → </span>
            <span className="font-medium text-indigo-600">{aiResult.finalRemedy.toUpperCase()}</span>
          </div>
        )}

        {/* Reasoning от Sonnet (legacy) */}
        {aiResult.aiResult?.reasoning && (
          <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed line-clamp-3">
            {aiResult.aiResult.reasoning}
          </p>
        )}
      </div>

      {/* Список препаратов */}
      <div className="p-2 space-y-1.5">
        {visible.map((result, idx) => (
          <RemedyCard
            key={result.remedy}
            result={result}
            rank={idx}
            idx={idx}
            expanded={expandedIdx === idx}
            onToggle={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
            onAssign={onAssignRemedy ? () => onAssignRemedy(result.remedy, result.potency?.potency ?? '30C') : undefined}
          />
        ))}

        {results.length > 3 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-[11px] text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            Показать ещё {results.length - 3} →
          </button>
        )}
      </div>

      {/* Блок уточнений — по productConfidence или legacy */}
      {onClarify && (() => {
        // v5: используем productConfidence если есть
        const pc = aiResult.productConfidence
        const needsClarify = pc
          ? (pc.level === 'clarify' || pc.level === 'insufficient')
          : (() => {
            const top = results[0]
            const second = results[1]
            return top && (top.confidence === 'low' || top.confidence === 'insufficient' || (second && top.totalScore - second.totalScore < 5))
          })()

        if (!needsClarify) return null
        return (
          <div className="mx-2 mb-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-xs font-semibold text-amber-700">
                {pc?.label ?? (lang === 'ru' ? 'Рекомендуется уточнить' : 'Clarification recommended')}
              </span>
            </div>
            <p className="text-[11px] text-amber-600">
              {lang === 'ru'
                ? 'Добавьте информацию о модальностях, психике или общих симптомах для повышения точности.'
                : 'Add modalities, mental or general symptoms to improve accuracy.'}
            </p>
            <button
              onClick={() => onClarify(clarifyingQuestions ?? [])}
              className="w-full text-xs font-medium py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-200"
            >
              {lang === 'ru' ? 'Уточнить' : 'Clarify'}
            </button>
          </div>
        )
      })()}
    </div>
  )
}
