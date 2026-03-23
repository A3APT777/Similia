'use client'

import { useState } from 'react'
import type { AIAnalysisLog } from '@/lib/actions/admin'
import Link from 'next/link'

type Props = {
  logs: AIAnalysisLog[]
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  needs_clarification: 'bg-amber-100 text-amber-700',
  insufficient: 'bg-red-100 text-red-700',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Высокая',
  good: 'Хорошая',
  needs_clarification: 'Уточнить',
  insufficient: 'Мало данных',
}

export default function AILogsView({ logs }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'mismatch' | 'no_choice'>('all')

  const filtered = logs.filter(log => {
    if (filter === 'mismatch') {
      // Врач выбрал не top-1
      return log.doctor_choice && log.engine_top3[0] &&
        log.doctor_choice.toLowerCase() !== log.engine_top3[0].remedy.toLowerCase()
    }
    if (filter === 'no_choice') {
      return !log.doctor_choice
    }
    return true
  })

  // Статистика
  const total = logs.length
  const withChoice = logs.filter(l => l.doctor_choice).length
  const mismatches = logs.filter(l =>
    l.doctor_choice && l.engine_top3[0] &&
    l.doctor_choice.toLowerCase() !== l.engine_top3[0].remedy.toLowerCase()
  ).length
  const accuracy = withChoice > 0 ? Math.round((withChoice - mismatches) / withChoice * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">
              ← Админ-панель
            </Link>
            <h1 className="text-xl font-bold text-gray-900">AI Analysis Logs</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Всего анализов" value={total} />
          <StatCard label="С выбором врача" value={withChoice} />
          <StatCard label="Несовпадений" value={mismatches} color={mismatches > 0 ? 'text-amber-600' : undefined} />
          <StatCard label="Точность top-1" value={`${accuracy}%`} color={accuracy >= 70 ? 'text-green-600' : 'text-red-600'} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'mismatch', 'no_choice'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? `Все (${total})` : f === 'mismatch' ? `Несовпадения (${mismatches})` : `Без выбора (${total - withChoice})`}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              {total === 0 ? 'Нет данных. Сделайте анализ через AI-консультацию.' : 'Нет записей по фильтру.'}
            </div>
          )}
          {filtered.map(log => (
            <LogCard
              key={log.id}
              log={log}
              expanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color ?? 'text-gray-900'}`}>{value}</div>
    </div>
  )
}

function LogCard({ log, expanded, onToggle }: { log: AIAnalysisLog; expanded: boolean; onToggle: () => void }) {
  const top1 = log.engine_top3[0]
  const isMismatch = log.doctor_choice && top1 &&
    log.doctor_choice.toLowerCase() !== top1.remedy.toLowerCase()
  const date = new Date(log.created_at)
  const timeStr = date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`bg-white rounded-xl border ${isMismatch ? 'border-amber-200' : 'border-gray-200'} overflow-hidden`}>
      {/* Summary row */}
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
        <span className="text-[11px] text-gray-400 w-24 shrink-0">{timeStr}</span>

        {/* Top-3 */}
        <div className="flex gap-1.5 flex-1">
          {log.engine_top3.map((r, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded ${
              i === 0 ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100 text-gray-500'
            }`}>
              {i + 1}. {r.remedy}
            </span>
          ))}
        </div>

        {/* Doctor choice */}
        {log.doctor_choice ? (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            isMismatch ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            → {log.doctor_choice}
          </span>
        ) : (
          <span className="text-[10px] text-gray-300">—</span>
        )}

        {/* Confidence */}
        {log.confidence_level && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${CONFIDENCE_COLORS[log.confidence_level] ?? 'bg-gray-100 text-gray-500'}`}>
            {CONFIDENCE_LABELS[log.confidence_level] ?? log.confidence_level}
          </span>
        )}

        {/* Conflict */}
        {log.has_conflict && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">!</span>
        )}

        <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
          {/* Confirmed input */}
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Подтверждённые симптомы ({log.symptom_count} сим + {log.modality_count} мод)
            </div>
            <div className="flex flex-wrap gap-1">
              {log.confirmed_input.map((s, i) => (
                <span key={i} className={`text-[11px] px-2 py-0.5 rounded border ${
                  s.priority === 'high' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                  s.priority === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                  'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                  {s.type === 'mental' ? '🧠' : s.type === 'modality' ? '↕' : s.type === 'general' ? '🌡' : '📍'}
                  {' '}{s.rubric}
                  {s.weight >= 3 && ' ★'}
                </span>
              ))}
            </div>
          </div>

          {/* Engine results */}
          <div>
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Engine результат
            </div>
            <div className="flex gap-2">
              {log.engine_top3.map((r, i) => (
                <div key={i} className={`text-xs px-3 py-1.5 rounded-lg border ${
                  i === 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="font-medium">{r.remedy}</span>
                  <span className="text-gray-400 ml-1">({r.score.toFixed(1)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {log.warnings && log.warnings.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Warnings</div>
              {log.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-600">{w.type}: {w.message}</p>
              ))}
            </div>
          )}

          {/* Verdict */}
          {isMismatch && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">
                Engine → <strong>{top1?.remedy}</strong>, врач выбрал → <strong>{log.doctor_choice}</strong>
              </p>
              {log.engine_top3.some(r => r.remedy.toLowerCase() === log.doctor_choice?.toLowerCase()) && (
                <p className="text-[11px] text-amber-500 mt-0.5">
                  Выбор врача был в top-3
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
