'use client'

import { useState } from 'react'
import type { ParsedSuggestion, ParseSuggestionsResult } from '@/lib/mdri/types'

type Props = {
  data: ParseSuggestionsResult
  onConfirm: (confirmed: ParsedSuggestion[], familyHistory: string[]) => void
  onCancel: () => void
  loading?: boolean
}

const PRIORITY_CONFIG = {
  high: { label: 'Ключевые', icon: '🔥', bg: 'bg-indigo-50', border: 'border-indigo-200', check: 'bg-indigo-500' },
  medium: { label: 'Важные', icon: '🟡', bg: 'bg-amber-50', border: 'border-amber-200', check: 'bg-amber-500' },
  low: { label: 'Остальное', icon: '⚪', bg: 'bg-gray-50', border: 'border-gray-200', check: 'bg-gray-400' },
} as const

// Максимум видимых элементов в medium+low (без раскрытия)
const MAX_VISIBLE_SECONDARY = 3

export default function SuggestionReview({ data, onConfirm, onCancel, loading }: Props) {
  const [suggestions, setSuggestions] = useState<ParsedSuggestion[]>(data.suggestions)
  const [showAll, setShowAll] = useState(false)

  function toggle(id: string) {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, confirmed: !s.confirmed } : s))
  }

  const confirmed = suggestions.filter(s => s.confirmed)
  const highItems = suggestions.filter(s => s.priority === 'high')
  const mediumItems = suggestions.filter(s => s.priority === 'medium')
  const lowItems = suggestions.filter(s => s.priority === 'low')

  // High всегда видны. Medium+low: показываем MAX_VISIBLE_SECONDARY, остальные под "ещё"
  const secondary = [...mediumItems, ...lowItems]
  const visibleSecondary = showAll ? secondary : secondary.slice(0, MAX_VISIBLE_SECONDARY)
  const hiddenCount = showAll ? 0 : Math.max(0, secondary.length - MAX_VISIBLE_SECONDARY)

  return (
    <div className="ai-slide-up rounded-xl border border-indigo-100 bg-white overflow-hidden">
      {/* Заголовок */}
      <div className="px-3 py-2.5 border-b border-indigo-100 bg-indigo-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-gray-900">Проверьте симптомы</span>
          </div>
          <span className="text-[10px] text-gray-400">{confirmed.length} из {suggestions.length}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Ключевые включены. Добавьте важные или уберите лишнее.
        </p>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="px-3 py-1.5 border-b border-amber-100 bg-amber-50/50">
          {data.warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-[10px] text-amber-600">{w.message} — <span className="text-amber-500">{w.hint}</span></p>
          ))}
        </div>
      )}

      <div className="p-2 space-y-1.5">
        {/* 🔥 Ключевые (high) — всегда видны, auto-confirmed */}
        {highItems.length > 0 && (
          <PriorityGroup priority="high" items={highItems} onToggle={toggle} />
        )}

        {/* 🟡 Важные + ⚪ Остальное — объединены, ограничены */}
        {visibleSecondary.length > 0 && (
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-1 mb-1 mt-1">
              Добавить к анализу
            </div>
            {visibleSecondary.map(s => (
              <SuggestionItem key={s.id} s={s} onToggle={toggle} />
            ))}
          </div>
        )}

        {/* Свёрнутые */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-[11px] text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            Ещё {hiddenCount} →
          </button>
        )}
      </div>

      {/* Кнопки */}
      <div className="px-3 pb-3 pt-1 flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 text-xs py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={() => onConfirm(confirmed, data.familyHistory)}
          disabled={confirmed.length === 0 || loading}
          className="flex-1 text-xs py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Анализ...' : `Анализировать (${confirmed.length})`}
        </button>
      </div>
    </div>
  )
}

function PriorityGroup({ priority, items, onToggle }: {
  priority: 'high' | 'medium' | 'low'
  items: ParsedSuggestion[]
  onToggle: (id: string) => void
}) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <div>
      <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide px-1 mb-1">
        {config.icon} {config.label}
      </div>
      {items.map(s => (
        <SuggestionItem key={s.id} s={s} onToggle={onToggle} isKey={priority === 'high'} />
      ))}
    </div>
  )
}

function SuggestionItem({ s, onToggle, isKey }: {
  s: ParsedSuggestion
  onToggle: (id: string) => void
  isKey?: boolean
}) {
  const typeIcon = s.type === 'mental' ? '🧠' : s.type === 'modality' ? '↕' : s.type === 'general' ? '🌡' : '📍'
  const config = PRIORITY_CONFIG[s.priority]

  return (
    <button
      onClick={() => onToggle(s.id)}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all text-[12px] mb-0.5 ${
        s.confirmed
          ? `${config.bg} ${config.border}`
          : 'bg-white border-gray-100 opacity-30 line-through'
      }`}
    >
      {/* Checkbox */}
      <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 text-[9px] leading-none ${
        s.confirmed ? `${config.check} text-white` : 'bg-gray-200'
      }`}>
        {s.confirmed ? '✓' : ''}
      </span>

      {/* Type icon */}
      <span className="text-[10px] shrink-0">{typeIcon}</span>

      {/* Label */}
      <span className={`flex-1 ${s.confirmed ? 'text-gray-700' : 'text-gray-400'}`}>
        {s.label}
      </span>

      {/* Source + weight badges */}
      <span className="flex items-center gap-0.5 shrink-0">
        {s.weight >= 3 && s.confirmed && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-red-50 text-red-500 font-medium border border-red-100" title="Характерный симптом — особенно важен для выбора препарата">★</span>
        )}
        {s.confirmed && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-100">
            {s.source === 'keyword' ? 'из текста' : 'AI-разбор'}
          </span>
        )}
      </span>
    </button>
  )
}
