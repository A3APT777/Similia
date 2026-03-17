'use client'

import { useState, useCallback } from 'react'
import { compareConsultations } from '@/lib/compareConsultations'
import { useLanguage } from '@/hooks/useLanguage'

type FieldData = {
  complaints: string
  observations: string
  notes: string
  recommendations: string
}

type Props = {
  current: FieldData
  previous: FieldData
}

type ChangeItem = {
  text: string
  prevText?: string
  source: string // из какой секции
}

type AnalysisResult = {
  appeared: ChangeItem[]   // новое
  resolved: ChangeItem[]   // исчезло (прошло)
  persists: ChangeItem[]   // сохраняется
  changed: ChangeItem[]    // изменилось (формулировка)
}

const LABELS = {
  ru: {
    title: 'Изменения с прошлого приёма',
    refresh: 'Обновить анализ',
    appeared: 'Появилось',
    resolved: 'Прошло',
    changed: 'Изменилось',
    persists: 'Сохраняется',
    empty: 'Начните заполнять приём — анализ появится здесь',
    noChanges: 'Пока нет данных для сравнения',
    was: 'было:',
    complaints: 'жалобы',
    observations: 'наблюд.',
    notes: 'анализ',
    recommendations: 'план',
  },
  en: {
    title: 'Changes since last visit',
    refresh: 'Refresh analysis',
    appeared: 'New',
    resolved: 'Resolved',
    changed: 'Changed',
    persists: 'Persists',
    empty: 'Start filling in — analysis will appear here',
    noChanges: 'No data to compare yet',
    was: 'was:',
    complaints: 'complaints',
    observations: 'observ.',
    notes: 'analysis',
    recommendations: 'plan',
  },
}

const SOURCE_LABELS = {
  complaints: { ru: 'жалобы', en: 'complaints' },
  observations: { ru: 'наблюд.', en: 'observ.' },
  notes: { ru: 'анализ', en: 'analysis' },
  recommendations: { ru: 'план', en: 'plan' },
} as const

const FIELDS = ['complaints', 'observations', 'notes', 'recommendations'] as const

function analyze(current: FieldData, previous: FieldData, lang: 'ru' | 'en'): AnalysisResult {
  const appeared: ChangeItem[] = []
  const resolved: ChangeItem[] = []
  const persists: ChangeItem[] = []
  const changed: ChangeItem[] = []

  for (const field of FIELDS) {
    const result = compareConsultations(current[field], previous[field])
    const src = SOURCE_LABELS[field][lang]

    for (const item of result.newItems) {
      appeared.push({ text: item, source: src })
    }
    for (const item of result.goneItems) {
      resolved.push({ text: item, source: src })
    }
    for (const item of result.sameItems) {
      if (item.changed) {
        changed.push({ text: item.current, prevText: item.previous, source: src })
      } else {
        persists.push({ text: item.current, source: src })
      }
    }
  }

  return { appeared, resolved, persists, changed }
}

