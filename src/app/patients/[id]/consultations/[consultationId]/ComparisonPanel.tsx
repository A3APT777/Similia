'use client'

import { useState, useCallback } from 'react'
import { StructuredSymptom } from '@/types'
import { compareStructured, ComparedSymptom, compareConsultations } from '@/lib/compareConsultations'
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
  currentSymptoms?: StructuredSymptom[]
  previousSymptoms?: StructuredSymptom[]
}

const L = {
  ru: {
    title: 'Изменения с прошлого приёма',
    analyze: 'Обновить анализ',
    appeared: 'Появилось',
    resolved: 'Прошло',
    changed: 'Изменилось',
    persists: 'Сохраняется',
    empty: 'Добавьте симптомы — анализ появится здесь',
    noChanges: 'Нет данных для сравнения',
    was: 'было:',
    textMode: 'Анализ по тексту (нет структур. симптомов)',
  },
  en: {
    title: 'Changes since last visit',
    analyze: 'Refresh analysis',
    appeared: 'New',
    resolved: 'Resolved',
    changed: 'Changed',
    persists: 'Persists',
    empty: 'Add symptoms — analysis will appear here',
    noChanges: 'No data to compare',
    was: 'was:',
    textMode: 'Text-based analysis (no structured symptoms)',
  },
}

const FIELDS = ['complaints', 'observations', 'notes', 'recommendations'] as const
const SOURCE = {
  complaints: { ru: 'жалобы', en: 'complaints' },
  observations: { ru: 'наблюд.', en: 'observ.' },
  notes: { ru: 'анализ', en: 'analysis' },
  recommendations: { ru: 'план', en: 'plan' },
} as const

