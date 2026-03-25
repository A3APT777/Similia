'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchRepertory, getRubricsByIds, RepertoryRubric } from '@/lib/actions/repertory'
import { saveRepertoryData } from '@/lib/actions/consultations'
import { CHAPTER_NAMES, translateRubric } from '@/lib/repertory-translations'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { RepertoryEntry } from '@/types'
import FirstTimeHint from '@/components/FirstTimeHint'


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
  onRepertoryDataChange?: (data: RepertoryEntry[]) => void
  startTutorial?: boolean
  onTutorialStarted?: () => void
}

export default function MiniRepertory({ consultationId, initialRepertoryData, initialQuery, onSelectRubric, onClose, onAssignRemedy, onRepertoryDataChange, startTutorial, onTutorialStarted }: Props) {
  const { lang } = useLanguage()
  const [query, setQuery] = useState(initialQuery || '')
  const [tutStep, setTutStep] = useState(-1)
  const [tutAddedCount, setTutAddedCount] = useState(0)
  const [repoLang, setRepoLang] = useState<'ru' | 'en'>(() => {
    if (typeof window === 'undefined') return 'ru'
    return (localStorage.getItem('hc-repo-lang') as 'ru' | 'en') || 'ru'
  })
  const [rubrics, setRubrics] = useState<RepertoryRubric[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [page, setPage] = useState(0)
  const [expandedRubricId, setExpandedRubricId] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  // Анализ
  const [analysisEntries, setAnalysisEntries] = useState<AnalysisEntry[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isRestoringRef = useRef(false)
  const [analysisView, setAnalysisView] = useState<'visual' | 'classic'>(() => {
    if (typeof window === 'undefined') return 'visual'
    return (localStorage.getItem('hc-analysis-view') as 'visual' | 'classic') || 'visual'
  })

  // Немедленное сохранение и синхронизация с родителем
  const saveNow = useCallback(async (entries: AnalysisEntry[]) => {
    const data = entries.map(ae => ({
      rubricId: ae.rubric.id,
      fullpath: ae.rubric.fullpath,
      fullpath_ru: ae.rubric.fullpath_ru,
      weight: ae.weight,
      eliminate: ae.eliminate,
    }))
    onRepertoryDataChange?.(data)
    clearTimeout(autosaveRef.current)
    setSaveStatus('saving')
    try {
      await saveRepertoryData(consultationId, data)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [consultationId, onRepertoryDataChange])

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true)
    setSearchError(false)
    try {
      const result = await searchRepertory(q, [], 'publicum', p)
      setRubrics(result.rubrics)
      setTotal(result.total)
    } catch {
      setRubrics([])
      setTotal(0)
      setSearchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(0)
      load(query, 0)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, load])

  useEffect(() => {
    load(query, page)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    inputRef.current?.focus()

    // Автозапуск отключён — обучение через InteractiveTour в сайдбаре
    try {
      if (/* disabled */ false && !localStorage.getItem('mini_rep_tutorial_done') && tutStep === -1) {
        const timer = setTimeout(() => {
          setTutStep(0)
          setTutAddedCount(0)
        }, 800)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [])

  // Запуск туториала извне
  useEffect(() => {
    if (startTutorial && tutStep === -1) {
      // Если рубрики уже добавлены — пропускаем шаги 0-4, начинаем с панели анализа
      if (analysisEntries.length >= 2) {
        setTutStep(5)
        setTutAddedCount(analysisEntries.length)
      } else {
        setTutStep(0)
        setTutAddedCount(0)
      }
      onTutorialStarted?.()
    }
  }, [startTutorial])

  // Авто-переход: step 1 → 2 (поиск введён, результаты появились)
  useEffect(() => {
    if (tutStep === 1 && query.length >= 2 && rubrics.length > 0 && !loading) {
      const timer = setTimeout(() => setTutStep(2), 800)
      return () => clearTimeout(timer)
    }
  }, [tutStep, query, rubrics.length, loading])

  // Принудительно открыть панель анализа на шагах 5-9 (иначе подсветка невидима)
  useEffect(() => {
    if (tutStep >= 5 && tutStep <= 9 && !showAnalysis && analysisEntries.length > 0) {
      setShowAnalysis(true)
    }
  }, [tutStep, showAnalysis, analysisEntries.length])

  // Авто-переход: step 3 → 4 (первая рубрика добавлена)
  useEffect(() => {
    if (tutStep === 3 && tutAddedCount >= 1) {
      const timer = setTimeout(() => setTutStep(4), 600)
      return () => clearTimeout(timer)
    }
  }, [tutStep, tutAddedCount])

  // Восстанавливаем сохранённый анализ при открытии
  useEffect(() => {
    if (!initialRepertoryData || initialRepertoryData.length === 0) return
    isRestoringRef.current = true
    const ids = initialRepertoryData.map(e => e.rubricId)
    getRubricsByIds(ids).then(rubrics => {
      const entries: AnalysisEntry[] = []
      for (const saved of initialRepertoryData as Array<{ rubricId: number; weight: 1 | 2 | 3; eliminate?: boolean }>) {
        const rubric = rubrics.find(r => r.id === saved.rubricId)
        if (rubric) entries.push({ rubric, weight: saved.weight ?? 1, eliminate: saved.eliminate })
      }
      if (entries.length > 0) {
        setAnalysisEntries(entries)
        setShowAnalysis(true)
      }
    }).catch(() => {
      // Если восстановление не удалось — продолжаем с пустым анализом
    }).finally(() => {
      isRestoringRef.current = false
    })
  }, [])

  // Автосохранение при изменении веса/eliminate (debounced)
  // Добавление/удаление рубрик сохраняется немедленно через saveNow()
  useEffect(() => {
    if (isRestoringRef.current) return
    clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(async () => {
      const data = analysisEntries.map(ae => ({
        rubricId: ae.rubric.id,
        fullpath: ae.rubric.fullpath,
        fullpath_ru: ae.rubric.fullpath_ru,
        weight: ae.weight,
        eliminate: ae.eliminate,
      }))
      onRepertoryDataChange?.(data)
      setSaveStatus('saving')
      try {
        await saveRepertoryData(consultationId, data)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 1500)
    return () => clearTimeout(autosaveRef.current)
  }, [analysisEntries, consultationId, onRepertoryDataChange])

  function addToAnalysis(rubric: RepertoryRubric) {
    if (analysisEntries.find(ae => ae.rubric.id === rubric.id)) return
    const newEntries = [...analysisEntries, { rubric, weight: 1 as const }]
    setAnalysisEntries(newEntries)
    if (!showAnalysis) setShowAnalysis(true)
    if (tutStep >= 0) setTutAddedCount(c => c + 1)
    saveNow(newEntries)
  }

  function removeFromAnalysis(id: number) {
    const newEntries = analysisEntries.filter(ae => ae.rubric.id !== id)
    setAnalysisEntries(newEntries)
    saveNow(newEntries)
  }

  function setWeight(id: number, weight: 1 | 2 | 3) {
    setAnalysisEntries(prev => prev.map(ae => ae.rubric.id === id ? { ...ae, weight } : ae))
  }

  function toggleEliminate(id: number) {
    setAnalysisEntries(prev => prev.map(ae => ae.rubric.id === id ? { ...ae, eliminate: !ae.eliminate } : ae))
  }

  function handleTutNext() {
    if (tutStep === 0) {
      // Вводим пример
      const example = lang === 'ru' ? 'головная боль' : 'headache'
      setQuery(example)
      setTutStep(1)
      setTimeout(() => inputRef.current?.focus(), 100)
      return
    }
    if (tutStep >= 10) {
      setTutStep(-1)
      try { localStorage.setItem('mini_rep_tutorial_done', 'true') } catch {}
      return
    }
    setTutStep(s => s + 1)
  }

  function handleTutExit() {
    setTutStep(-1)
    try { localStorage.setItem('mini_rep_tutorial_done', 'true') } catch {}
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


  const isInAnalysis = (id: number) => analysisEntries.some(ae => ae.rubric.id === id)
  const PAGE_SIZE = 30
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--sim-bg)' }}>

      {/* Шапка */}
      <div className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between gap-2" style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card, #f5f0e8)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold shrink-0" style={{ color: 'var(--sim-forest)' }}>
            {t(lang).miniRepertory.title}
            <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--sim-text-hint)' }}>{repoLang === 'ru' ? 'Кент' : 'Kent'}</span>
          </h3>
          {analysisEntries.length > 0 && (
            <button
              onClick={() => setShowAnalysis(v => !v)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-bold text-white transition-colors shrink-0"
              style={{ backgroundColor: showAnalysis ? 'var(--sim-green)' : 'var(--sim-text-muted)' }}
            >
              {analysisEntries.length} {lang === 'ru' ? 'рубр.' : 'rubr.'}
              {saveStatus === 'saving' && <span className="opacity-70">…</span>}
              {saveStatus === 'saved' && <span>✓</span>}
              {saveStatus === 'error' && <span className="text-red-300">!</span>}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* RU / EN переключатель */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--sim-border)' }}>
            {(['ru', 'en'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => { setRepoLang(l); localStorage.setItem('hc-repo-lang', l) }}
                className="px-2 py-0.5 text-[12px] font-semibold transition-colors"
                style={{
                  backgroundColor: repoLang === l ? 'var(--sim-green)' : 'transparent',
                  color: repoLang === l ? '#fff' : 'var(--sim-text-muted)',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label={lang === 'ru' ? 'Закрыть реперторий' : 'Close repertory'}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--sim-text-hint)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className={`px-3 py-2 border-b shrink-0${tutStep === 1 ? ' mini-tut-glow' : ''}`} style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card, #f5f0e8)' }}>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--sim-text-hint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
          </svg>
          <input
            data-tour="mini-search"
            ref={inputRef}
            type="text"
            aria-label={lang === 'ru' ? 'Поиск симптома в реперториуме' : 'Search symptom in repertory'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t(lang).miniRepertory.search}
            className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-xl focus:outline-none transition-all"
            style={{ backgroundColor: 'var(--sim-bg)', borderColor: 'var(--sim-border)', color: 'var(--sim-text)' }}
          />
        </div>
      </div>


      {tutStep < 0 && (
        <div className="px-3">
          <FirstTimeHint id="mini_repertory">
            {lang === 'ru'
              ? <>Это мини-реперторий Кента — 74 482 рубрики. Введите симптом, добавьте в анализ кнопкой [+], назначьте препарат. <a href="/docs/Repertory_Manual_RU.pdf" target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>Скачать руководство (PDF)</a></>
              : <>This is Kent&apos;s mini-repertory — 74,482 rubrics. Type a symptom, add to analysis with [+], prescribe. <a href="/docs/Repertory_Manual_RU.pdf" target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>Download guide (PDF)</a></>}
          </FirstTimeHint>
        </div>
      )}

      {/* Панель анализа — если открыта */}
      {showAnalysis && analysisEntries.length > 0 && (
        <div data-tour="mini-analysis" className={`shrink-0 border-b${tutStep >= 5 && tutStep <= 7 ? ' mini-tut-glow' : ''}`} style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)', maxHeight: '45%', overflowY: 'auto' }}>
          {/* Рубрики с нумерацией */}
          <div className="px-3 pt-2 pb-1 space-y-1">
            {analysisEntries.map((ae, idx) => (
              <div
                key={ae.rubric.id}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: ae.eliminate ? 'rgba(220,38,38,0.08)' : 'rgba(45,106,79,0.07)',
                  borderLeft: `2px solid ${ae.eliminate ? '#dc2626' : 'var(--sim-green)'}`,
                }}
              >
                <span className="shrink-0 w-4 text-xs font-bold" style={{ color: 'var(--sim-green)' }}>{idx + 1}</span>
                <span className="flex-1 truncate" style={{ color: 'var(--sim-text)' }}>
                  {repoLang === 'ru'
                    ? translateRubric(ae.rubric.fullpath, ae.rubric.chapter)
                    : (ae.rubric.fullpath.startsWith(ae.rubric.chapter + ', ') ? ae.rubric.fullpath.slice(ae.rubric.chapter.length + 2) : ae.rubric.fullpath)
                  }
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Элиминация */}
                  <button
                    onClick={() => toggleEliminate(ae.rubric.id)}
                    className="w-6 h-6 rounded text-[12px] font-bold flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: ae.eliminate ? '#dc2626' : 'transparent',
                      color: ae.eliminate ? 'white' : 'var(--sim-text-muted)',
                      border: `1px solid ${ae.eliminate ? '#dc2626' : 'var(--sim-border)'}`,
                      ...(tutStep === 7 ? { outline: '2px solid #dc2626', outlineOffset: 1, boxShadow: '0 0 10px rgba(220,38,38,0.4)' } : {}),
                    }}
                    title={lang === 'ru' ? 'Элиминация' : 'Elimination'}
                    aria-label={lang === 'ru' ? `Элиминация${ae.eliminate ? ' (активна)' : ''}` : `Elimination${ae.eliminate ? ' (active)' : ''}`}
                    aria-pressed={ae.eliminate}
                  >E</button>
                  {/* Вес */}
                  {([1, 2, 3] as const).map(w => (
                    <button
                      key={w}
                      onClick={() => setWeight(ae.rubric.id, w)}
                      className="w-6 h-6 rounded text-[12px] font-bold flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: ae.weight === w ? 'var(--sim-green)' : 'transparent',
                        color: ae.weight === w ? 'white' : 'var(--sim-text-muted)',
                        border: `1px solid ${ae.weight === w ? 'var(--sim-green)' : 'var(--sim-border)'}`,
                        ...(tutStep === 6 ? { outline: '2px solid #2d6a4f', outlineOffset: 1, boxShadow: '0 0 10px rgba(45,106,79,0.35)' } : {}),
                      }}
                    aria-label={lang === 'ru' ? `Вес ${w}` : `Weight ${w}`}
                    aria-pressed={ae.weight === w}
                    >{w}</button>
                  ))}
                  <button
                    onClick={() => removeFromAnalysis(ae.rubric.id)}
                    aria-label={lang === 'ru' ? 'Удалить рубрику' : 'Remove rubric'}
                    className="w-6 h-6 flex items-center justify-center text-[12px]"
                    style={{ color: 'var(--sim-text-hint)' }}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Топ препаратов */}
          {analysisScores.length > 0 && (
            <div data-tour="mini-top-remedies" className={`px-3 pb-2${tutStep >= 8 && tutStep <= 9 ? ' mini-tut-glow' : ''}`}>
              {/* Заголовок + переключатель вида */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sim-text-hint)' }}>
                  {t(lang).repertory.topRemedies}
                </p>
                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--sim-border)' }}>
                  {(['visual', 'classic'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => { setAnalysisView(v); try { localStorage.setItem('hc-analysis-view', v) } catch {} }}
                      className="px-2 py-0.5 text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: analysisView === v ? 'var(--sim-green)' : 'transparent',
                        color: analysisView === v ? '#fff' : 'var(--sim-text-muted)',
                      }}
                    >
                      {v === 'visual'
                        ? (repoLang === 'ru' ? 'Визуальный' : 'Visual')
                        : (repoLang === 'ru' ? 'Классический' : 'Classic')
                      }
                    </button>
                  ))}
                </div>
              </div>

              {analysisView === 'visual' ? (
                /* Визуальный вид — прогресс-бары */
                <div className="space-y-0.5">
                  {analysisScores.slice(0, 8).map(([abbrev, data], rank) => {
                    const maxScore = analysisScores[0]?.[1].total || 1
                    const pct = (data.total / maxScore) * 100
                    return (
                      <div key={abbrev} className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-bold shrink-0"
                          style={{ width: 44, color: rank === 0 ? 'var(--sim-green)' : 'var(--sim-text-sec)' }}
                        >
                          {abbrev}
                        </span>
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--sim-border)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: rank === 0 ? 'var(--sim-green)' : rank < 3 ? '#6aad89' : '#b0a898' }}
                          />
                        </div>
                        <span className="text-[12px] font-bold shrink-0" style={{ width: 18, textAlign: 'right', color: 'var(--sim-text-sec)' }}>
                          {data.total}
                        </span>
                        {onAssignRemedy && (
                          <button
                            data-tour="mini-assign"
                            onClick={() => { onAssignRemedy(abbrev); onClose() }}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: rank === 0 ? 'var(--sim-green)' : 'rgba(45,106,79,0.08)', color: rank === 0 ? '#fff' : 'var(--sim-green)', border: '1px solid rgba(45,106,79,0.2)' }}
                          >
                            {repoLang === 'ru' ? 'Назначить' : 'Assign'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Классический вид — таблица по образцу Synthesis */
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-[12px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--sim-border)' }}>
                        <th className="text-left py-1 pr-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-text-hint)', fontSize: '10px' }}>
                          {repoLang === 'ru' ? 'Преп.' : 'Remedy'}
                        </th>
                        <th className="text-center py-1 px-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-text-hint)', fontSize: '10px' }}>∑{repoLang === 'ru' ? 'Сим' : 'Sym'}</th>
                        <th className="text-center py-1 px-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-text-hint)', fontSize: '10px' }}>∑{repoLang === 'ru' ? 'Степ' : 'Deg'}</th>
                        <th className="text-left py-1 pl-1 font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-text-hint)', fontSize: '10px' }}>
                          {repoLang === 'ru' ? 'Симпт.' : 'Sympt.'}
                        </th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisScores.slice(0, 12).map(([abbrev, data], rank) => {
                        const symptoms = data.coverage
                          .map((g, i) => g > 0 ? i + 1 : null)
                          .filter(Boolean)
                          .join(', ')
                        return (
                          <tr key={abbrev} style={{ borderBottom: '1px solid #e8e0d4' }}>
                            <td className="py-1 pr-1 font-bold" style={{ color: rank === 0 ? 'var(--sim-green)' : 'var(--sim-text-sec)' }}>
                              {abbrev}
                            </td>
                            <td className="text-center py-1 px-1" style={{ color: 'var(--sim-text-sec)' }}>
                              {data.coveredCount}
                            </td>
                            <td className="text-center py-1 px-1 font-bold" style={{ color: 'var(--sim-text-sec)' }}>
                              {data.total}
                            </td>
                            <td className="py-1 pl-1" style={{ color: 'var(--sim-text-hint)' }}>
                              {symptoms}
                            </td>
                            <td className="py-1 text-right">
                              {onAssignRemedy && (
                                <button
                                  data-tour="mini-assign"
                                  onClick={() => { onAssignRemedy(abbrev); onClose() }}
                                  className="px-1.5 py-0.5 rounded text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                                  style={{ backgroundColor: rank === 0 ? 'var(--sim-green)' : 'rgba(45,106,79,0.08)', color: rank === 0 ? '#fff' : 'var(--sim-green)', border: '1px solid rgba(45,106,79,0.2)' }}
                                >
                                  Rx
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Результаты поиска */}
      <div data-tour="mini-results" className={`flex-1 overflow-y-auto${tutStep === 2 ? ' mini-tut-glow' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--sim-green)', borderTopColor: 'transparent' }} />
          </div>
        ) : rubrics.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-[12px]" style={{ color: searchError ? '#dc2626' : 'var(--sim-text-muted)' }}>
            {searchError
              ? (lang === 'ru' ? 'Ошибка соединения. Проверьте интернет.' : 'Connection error. Check your internet.')
              : t(lang).miniRepertory.notFound}
          </div>
        ) : (
          <div style={{ borderColor: '#e8e0d4' }}>
            {rubrics.map(r => {
              const isExpanded = expandedRubricId === r.id
              const inAnalysis = isInAnalysis(r.id)
              return (
                <div key={r.id} style={{ borderBottom: '1px solid var(--sim-bg-card, #f5f0e8)' }}>
                  <div className="flex items-start gap-1 px-3 py-2.5 group transition-colors hover:bg-[rgba(45,106,79,0.04)]" style={{ backgroundColor: inAnalysis ? 'rgba(45,106,79,0.06)' : 'transparent' }}>
                    {/* Кнопка добавить в анализ */}
                    <button
                      data-tour="mini-add-btn"
                      onClick={() => inAnalysis ? removeFromAnalysis(r.id) : addToAnalysis(r)}
                      aria-label={inAnalysis ? (lang === 'ru' ? 'Убрать из анализа' : 'Remove from analysis') : (lang === 'ru' ? 'Добавить в анализ' : 'Add to analysis')}
                      className="shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5 transition-all"
                      style={{
                        backgroundColor: inAnalysis ? 'var(--sim-green)' : 'transparent',
                        border: `1px solid ${inAnalysis ? 'var(--sim-green)' : 'var(--sim-border)'}`,
                        color: inAnalysis ? 'white' : 'var(--sim-text-muted)',
                        ...((tutStep === 3 && !inAnalysis) ? {
                          outline: '2px solid #2d6a4f',
                          outlineOffset: 2,
                          boxShadow: '0 0 12px rgba(45,106,79,0.4)',
                        } : {}),
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
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="shrink-0 mt-0.5 px-1 py-0 rounded text-[12px] font-semibold" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--sim-green)' }}>
                            {repoLang === 'ru' ? (CHAPTER_NAMES[r.chapter] || r.chapter) : r.chapter}
                          </span>
                          <p className="text-[12px] leading-snug" style={{ color: 'var(--sim-text)' }}>
                            {repoLang === 'ru'
                              ? translateRubric(r.fullpath, r.chapter)
                              : (r.fullpath.startsWith(r.chapter + ', ') ? r.fullpath.slice(r.chapter.length + 2) : r.fullpath)
                            }
                          </p>
                        </div>
                        <span className="text-[12px] shrink-0 mt-0.5" style={{ color: 'var(--sim-text-hint)' }}>{r.remedy_count}</span>
                      </div>
                      {!isExpanded && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {r.remedies.slice(0, 7).map((rem, i) => (
                            <span
                              key={i}
                              style={{
                                color: rem.grade >= 3 ? 'var(--sim-green)' : rem.grade === 2 ? '#1c1a14' : '#9a9a8a',
                                fontWeight: rem.grade >= 3 ? 700 : rem.grade === 2 ? 500 : 400,
                                fontStyle: rem.grade === 2 ? 'italic' : 'normal',
                                fontSize: rem.grade >= 3 ? '12px' : '11px',
                              }}
                            >
                              {rem.abbrev}
                            </span>
                          ))}
                          {r.remedy_count > 7 && <span className="text-[12px]" style={{ color: 'var(--sim-text-hint)' }}>+{r.remedy_count - 7}</span>}
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Раскрытый вид */}
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1" style={{ backgroundColor: 'rgba(45,106,79,0.03)', borderTop: '1px solid var(--sim-bg-card, #f5f0e8)' }}>
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
                            <span style={{ color: rem.grade >= 3 ? 'var(--sim-green)' : rem.grade === 2 ? '#1c1a14' : '#9a9a8a', fontWeight: rem.grade >= 3 ? 700 : rem.grade === 2 ? 500 : 400, fontStyle: rem.grade === 2 ? 'italic' : 'normal', fontSize: rem.grade >= 3 ? '12px' : '11px' }}>
                              {rem.abbrev}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => { onSelectRubric(r.fullpath); setExpandedRubricId(null) }}
                        className="text-[12px] flex items-center gap-1 transition-colors"
                        style={{ color: 'var(--sim-text-hint)' }}
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
        <div className="px-4 py-1.5 border-t shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card, #f5f0e8)' }}>
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="text-[12px] disabled:opacity-30"
            style={{ color: 'var(--sim-text-hint)' }}
          >
            ← {t(lang).miniRepertory.prev}
          </button>
          <span className="text-[12px]" style={{ color: 'var(--sim-text-hint)' }}>{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="text-[12px] disabled:opacity-30"
            style={{ color: 'var(--sim-text-hint)' }}
          >
            {t(lang).miniRepertory.next} →
          </button>
        </div>
      )}
    </div>
  )
}