export default function ComparisonPanel({ current, previous }: Props) {
  const { lang } = useLanguage()
  const L = LABELS[lang]

  // Анализ по кнопке, не realtime
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isStale, setIsStale] = useState(true)

  const doAnalyze = useCallback(() => {
    setResult(analyze(current, previous, lang))
    setIsStale(false)
  }, [current, previous, lang])

  // Помечаем как устаревший при любом изменении current
  // (но не пересчитываем — только по кнопке)
  const allEmpty = FIELDS.every(f => !current[f].trim())

  if (allEmpty && !result) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <p className="text-[13px] text-gray-400">{L.empty}</p>
      </div>
    )
  }

  // Если ещё не анализировали — показываем кнопку
  if (!result || isStale) {
    return (
      <div className="px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a8a6a' }}>{L.title}</p>
        <button
          onClick={doAnalyze}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold rounded-xl border transition-all hover:shadow-sm"
          style={{ color: '#2d6a4f', borderColor: 'rgba(45,106,79,0.3)', backgroundColor: 'rgba(45,106,79,0.05)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          {result ? L.refresh : L.title}
        </button>
        {result && <ResultView result={result} lang={lang} />}
      </div>
    )
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9a8a6a' }}>{L.title}</p>
        <button
          onClick={() => setIsStale(true)}
          className="text-[10px] text-gray-400 hover:text-emerald-600 transition-colors"
          title={L.refresh}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        </button>
      </div>
      <ResultView result={result} lang={lang} />
    </div>
  )
}

// Отображение результата анализа
function ResultView({ result, lang }: { result: AnalysisResult; lang: 'ru' | 'en' }) {
  const L = LABELS[lang]
  const { appeared, resolved, changed, persists } = result
  const total = appeared.length + resolved.length + changed.length + persists.length

  if (total === 0) {
    return <p className="text-[13px] text-gray-300 text-center py-4">{L.noChanges}</p>
  }

  return (
    <div className="space-y-4">
      {/* Сводка — цифры */}
      <div className="flex flex-wrap gap-2">
        {appeared.length > 0 && <Badge count={appeared.length} label={L.appeared} color="#2563eb" bg="#eff6ff" border="#bfdbfe" />}
        {resolved.length > 0 && <Badge count={resolved.length} label={L.resolved} color="#059669" bg="#ecfdf5" border="#a7f3d0" />}
        {changed.length > 0 && <Badge count={changed.length} label={L.changed} color="#d97706" bg="#fffbeb" border="#fde68a" />}
        {persists.length > 0 && <Badge count={persists.length} label={L.persists} color="#6b7280" bg="#f9fafb" border="#e5e7eb" />}
      </div>

      {/* Появилось */}
      {appeared.length > 0 && (
        <Section title={L.appeared} color="#2563eb" items={appeared.map(i => (
          <Item key={i.text} icon="+" iconColor="#2563eb" bg="#eff6ff" border="#dbeafe" text={i.text} source={i.source} />
        ))} />
      )}

      {/* Прошло */}
      {resolved.length > 0 && (
        <Section title={L.resolved} color="#059669" items={resolved.map(i => (
          <Item key={i.text} icon="✓" iconColor="#059669" bg="#ecfdf5" border="#d1fae5" text={i.text} source={i.source} strikethrough />
        ))} />
      )}

      {/* Изменилось */}
      {changed.length > 0 && (
        <Section title={L.changed} color="#d97706" items={changed.map(i => (
          <div key={i.text} className="rounded-lg px-3 py-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <div className="flex items-start gap-2">
              <span className="text-[11px] font-bold mt-0.5" style={{ color: '#d97706' }}>~</span>
              <div className="min-w-0">
                <p className="text-[13px] leading-snug" style={{ color: '#92400e' }}>{i.text}</p>
                {i.prevText && (
                  <p className="text-[11px] mt-0.5 italic" style={{ color: '#b45309' }}>{L.was} {i.prevText}</p>
                )}
                <span className="text-[9px] uppercase tracking-wider" style={{ color: '#d4a050' }}>{i.source}</span>
              </div>
            </div>
          </div>
        ))} />
      )}

      {/* Сохраняется */}
      {persists.length > 0 && (
        <Section title={L.persists} color="#9ca3af" items={persists.map(i => (
          <Item key={i.text} icon="=" iconColor="#9ca3af" bg="#f9fafb" border="#e5e7eb" text={i.text} source={i.source} muted />
        ))} />
      )}
    </div>
  )
}

function Badge({ count, label, color, bg, border }: { count: number; label: string; color: string; bg: string; border: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ color, backgroundColor: bg, border: `1px solid ${border}` }}>
      {count} {label}
    </span>
  )
}

function Section({ title, color, items }: { title: string; color: string; items: React.ReactNode[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>{title}</p>
      <div className="space-y-1">{items}</div>
    </div>
  )
}

function Item({ icon, iconColor, bg, border, text, source, strikethrough, muted }: {
  icon: string; iconColor: string; bg: string; border: string; text: string; source: string; strikethrough?: boolean; muted?: boolean
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
      <span className="text-[11px] font-bold mt-0.5 shrink-0" style={{ color: iconColor }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] leading-snug ${strikethrough ? 'line-through' : ''}`} style={{ color: muted ? '#9ca3af' : '#374151' }}>{text}</p>
        <span className="text-[9px] uppercase tracking-wider" style={{ color: muted ? '#d1d5db' : '#b0a090' }}>{source}</span>
      </div>
    </div>
  )
}
