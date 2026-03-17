'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchRepertory, RepertoryRubric } from '@/lib/actions/repertory'
import { saveRepertoryData } from '@/lib/actions/consultations'
import { CHAPTER_NAMES, translateRubric } from '@/lib/repertory-translations'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { RepertoryEntry } from '@/types'

const CHAPTERS_SHORT = [
  'Mind', 'Head', 'Eye', 'Ear', 'Nose', 'Face', 'Mouth', 'Throat',
  'Stomach', 'Abdomen', 'Rectum', 'Chest', 'Back', 'Extremities',
  'Sleep', 'Fever', 'Skin', 'Generalities',
]

type AnalysisEntry = {
  rubric: RepertoryRubric
  weight: 1 | 2 | 3
  eliminate?: boolean
}

type Props = {
  consultationId: string
  initialRepertoryData?: RepertoryEntry[]
  initialQuery?: string
  onSelectRubric: (rubricPath: string) => void
  onClose: () => void
  onAssignRemedy?: (abbrev: string) => void
}

export default function MiniRepertory({ consultationId, initialRepertoryData, initialQuery, onSelectRubric, onClose, onAssignRemedy }: Props) {
  const { lang } = useLanguage()
  const [query, setQuery] = useState(initialQuery || '')
  const [chapter, setChapter] = useState('Mind')
  const [rubrics, setRubrics] = useState<RepertoryRubric[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [expandedRubricId, setExpandedRubricId] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // Анализ
  const [analysisEntries, setAnalysisEntries] = useState<AnalysisEntry[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const load = useCallback(async (q: string, ch: string, p: number) => {
    setLoading(true)
    try {
      const result = await searchRepertory(q, ch, 'publicum', p)
      setRubrics(result.rubrics)
      setTotal(result.total)
    } catch {
      setRubrics([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(0)
      load(query, chapter, 0)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, chapter, load])

  useEffect(() => {
    load(query, chapter, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Загружаем сохранённые рубрики как начальный анализ
  useEffect(() => {
    if (initialRepertoryData && initialRepertoryData.length > 0) {
      // Загружаем рубрики из БД, чтобы получить полные данные (remedies)
      // Пока показываем только имена — данные будут подгружены при открытии анализа
      setShowAnalysis(true)
    }
  }, [])

  function addToAnalysis(rubric: RepertoryRubric) {
    if (analysisEntries.find(ae => ae.rubric.id === rubric.id)) return
    setAnalysisEntries(prev => [...prev, { rubric, weight: 1 }])
    if (!showAnalysis) setShowAnalysis(true)
  }

  function removeFromAnalysis(id: number) {
    setAnalysisEntries(prev => prev.filter(ae => ae.rubric.id !== id))
  }

  function setWeight(id: number, weight: 1 | 2 | 3) {
    setAnalysisEntries(prev => prev.map(ae => ae.rubric.id === id ? { ...ae, weight } : ae))
  }

  function toggleEliminate(id: number) {
    setAnalysisEntries(prev => prev.map(ae => ae.rubric.id === id ? { ...ae, eliminate: !ae.eliminate } : ae))
  }

  // Рейтинг препаратов
  const analysisScores = useMemo(() => {
    const n = analysisEntries.length
    const scores: Record<string, { name: string; total: number; coverage: number[]; coveredCount: number }> = {}
    analysisEntries.forEach((ae, idx) => {
      ae.rubric.remedies.forEach(r => {
        if (!scores[r.abbrev]) {
          scores[r.abbrev] = { name: r.name, total: 0, coverage: new Array(n).fill(0), coveredCount: 0 }
        }
        const g = Number(r.grade)
        scores[r.abbrev].total += g * ae.weight
        scores[r.abbrev].coverage[idx] = g
        scores[r.abbrev].coveredCount++
      })
    })
    let entries = Object.entries(scores).sort((a, b) => {
      if (b[1].total !== a[1].total) return b[1].total - a[1].total
      return b[1].coveredCount - a[1].coveredCount
    })
    // Элиминация
    const eliminateIdxs = analysisEntries
      .map((ae, i) => ae.eliminate ? i : -1)
      .filter(i => i >= 0)
    if (eliminateIdxs.length > 0) {
      entries = entries.filter(([, d]) => eliminateIdxs.every(idx => d.coverage[idx] > 0))
    }
    return entries.slice(0, 12)
  }, [analysisEntries])

  async function handleSave() {
    if (analysisEntries.length === 0) return
    setSaveStatus('saving')
    try {
      await saveRepertoryData(
        consultationId,
        analysisEntries.map(ae => ({
          rubricId: ae.rubric.id,
          fullpath: ae.rubric.fullpath,
          fullpath_ru: ae.rubric.fullpath_ru,
          weight: ae.weight,
          eliminate: ae.eliminate,
        }))
      )
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const isInAnalysis = (id: number) => analysisEntries.some(ae => ae.rubric.id === id)
  const PAGE_SIZE = 30
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#f7f3ed' }}>

      {/* Шапка */}
      <div className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: '#d4c9b8', backgroundColor: '#ede7dd' }}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: '#1a3020' }}>{t(lang).miniRepertory.title}</h3>
          {analysisEntries.length > 0 && (
            <button
              onClick={() => setShowAnalysis(v => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white transition-colors"
              style={{ backgroundColor: showAnalysis ? '#2d6a4f' : '#9a8a6a' }}
            >
              {analysisEntries.length} {lang === 'ru' ? 'рубр.' : 'rubr.'}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: '#9a8a6a' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Поиск */}
      <div className="px-3 py-2 border-b shrink-0" style={{ borderColor: '#d4c9b8', backgroundColor: '#ede7dd' }}>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#9a8a6a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
          </svg>
          <input
            data-tour="mini-search"
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t(lang).miniRepertory.search}
            className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none transition-all"
            style={{ backgroundColor: '#f7f3ed', borderColor: '#c8b89a', color: '#1a1a0a' }}
          />
        </div>
      </div>

      {/* Главы */}
      <div className="px-3 py-1.5 border-b shrink-0 overflow-x-auto" style={{ borderColor: '#d4c9b8', backgroundColor: '#ede7dd' }}>
        <div className="flex gap-1 min-w-max">
          {CHAPTERS_SHORT.map(ch => (
            <button
              key={ch}
              onClick={() => { setChapter(ch); setPage(0) }}
              className="px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: chapter === ch ? '#2d6a4f' : 'transparent',
                color: chapter === ch ? 'white' : '#9a8a6a',
              }}
            >
              {CHAPTER_NAMES[ch] || ch}
            </button>
          ))}
        </div>
      </div>

      {/* Панель анализа — если открыта */}
      {showAnalysis && analysisEntries.length > 0 && (
        <div data-tour="mini-analysis" className="shrink-0 border-b" style={{ borderColor: '#d4c9b8', backgroundColor: '#f0e8dc', maxHeight: '45%', overflowY: 'auto' }}>
          {/* Рубрики */}
          <div className="px-3 pt-2 pb-1 space-y-1">
            {analysisEntries.map(ae => (
              <div
                key={ae.rubric.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px]"
                style={{
                  backgroundColor: ae.eliminate ? 'rgba(220,38,38,0.08)' : 'rgba(45,106,79,0.07)',
                  borderLeft: `2px solid ${ae.eliminate ? '#dc2626' : '#2d6a4f'}`,
                }}
              >
                <span className="flex-1 truncate" style={{ color: '#1a1a0a' }}>
                  {(ae.rubric.fullpath_ru || ae.rubric.fullpath).split(', ').slice(-2).join(', ')}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Элиминация */}
                  <button
                    onClick={() => toggleEliminate(ae.rubric.id)}
                    className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: ae.eliminate ? '#dc2626' : 'transparent',
                      color: ae.eliminate ? 'white' : '#9a8a6a',
                      border: `1px solid ${ae.eliminate ? '#dc2626' : '#d4c9b8'}`,
                    }}
                    title={lang === 'ru' ? 'Элиминация' : 'Elimination'}
                  >E</button>
                  {/* Вес */}
                  {([1, 2, 3] as const).map(w => (
                    <button
                      key={w}
                      onClick={() => setWeight(ae.rubric.id, w)}
                      className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: ae.weight === w ? '#2d6a4f' : 'transparent',
                        color: ae.weight === w ? 'white' : '#9a8a6a',
                        border: `1px solid ${ae.weight === w ? '#2d6a4f' : '#d4c9b8'}`,
                      }}
                    >{w}</button>
                  ))}
                  <button
                    onClick={() => removeFromAnalysis(ae.rubric.id)}
                    className="w-4 h-4 flex items-center justify-center text-[10px]"
                    style={{ color: '#9a8a6a' }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Топ препаратов */}
          {analysisScores.length > 0 && (
            <div className="px-3 pb-2">
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9a8a6a' }}>
                {t(lang).repertory.topRemedies}
              </p>
              <div className="space-y-0.5">
                {analysisScores.slice(0, 8).map(([abbrev, data], rank) => {
                  const maxScore = analysisScores[0]?.[1].total || 1
                  const pct = (data.total / maxScore) * 100
                  return (
                    <div key={abbrev} className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-bold shrink-0"
                        style={{ width: 44, color: rank === 0 ? '#2d6a4f' : '#5a5040' }}
                      >
                        {abbrev}
                      </span>
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: '#d4c9b8' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: rank === 0 ? '#2d6a4f' : rank < 3 ? '#6aad89' : '#b0a898' }}
                        />
                      </div>
                      <span className="text-[10px] font-bold shrink-0" style={{ width: 18, textAlign: 'right', color: '#5a5040' }}>
                        {data.total}
                      </span>
                      {onAssignRemedy && (
                        <button
                          data-tour="mini-assign"
                          onClick={() => { onAssignRemedy(abbrev); onClose() }}
                          className="text-[9px] px-1.5 py-0.5 rounded shrink-0 transition-all"
                          style={{ border: '1px solid #2d6a4f', color: '#2d6a4f', backgroundColor: 'transparent' }}
                        >
                          Rx
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Сохранить */}
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="w-full mt-2 py-1.5 text-[11px] rounded font-semibold transition-all"
                style={{
                  backgroundColor: saveStatus === 'saved' ? '#16a34a' : saveStatus === 'error' ? '#dc2626' : '#2d6a4f',
                  color: 'white',
                  opacity: saveStatus === 'saving' ? 0.7 : 1,
                }}
              >
                {saveStatus === 'saving'
                  ? (lang === 'ru' ? 'Сохраняю...' : 'Saving...')
                  : saveStatus === 'saved'
                  ? '✓ ' + (lang === 'ru' ? 'Сохранено' : 'Saved')
                  : saveStatus === 'error'
                  ? (lang === 'ru' ? 'Ошибка' : 'Error')
                  : (lang === 'ru' ? 'Сохранить в консультацию' : 'Save to consultation')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Результаты поиска */}
      <div data-tour="mini-results" className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2d6a4f', borderTopColor: 'transparent' }} />
          </div>
        ) : rubrics.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs" style={{ color: '#9a8a6a' }}>
            {t(lang).miniRepertory.notFound}
          </div>
        ) : (
          <div style={{ borderColor: '#e8e0d4' }}>
            {rubrics.map(r => {
              const isExpanded = expandedRubricId === r.id
              const inAnalysis = isInAnalysis(r.id)
              return (
                <div key={r.id} style={{ borderBottom: '1px solid #ede7dd' }}>
                  <div className="flex items-start gap-1 px-3 py-2 group transition-colors" style={{ backgroundColor: inAnalysis ? 'rgba(45,106,79,0.06)' : 'transparent' }}>
                    {/* Кнопка добавить в анализ */}
                    <button
                      onClick={() => inAnalysis ? removeFromAnalysis(r.id) : addToAnalysis(r)}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center mt-0.5 transition-all"
                      style={{
                        backgroundColor: inAnalysis ? '#2d6a4f' : 'transparent',
                        border: `1px solid ${inAnalysis ? '#2d6a4f' : '#d4c9b8'}`,
                        color: inAnalysis ? 'white' : '#9a8a6a',
                      }}
                      title={inAnalysis ? (lang === 'ru' ? 'Убрать из анализа' : 'Remove from analysis') : (lang === 'ru' ? 'Добавить в анализ' : 'Add to analysis')}
                    >
                      {inAnalysis ? '✓' : '+'}
                    </button>

                    {/* Основная часть — нажать чтобы раскрыть */}
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => setExpandedRubricId(isExpanded ? null : r.id)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[12px] leading-snug" style={{ color: '#1a1a0a' }}>
                          {translateRubric(r.fullpath, r.chapter)}
                        </p>
                        <span className="text-[9px] shrink-0 mt-0.5" style={{ color: '#9a8a6a' }}>{r.remedy_count}</span>
                      </div>
                      {!isExpanded && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {r.remedies.slice(0, 7).map((rem, i) => (
                            <span
                              key={i}
                              style={{
                                color: rem.grade >= 3 ? '#2d6a4f' : rem.grade === 2 ? '#1c1a14' : '#9a9a8a',
                                fontWeight: rem.grade >= 3 ? 700 : rem.grade === 2 ? 500 : 400,
                                fontSize: rem.grade >= 3 ? '10px' : '9px',
                              }}
                            >
                              {rem.abbrev}
                            </span>
                          ))}
                          {r.remedy_count > 7 && <span className="text-[9px]" style={{ color: '#9a8a6a' }}>+{r.remedy_count - 7}</span>}
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Раскрытый вид */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1" style={{ backgroundColor: 'rgba(45,106,79,0.03)', borderTop: '1px solid #ede7dd' }}>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {r.remedies.map((rem, i) => (
                          <button
                            key={i}
                            onClick={() => onAssignRemedy && onAssignRemedy(rem.abbrev)}
                            disabled={!onAssignRemedy}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-all"
                            style={{
                              border: `1px solid ${rem.grade >= 3 ? '#2d6a4f40' : rem.grade === 2 ? '#1c1a1430' : '#e8e0d4'}`,
                              backgroundColor: rem.grade >= 3 ? '#2d6a4f0d' : 'transparent',
                              cursor: onAssignRemedy ? 'pointer' : 'default',
                            }}
                          >
                            <span style={{ color: rem.grade >= 3 ? '#2d6a4f' : rem.grade === 2 ? '#1c1a14' : '#9a9a8a', fontWeight: rem.grade >= 3 ? 700 : rem.grade === 2 ? 500 : 400, fontSize: rem.grade >= 3 ? '11px' : '10px' }}>
                              {rem.abbrev}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => { onSelectRubric(r.fullpath); setExpandedRubricId(null) }}
                        className="text-[10px] flex items-center gap-1 transition-colors"
                        style={{ color: '#9a8a6a' }}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        {lang === 'ru' ? 'Добавить в запись' : 'Add to notes'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="px-4 py-1.5 border-t shrink-0 flex items-center justify-between" style={{ borderColor: '#d4c9b8', backgroundColor: '#ede7dd' }}>
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="text-[10px] disabled:opacity-30"
            style={{ color: '#9a8a6a' }}
          >
            ← {t(lang).miniRepertory.prev}
          </button>
          <span className="text-[10px]" style={{ color: '#9a8a6a' }}>{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="text-[10px] disabled:opacity-30"
            style={{ color: '#9a8a6a' }}
          >
            {t(lang).miniRepertory.next} →
          </button>
        </div>
      )}
    </div>
  )
}
