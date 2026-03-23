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

// Двойные названия линз (понятно врачу + оригинал)
const LENS_LABELS: Record<string, { ru: string; en: string; tooltip: string }> = {
  'Kent': { ru: 'Классический реперторий', en: 'Classical Repertory', tooltip: 'совпадений в реперторных рубриках' },
  'Polarity': { ru: 'Полярности', en: 'Polarity', tooltip: 'баланс подтверждающих и исключающих рубрик' },
  'Hierarchy': { ru: 'Иерархия симптомов', en: 'Symptom Hierarchy', tooltip: 'вес по типу: психика > общее > частное' },
  'Constellation': { ru: 'Характерные паттерны', en: 'Characteristic Patterns', tooltip: 'совпадение ключевых комбинаций' },
  'Negative': { ru: 'Исключающие признаки', en: 'Negative Markers', tooltip: 'симптомы, нетипичные для препарата' },
  'Miasm': { ru: 'Миазм', en: 'Miasm', tooltip: 'миазматическое соответствие' },
}

// Перевод технических hints на язык врача
const HINT_TRANSLATIONS: Record<string, string> = {
  'heat_cold': 'чувствительность к теплу/холоду',
  'motion_rest': 'хуже от движения / лучше в покое',
  'open_air': 'на свежем воздухе',
  'consolation': 'реакция на утешение',
  'thirst': 'жажда',
  'appetite': 'аппетит',
  'sleep': 'сон',
  'perspiration': 'потоотделение',
}

function translateHint(hint: string): string {
  let result = hint
  for (const [key, val] of Object.entries(HINT_TRANSLATIONS)) {
    result = result.replace(new RegExp(key, 'gi'), val)
  }
  return result
}

// Цвет полоски по score
function getBarColor(score: number): string {
  if (score >= 70) return 'bg-indigo-500'
  if (score >= 50) return 'bg-indigo-400'
  if (score >= 30) return 'bg-indigo-300'
  return 'bg-gray-300'
}

// Бейдж confidence (единый)
function ConfidenceBadge({ confidence, productConfidence }: {
  confidence?: string
  productConfidence?: ConsensusResult['productConfidence']
}) {
  if (productConfidence) {
    const colors: Record<string, string> = {
      'green': 'bg-emerald-100 text-emerald-700',
      'blue': 'bg-blue-100 text-blue-700',
      'yellow': 'bg-amber-100 text-amber-700',
      'gray': 'bg-gray-100 text-gray-500',
    }
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[productConfidence.color] ?? colors['blue']}`}>
        {productConfidence.label}
      </span>
    )
  }
  if (!confidence) return null
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

// Блок "Как AI понял случай"
function InferredProfileBlock({ profile }: { profile: NonNullable<ConsensusResult['inferredProfile']> }) {
  const LABELS: Record<string, string> = {
    'acute': 'Острый', 'chronic': 'Хронический',
    'high': 'Высокая', 'medium': 'Средняя', 'low': 'Низкая',
    'child': 'Ребёнок', 'adult': 'Взрослый', 'elderly': 'Пожилой',
  }
  const confLabel = (c: number) => c >= 0.7 ? 'высокая' : c >= 0.4 ? 'средняя' : 'низкая'
  const confColor = (c: number) => c >= 0.7 ? 'text-emerald-600' : c >= 0.4 ? 'text-blue-500' : 'text-amber-500'

  const items = [
    { label: 'Тип случая', value: LABELS[profile.caseType.value] ?? profile.caseType.value, conf: profile.caseType.confidence },
    { label: 'Витальность', value: LABELS[profile.vitality.value] ?? profile.vitality.value, conf: profile.vitality.confidence },
    { label: 'Чувствительность', value: LABELS[profile.sensitivity.value] ?? profile.sensitivity.value, conf: profile.sensitivity.confidence },
    { label: 'Возраст', value: LABELS[profile.age.value] ?? profile.age.value, conf: profile.age.confidence },
  ]

  return (
    <div className="mx-3 mt-2 mb-1 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        Как AI понял случай
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {items.map(item => (
          <div key={item.label} className="flex items-baseline gap-1 text-[11px]">
            <span className="text-gray-400">{item.label}:</span>
            <span className="font-medium text-gray-700">{item.value}</span>
            {item.conf < 0.5 && (
              <span className={`text-[9px] ${confColor(item.conf)}`}>
                ({confLabel(item.conf)})
              </span>
            )}
          </div>
        ))}
      </div>
      {items.some(i => i.conf < 0.4) && (
        <p className="text-[10px] text-amber-500 mt-1.5">
          Некоторые параметры определены с низкой уверенностью. Уточните описание случая.
        </p>
      )}
    </div>
  )
}

// Блок "Почему выбран препарат" — на основе реальных линз
function WhyChosenBlock({ result }: { result: MDRIResult }) {
  const reasons: string[] = []

  for (const lens of result.lenses) {
    if (lens.name === 'Kent' && lens.score >= 50) {
      const match = lens.details.match(/(\d+)\/(\d+)/)
      if (match) reasons.push(`${match[1]} из ${match[2]} рубрик совпали`)
    }
    if (lens.name === 'Constellation' && lens.score >= 40) {
      reasons.push('характерный паттерн совпал')
    }
    if (lens.name === 'Hierarchy' && lens.score >= 60) {
      reasons.push('совпадение по ключевым уровням (психика, общее)')
    }
    if (lens.name === 'Polarity' && lens.score >= 50) {
      reasons.push('подтверждено полярностным анализом')
    }
  }
  if (result.miasm) {
    reasons.push(`миазм: ${result.miasm}`)
  }

  if (reasons.length === 0) return null

  return (
    <div className="text-[11px] bg-indigo-50/50 rounded-lg px-2.5 py-1.5 border border-indigo-100">
      <span className="text-indigo-500 font-medium">Почему выбран: </span>
      <span className="text-gray-600">{reasons.join(' · ')}</span>
    </div>
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
          {/* Почему выбран */}
          {rank === 0 && <WhyChosenBlock result={result} />}

          {/* Линзы — двойные названия */}
          <div className="space-y-1">
            {result.lenses.map(lens => {
              const lensInfo = LENS_LABELS[lens.name]
              const detailsMatch = lens.details.match(/(\d+)\/(\d+)/)
              const detailsText = detailsMatch ? `${detailsMatch[1]} из ${detailsMatch[2]}` : lens.details
              return (
                <div key={lens.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-[110px] shrink-0 truncate" title={lensInfo?.tooltip}>
                    {lensInfo?.ru ?? lens.name}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`ai-lens-bar h-full rounded-full ${getBarColor(lens.score)}`} style={{ width: `${lens.score}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 w-12 text-right">{detailsText}</span>
                </div>
              )
            })}
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
      {/* Заголовок — без стоимости, без method badge */}
      <div className="px-3 py-2.5 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="text-xs font-semibold text-gray-900">
              {lang === 'ru' ? 'AI-анализ' : 'AI Analysis'}
            </span>
            <ConfidenceBadge productConfidence={aiResult.productConfidence} />
          </div>
        </div>

        {/* Warnings — hints переведены */}
        {aiResult.warnings && aiResult.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {aiResult.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <div>
                  <span className="font-medium">{w.message}</span>
                  <span className="text-amber-500"> — {translateHint(w.hint)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Блок "Как AI понял случай" */}
      {aiResult.inferredProfile && (
        <InferredProfileBlock profile={aiResult.inferredProfile} />
      )}

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

      {/* Блок уточнений */}
      {onClarify && (() => {
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
