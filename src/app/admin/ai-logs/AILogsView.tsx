'use client'

import { useState } from 'react'
import type { AIAnalysisLog } from '@/lib/actions/admin'

type DisagreementPattern = {
  engineRemedy: string
  chosenRemedy: string
  count: number
  uniqueDoctors: number
  reasons: string[]
  lastDate: Date
  alert: boolean
}

type Props = {
  logs: AIAnalysisLog[]
  disagreementPatterns: DisagreementPattern[]
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

export default function AILogsView({ logs, disagreementPatterns }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'mismatch' | 'no_choice' | 'conflict'>('all')

  // Статистика
  const total = logs.length
  const withChoice = logs.filter(l => l.doctorChoice).length
  const top1Match = logs.filter(l => l.correctPosition === 1).length
  const top3Match = logs.filter(l => l.correctPosition && l.correctPosition <= 3).length
  const mismatches = logs.filter(l => l.doctorChoice && l.correctPosition === null).length
  const accuracy = withChoice > 0 ? Math.round(top1Match / withChoice * 100) : 0
  const top3Accuracy = withChoice > 0 ? Math.round(top3Match / withChoice * 100) : 0

  const filtered = logs.filter(log => {
    if (filter === 'mismatch') return log.doctorChoice && log.correctPosition !== 1
    if (filter === 'no_choice') return !log.doctorChoice
    if (filter === 'conflict') return log.hasConflict
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

        {/* Оповещения: 7+ врачей выбрали другое средство */}
        {disagreementPatterns.filter(p => p.alert).length > 0 && (
          <div className="mb-6 space-y-3">
            {disagreementPatterns.filter(p => p.alert).map((p, i) => (
              <div key={i} className="rounded-xl px-5 py-4 border-2 border-[#dc2626]/30" style={{ backgroundColor: '#fef2f2' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[16px]">🚨</span>
                  <span className="text-[14px] font-bold" style={{ color: '#dc2626' }}>Требует внимания</span>
                </div>
                <p className="text-[13px]" style={{ color: '#1a1a1a' }}>
                  <strong>{p.uniqueDoctors} врачей</strong> выбрали <strong>{p.chosenRemedy}</strong> вместо <strong>{p.engineRemedy}</strong> ({p.count} раз)
                </p>
                {p.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...new Set(p.reasons)].map((r, j) => (
                      <span key={j} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fde8e8', color: '#dc2626' }}>
                        {r === 'thermal' ? 'Термика' : r === 'symptom' ? 'Ключевой симптом' : r === 'etiology' ? 'Этиология' : r === 'experience' ? 'Клин. опыт' : r === 'miasm' ? 'Миазм' : r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Расхождения (все, не только оповещения) */}
        {disagreementPatterns.length > 0 && (
          <div className="mb-6 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--sim-border)' }}>
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--sim-text)' }}>
                Расхождения с врачами ({disagreementPatterns.length})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--sim-border)' }}>
              {disagreementPatterns.map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-[13px]" style={{ color: 'var(--sim-text)' }}>
                      {p.engineRemedy} → <strong>{p.chosenRemedy}</strong>
                    </span>
                  </div>
                  <span className="text-[12px] px-2.5 py-1 rounded-full font-medium" style={{
                    backgroundColor: p.alert ? '#fef2f2' : 'var(--sim-bg-muted)',
                    color: p.alert ? '#dc2626' : 'var(--sim-text-muted)',
                  }}>
                    {p.uniqueDoctors} {p.uniqueDoctors === 1 ? 'врач' : p.uniqueDoctors < 5 ? 'врача' : 'врачей'}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--sim-text-hint)' }}>
                    {p.count}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
            { id: 'mismatch' as const, label: `Не top-1 (${logs.filter(l => l.doctorChoice && l.correctPosition !== 1).length})` },
            { id: 'no_choice' as const, label: `Без выбора (${total - withChoice})` },
            { id: 'conflict' as const, label: `Конфликты (${logs.filter(l => l.hasConflict).length})` },
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
  const top3 = log.engineTop3 ?? []
  const top1 = top3[0]
  const isMismatch = log.doctorChoice && log.correctPosition !== 1
  const date = new Date(log.createdAt)
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
        {/* Date + Doctor */}
        <div className="w-36 shrink-0">
          <span className="text-xs block" style={{ color: 'var(--sim-text-hint)' }}>{timeStr}</span>
          {log.doctorEmail && (
            <span className="text-[10px] block truncate" style={{ color: 'var(--sim-text-muted)' }}>{log.doctorName || log.doctorEmail.split('@')[0]}</span>
          )}
        </div>

        {/* Top-3 */}
        <div className="flex gap-1.5 flex-1 items-center">
          {top3.map((r, i) => (
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
        {log.doctorChoice ? (
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              backgroundColor: log.correctPosition === 1 ? 'var(--sim-green-light)' : log.correctPosition ? '#fef3c7' : '#fee2e2',
              color: log.correctPosition === 1 ? 'var(--sim-green)' : log.correctPosition ? '#92400e' : '#dc2626',
            }}
          >
            → {log.doctorChoice}
            {log.correctPosition && ` (#${log.correctPosition})`}
            {!log.correctPosition && ' (miss)'}
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>—</span>
        )}

        {/* Confidence */}
        {log.confidenceLevel && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={CONFIDENCE_COLORS[log.confidenceLevel] ?? { bg: 'var(--sim-bg-muted)', color: 'var(--sim-text-muted)' }}
          >
            {CONFIDENCE_LABELS[log.confidenceLevel] ?? log.confidenceLevel}
          </span>
        )}

        {/* Priority breakdown */}
        <div className="flex gap-0.5 shrink-0">
          {log.highCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>H{log.highCount}</span>}
          {log.mediumCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>M{log.mediumCount}</span>}
          {log.lowCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--sim-bg-muted)', color: 'var(--sim-text-hint)' }}>L{log.lowCount}</span>}
        </div>

        {log.hasConflict && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>!</span>}

        <span style={{ color: 'var(--sim-text-hint)', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-5 pb-5 pt-2 space-y-4" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
          {/* Текст врача */}
          {log.inputText && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--sim-text-muted)' }}>
                Текст врача {log.doctorEmail && <span className="normal-case font-normal">({log.doctorEmail})</span>}
              </div>
              <p className="text-[12px] leading-relaxed rounded-lg p-3" style={{ backgroundColor: 'var(--sim-bg-card)', color: 'var(--sim-text)', border: '1px solid var(--sim-border)' }}>
                {log.inputText.length > 300 ? log.inputText.slice(0, 300) + '...' : log.inputText}
              </p>
            </div>
          )}

          {/* Disagreement */}
          {log.disagreement && (
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
              <p className="text-[12px]" style={{ color: '#92400e' }}>
                Врач выбрал <strong>{(log.disagreement as any).chosenRemedy}</strong> — причина: {
                  { thermal: 'термика', symptom: 'ключевой симптом', etiology: 'этиология', experience: 'клин. опыт', miasm: 'миазм', other: 'другое' }[(log.disagreement as any).reason] ?? (log.disagreement as any).reason
                }
              </p>
            </div>
          )}

          {/* Input */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--sim-text-muted)' }}>
              Вход ({log.symptomCount} сим + {log.modalityCount} мод, {log.mentalCount} mental)
            </div>
            <div className="flex flex-wrap gap-1">
              {(log.confirmedInput ?? []).map((s, i) => (
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
              {top3.map((r, i) => (
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
                Engine → <strong>{top1?.remedy}</strong>, врач → <strong>{log.doctorChoice}</strong>
                {log.correctPosition && <span> (был #{log.correctPosition})</span>}
                {!log.correctPosition && <span> (не в top-3)</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
