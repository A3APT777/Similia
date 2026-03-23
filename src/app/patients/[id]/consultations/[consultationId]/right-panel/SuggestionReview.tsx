'use client'

import { useState } from 'react'
import type { ParsedSuggestion, ParseSuggestionsResult } from '@/lib/mdri/types'

type Props = {
  data: ParseSuggestionsResult
  onConfirm: (confirmed: ParsedSuggestion[], familyHistory: string[]) => void
  onCancel: () => void
  loading?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  mental: 'Психика',
  general: 'Общее',
  modality: 'Модальность',
  particular: 'Частное',
}

const TYPE_COLORS: Record<string, string> = {
  mental: 'bg-purple-50 border-purple-200',
  general: 'bg-blue-50 border-blue-200',
  modality: 'bg-amber-50 border-amber-200',
  particular: 'bg-gray-50 border-gray-200',
}

export default function SuggestionReview({ data, onConfirm, onCancel, loading }: Props) {
  const [suggestions, setSuggestions] = useState<ParsedSuggestion[]>(data.suggestions)

  function toggle(id: string) {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, confirmed: !s.confirmed } : s))
  }

  const confirmed = suggestions.filter(s => s.confirmed)
  const rejected = suggestions.filter(s => !s.confirmed)

  // Группируем по типу
  const groups = ['mental', 'general', 'modality', 'particular'] as const
  const grouped = groups.map(type => ({
    type,
    label: TYPE_LABELS[type],
    items: suggestions.filter(s => s.type === type),
  })).filter(g => g.items.length > 0)

  return (
    <div className="ai-slide-up rounded-xl border border-indigo-100 bg-white overflow-hidden">
      {/* Заголовок */}
      <div className="px-3 py-2.5 border-b border-indigo-100 bg-indigo-50/50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-gray-900">Проверьте распознанные симптомы</span>
          <span className="text-[10px] text-gray-400 ml-auto">{confirmed.length}/{suggestions.length}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">Уберите лишнее, оставьте верное</p>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="px-3 py-1.5 space-y-1">
          {data.warnings.map((w, i) => (
            <div key={i} className="text-[11px] text-amber-600 flex items-start gap-1">
              <span className="shrink-0">⚠</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Симптомы по группам */}
      <div className="p-2 space-y-2">
        {grouped.map(group => (
          <div key={group.type}>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-1 mb-1">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all text-[12px] ${
                    s.confirmed
                      ? TYPE_COLORS[s.type]
                      : 'bg-white border-gray-100 opacity-40 line-through'
                  }`}
                >
                  {/* Checkbox */}
                  <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] ${
                    s.confirmed ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-300'
                  }`}>
                    {s.confirmed ? '✓' : ''}
                  </span>

                  {/* Label */}
                  <span className="flex-1 text-gray-700">{s.label}</span>

                  {/* Weight badge */}
                  {s.weight === 3 && s.confirmed && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-medium shrink-0">
                      ключевой
                    </span>
                  )}

                  {/* Source badge */}
                  {s.source === 'keyword' && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400 shrink-0">
                      из текста
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Кнопки */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
        <button
          onClick={() => onConfirm(suggestions.filter(s => s.confirmed), data.familyHistory)}
          disabled={confirmed.length === 0 || loading}
          className="flex-1 text-xs py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Анализ...' : `Анализировать (${confirmed.length})`}
        </button>
      </div>
    </div>
  )
}
