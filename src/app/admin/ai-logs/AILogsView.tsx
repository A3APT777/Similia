'use client'

import { useState } from 'react'
import type { AIAnalysisLog } from '@/lib/actions/admin'

type Props = {
  logs: AIAnalysisLog[]
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Высокая',
  good: 'Хорошая',
  needs_clarification: 'Уточнить',
  insufficient: 'Мало данных',
}

const CONFIDENCE_COLORS: Record<string, { bg: string; color: string }> = {
  high: { bg: 'var(--sim-green-light)', color: 'var(--sim-green)' },
  good: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  needs_clarification: { bg: '#fef3c7', color: '#92400e' },
  insufficient: { bg: '#fee2e2', color: '#dc2626' },
}

export default function AILogsView({ logs }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'mismatch' | 'no_choice' | 'conflict'>('all')

  // Статистика
  const total = logs.length
  const withChoice = logs.filter(l => l.doctor_choice).length
  const top1Match = logs.filter(l => l.correct_position === 1).length
  const top3Match = logs.filter(l => l.correct_position && l.correct_position <= 3).length
  const mismatches = logs.filter(l => l.doctor_choice && l.correct_position === null).length
  const accuracy = withChoice > 0 ? Math.round(top1Match / withChoice * 100) : 0
  const top3Accuracy = withChoice > 0 ? Math.round(top3Match / withChoice * 100) : 0

  const filtered = logs.filter(log => {
    if (filter === 'mismatch') return log.doctor_choice && log.correct_position !== 1
    if (filter === 'no_choice') return !log.doctor_choice
    if (filter === 'conflict') return log.has_conflict
    return true
  })

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/admin" className="text-sm transition-colors" style={{ color: 'var(--sim-text-muted)' }}>
              ← Админ-панель
            </a>
            <h1 className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-text)' }}>
              AI Analysis Logs
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sim-text-muted)' }}>
              Аналитика качества MDRI v5
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Анализов', value: total, icon: '🔬' },
            { label: 'С выбором', value: withChoice, icon: '✅' },
            { label: 'Top-1', value: `${accuracy}%`, icon: '🎯', color: accuracy >= 70 ? 'var(--sim-green)' : '#dc2626' },
            { label: 'Top-3', value: `${top3Accuracy}%`, icon: '📊', color: top3Accuracy >= 85 ? 'var(--sim-green)' : '#f59e0b' },
            { label: 'Промахи', value: mismatches, icon: '⚠️', color: mismatches > 0 ? '#dc2626' : 'var(--sim-green)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-3xl font-bold" style={{ color: s.color ?? 'var(--sim-green)' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--sim-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
          {([
            { id: 'all' as const, label: `Все (${total})` },
            { id: 'mismatch' as const, label: `Не top-1 (${logs.filter(l => l.doctor_choice && l.correct_position !== 1).length})` },
            { id: 'no_choice' as const, label: `Без выбора (${total - withChoice})` },
            { id: 'conflict' as const, label: `Конфликты (${logs.filter(l => l.has_conflict).length})` },
          ]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor: filter === f.id ? 'var(--sim-bg-card)' : 'transparent',
                color: filter === f.id ? 'var(--sim-green)' : 'var(--sim-text-muted)',
                boxShadow: filter === f.id ? 'var(--sim-shadow-xs)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: 'var(--sim-text-hint)' }}>
              {total === 0 ? 'Нет данных. Сделайте AI-анализ через консультацию.' : 'Нет записей по фильтру.'}
            </div>
          )}
          {filtered.map((log, i) => (
            <LogCard
              key={log.id}
              log={log}
              expanded={expandedId === log.id}
              onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              isLast={i === filtered.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function LogCard({ log, expanded, onToggle, isLast }: {
  log: AIAnalysisLog
  expanded: boolean
  onToggle: () => void
  isLast: boolean
}) {
  const top1 = log.engine_top3[0]
  const isMismatch = log.doctor_choice && log.correct_position !== 1
  const date = new Date(log.created_at)
  const timeStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) +
    ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--sim-border)' }}>
      {/* Summary */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors"
        style={{ backgroundColor: expanded ? 'var(--sim-bg-muted)' : 'transparent' }}
      >
        {/* Date */}
        <span className="text-xs w-28 shrink-0" style={{ color: 'var(--sim-text-hint)' }}>{timeStr}</span>

        {/* Top-3 */}
        <div className="flex gap-1.5 flex-1 items-center">
          {log.engine_top3.map((r, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                backgroundColor: i === 0 ? 'rgba(99,102,241,0.1)' : 'var(--sim-bg-muted)',
                color: i === 0 ? '#6366f1' : 'var(--sim-text-muted)',
              }}
            >
              {i + 1}. {r.remedy}
            </span>
          ))}
        </div>

        {/* Doctor choice + position */}
        {log.doctor_choice ? (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              backgroundColor: log.correct_position === 1 ? 'var(--sim-green-light)' : log.correct_position ? '#fef3c7' : '#fee2e2',
              color: log.correct_position === 1 ? 'var(--sim-green)' : log.correct_position ? '#92400e' : '#dc2626',
            }}
          >
            → {log.doctor_choice}
            {log.correct_position && ` (#${log.correct_position})`}
            {!log.correct_position && ' (miss)'}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>—</span>
        )}

        {/* Confidence */}
        {log.confidence_level && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={CONFIDENCE_COLORS[log.confidence_level] ?? { bg: 'var(--sim-bg-muted)', color: 'var(--sim-text-muted)' }}
          >
            {CONFIDENCE_LABELS[log.confidence_level] ?? log.confidence_level}
          </span>
        )}

        {/* Priority breakdown */}
        <div className="flex gap-0.5 shrink-0">
          {log.high_count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>H{log.high_count}</span>}
          {log.medium_count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>M{log.medium_count}</span>}
          {log.low_count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--sim-bg-muted)', color: 'var(--sim-text-hint)' }}>L{log.low_count}</span>}
        </div>

        {log.has_conflict && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>!</span>}

        <span style={{ color: 'var(--sim-text-hint)', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 space-y-4" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
          {/* Input */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--sim-text-muted)' }}>
              Вход ({log.symptom_count} сим + {log.modality_count} мод, {log.mental_count} mental)
            </div>
            <div className="flex flex-wrap gap-1">
              {log.confirmed_input.map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: s.priority === 'high' ? 'rgba(99,102,241,0.1)' : s.priority === 'medium' ? '#fef3c7' : 'var(--sim-bg-card)',
                    color: s.priority === 'high' ? '#6366f1' : s.priority === 'medium' ? '#92400e' : 'var(--sim-text-muted)',
                    border: `1px solid ${s.priority === 'high' ? 'rgba(99,102,241,0.2)' : s.priority === 'medium' ? '#fde68a' : 'var(--sim-border)'}`,
                  }}
                >
                  {s.type === 'mental' ? '🧠' : s.type === 'modality' ? '↕' : s.type === 'general' ? '🌡' : '📍'}
                  {' '}{s.rubric}
                  {s.weight >= 3 && ' ★'}
                </span>
              ))}
            </div>
          </div>

          {/* Engine */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--sim-text-muted)' }}>
              Engine Top-3
            </div>
            <div className="flex gap-2">
              {log.engine_top3.map((r, i) => (
                <div
                  key={i}
                  className="text-sm px-4 py-2 rounded-xl"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(99,102,241,0.1)' : 'var(--sim-bg-card)',
                    border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.2)' : 'var(--sim-border)'}`,
                    color: i === 0 ? '#6366f1' : 'var(--sim-text)',
                  }}
                >
                  <span className="font-medium">{r.remedy}</span>
                  <span className="ml-1.5" style={{ color: 'var(--sim-text-hint)' }}>({r.score.toFixed(1)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {log.warnings && log.warnings.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--sim-text-muted)' }}>
                Warnings
              </div>
              {log.warnings.map((w, i) => (
                <p key={i} className="text-xs" style={{ color: '#f59e0b' }}>{w.type}: {w.message}</p>
              ))}
            </div>
          )}

          {/* Verdict */}
          {isMismatch && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
              <p className="text-sm" style={{ color: '#92400e' }}>
                Engine → <strong>{top1?.remedy}</strong>, врач → <strong>{log.doctor_choice}</strong>
                {log.correct_position && <span> (был #{log.correct_position})</span>}
                {!log.correct_position && <span> (не в top-3)</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