export default function ComparisonPanel({ current, previous, currentSymptoms = [], previousSymptoms = [] }: Props) {
  const { lang } = useLanguage()
  const t = L[lang]
  const [result, setResult] = useState<{ appeared: ComparedSymptom[]; resolved: ComparedSymptom[]; changed: ComparedSymptom[]; persists: ComparedSymptom[] } | null>(null)
  const [isStale, setIsStale] = useState(true)
  const [mode, setMode] = useState<'structured' | 'text'>('structured')

  const doAnalyze = useCallback(() => {
    // If we have structured symptoms, use ID-based comparison
    if (currentSymptoms.length > 0 || previousSymptoms.length > 0) {
      setResult(compareStructured(currentSymptoms, previousSymptoms))
      setMode('structured')
    } else {
      // Fallback: text-based comparison grouped by status
      const appeared: ComparedSymptom[] = []
      const resolved: ComparedSymptom[] = []
      const changed: ComparedSymptom[] = []
      const persists: ComparedSymptom[] = []

      for (const field of FIELDS) {
        const r = compareConsultations(current[field], previous[field])
        const src = field
        for (const item of r.newItems) appeared.push({ id: item, label: item, section: src, status: 'new' })
        for (const item of r.goneItems) resolved.push({ id: item, label: item, section: src, status: 'resolved' })
        for (const item of r.sameItems) {
          if (item.changed) changed.push({ id: item.current, label: item.current, section: src, status: 'same', prevLabel: item.previous })
          else persists.push({ id: item.current, label: item.current, section: src, status: 'same' })
        }
      }
      setResult({ appeared, resolved, changed, persists })
      setMode('text')
    }
    setIsStale(false)
  }, [current, previous, currentSymptoms, previousSymptoms])

  const allEmpty = FIELDS.every(f => !current[f].trim()) && currentSymptoms.length === 0

  if (allEmpty && !result) {
    return <div className="py-8 text-center"><p className="text-[13px] text-gray-400">{t.empty}</p></div>
  }

  // Show analyze button if stale or no result
  if (!result || isStale) {
    return (
      <div className="py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#9a8a6a' }}>{t.title}</p>
        <button
          onClick={doAnalyze}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold rounded-xl border transition-all hover:shadow-sm"
          style={{ color: '#2d6a4f', borderColor: 'rgba(45,106,79,0.3)', backgroundColor: 'rgba(45,106,79,0.05)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          {result ? t.analyze : t.title}
        </button>
        {result && <ResultBlocks result={result} lang={lang} mode={mode} />}
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9a8a6a' }}>{t.title}</p>
        <button onClick={() => setIsStale(true)} className="text-[10px] text-gray-300 hover:text-emerald-600 transition-colors" title={t.analyze}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        </button>
      </div>
      <ResultBlocks result={result} lang={lang} mode={mode} />
    </div>
  )
}

function ResultBlocks({ result, lang, mode }: { result: { appeared: ComparedSymptom[]; resolved: ComparedSymptom[]; changed: ComparedSymptom[]; persists: ComparedSymptom[] }; lang: 'ru' | 'en'; mode: string }) {
  const t = L[lang]
  const { appeared, resolved, changed, persists } = result
  const total = appeared.length + resolved.length + changed.length + persists.length

  if (total === 0) return <p className="text-[12px] text-gray-300 text-center py-3">{t.noChanges}</p>

  return (
    <div className="space-y-3 mt-2">
      {/* Badges summary */}
      <div className="flex flex-wrap gap-1.5">
        {appeared.length > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: '#2563eb', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>{appeared.length} {t.appeared}</span>}
        {resolved.length > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: '#059669', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>{resolved.length} {t.resolved}</span>}
        {changed.length > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: '#d97706', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>{changed.length} {t.changed}</span>}
        {persists.length > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: '#6b7280', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>{persists.length} {t.persists}</span>}
      </div>

      {/* Appeared */}
      {appeared.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#2563eb' }}>{t.appeared}</p>
          <div className="space-y-1">{appeared.map(s => (
            <div key={s.id} className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[12px]" style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe' }}>
              <span className="font-bold mt-px shrink-0" style={{ color: '#2563eb' }}>+</span>
              <div className="min-w-0">
                <span style={{ color: '#1e3a5f' }}>{s.label}</span>
                <span className="text-[9px] uppercase tracking-wider ml-1.5" style={{ color: '#93c5fd' }}>{(SOURCE as any)[s.section]?.[lang] || s.section}</span>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#059669' }}>{t.resolved}</p>
          <div className="space-y-1">{resolved.map(s => (
            <div key={s.id} className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[12px]" style={{ backgroundColor: '#ecfdf5', border: '1px solid #d1fae5' }}>
              <span className="font-bold mt-px shrink-0" style={{ color: '#059669' }}>✓</span>
              <div className="min-w-0">
                <span className="line-through" style={{ color: '#065f46' }}>{s.label}</span>
                <span className="text-[9px] uppercase tracking-wider ml-1.5" style={{ color: '#6ee7b7' }}>{(SOURCE as any)[s.section]?.[lang] || s.section}</span>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {/* Changed */}
      {changed.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>{t.changed}</p>
          <div className="space-y-1">{changed.map(s => (
            <div key={s.id} className="rounded-lg px-2.5 py-1.5 text-[12px]" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <div className="flex items-start gap-2">
                <span className="font-bold mt-px shrink-0" style={{ color: '#d97706' }}>~</span>
                <div className="min-w-0">
                  <span style={{ color: '#78350f' }}>{s.label}</span>
                  {s.prevLabel && <p className="text-[10px] mt-0.5 italic" style={{ color: '#b45309' }}>{t.was} {s.prevLabel}</p>}
                  <span className="text-[9px] uppercase tracking-wider ml-1.5" style={{ color: '#fbbf24' }}>{(SOURCE as any)[s.section]?.[lang] || s.section}</span>
                </div>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {/* Persists */}
      {persists.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>{t.persists}</p>
          <div className="space-y-1">{persists.map(s => (
            <div key={s.id} className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[12px]" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <span className="font-bold mt-px shrink-0" style={{ color: '#9ca3af' }}>=</span>
              <div className="min-w-0">
                <span style={{ color: '#6b7280' }}>{s.label}</span>
                <span className="text-[9px] uppercase tracking-wider ml-1.5" style={{ color: '#d1d5db' }}>{(SOURCE as any)[s.section]?.[lang] || s.section}</span>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {mode === 'text' && (
        <p className="text-[9px] text-center pt-1" style={{ color: '#d1d5db' }}>{t.textMode}</p>
      )}
    </div>
  )
}
