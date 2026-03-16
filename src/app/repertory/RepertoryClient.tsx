'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { searchRepertory, getPatientsSimple, type RepertoryRubric } from '@/lib/actions/repertory'
import { translateRubric } from '@/lib/repertory-translations'
import { useLanguage } from '@/hooks/useLanguage'

// ── Цветовая схема V3 ─────────────────────────────────────────────
const C = {
  bg: '#f7f3ed',
  sidebar: '#f2ece4',
  header: '#1a3020',
  link: '#2d6a4f',
  border: '#d4c9b8',
  borderLight: '#e0d8cc',
  text: '#1a1a0a',
  secondary: '#5a5040',
  muted: '#9a8a6a',
}

// ── Группы разделов ───────────────────────────────────────────────
const SECTION_GROUPS = [
  { label: 'Все разделы', chapters: [] as string[] },
  { label: 'Психика', chapters: ['Mind'] },
  { label: 'Голова', chapters: ['Head', 'Vertigo'] },
  { label: 'Глаза · Уши', chapters: ['Eye', 'Vision', 'Ear', 'Hearing'] },
  { label: 'Нос · Лицо · Рот', chapters: ['Nose', 'Face', 'Mouth', 'Teeth'] },
  { label: 'Горло · Грудь', chapters: ['Throat', 'External throat', 'Larynx and trachea', 'Respiration', 'Cough', 'Expectoration', 'Chest', 'Heart & Circulation'] },
  { label: 'Желудок · Живот', chapters: ['Stomach', 'Appetite', 'Abdomen', 'Rectum', 'Stool', 'Bladder', 'Kidneys', 'Urethra', 'Prostate gland', 'Urine', 'Genitalia male', 'Genitalia female'] },
  { label: 'Спина · Конечности', chapters: ['Back', 'Extremities'] },
  { label: 'Сон · Жар', chapters: ['Sleep', 'Chill', 'Fever', 'Perspiration'] },
  { label: 'Кожа · Общее', chapters: ['Skin', 'Generalities', 'Blood', 'Clinical'] },
]

const RECENT_KEY = 'hc-recent-rubrics'
const MAX_RECENT = 10

type AnalysisEntry = { rubric: RepertoryRubric; weight: 1 | 2 | 3 }

type PrescribeModal = {
  abbrev: string
  name: string
  potency: string
  form: 'granules' | 'drops' | 'powder'
  scheme: string
  duration: string
} | null

type Props = {
  initialRubrics: RepertoryRubric[]
  initialTotal: number
  initialQuery: string
}

export default function RepertoryClient({ initialRubrics, initialTotal, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [groupIndex, setGroupIndex] = useState(1) // default: Психика
  const [rubrics, setRubrics] = useState(initialRubrics)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  // Checkbox = expanded (показать препараты)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // Анализ
  const [analysisEntries, setAnalysisEntries] = useState<AnalysisEntry[]>([])
  const [showAnalysis, setShowAnalysis] = useState(true)

  // Недавно использованные
  const [recentRubrics, setRecentRubrics] = useState<RepertoryRubric[]>([])

  // Клавиатурная навигация
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Модал "Выписать"
  const [prescribeModal, setPrescribeModal] = useState<PrescribeModal>(null)

  // Контекст кнопки "В консультацию"
  const [lastConsultation, setLastConsultation] = useState<string | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<{ id: string; name: string; lastVisit: string | null }[]>([])
  const [patientsLoading, setPatientsLoading] = useState(false)

  const { lang } = useLanguage()
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Загружаем недавние из localStorage + контекст консультации
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) setRecentRubrics(JSON.parse(stored))
    } catch {}
    const last = localStorage.getItem('hc-last-consultation')
    setLastConsultation(last)
  }, [])

  // ── Топ препаратов из текущей выдачи (для шапки) ─────────────────
  const headerTopRemedies = useMemo(() => {
    const scores: Record<string, { total: number; maxGrade: number }> = {}
    rubrics.forEach(r => {
      r.remedies.forEach(rem => {
        if (!scores[rem.abbrev]) scores[rem.abbrev] = { total: 0, maxGrade: 0 }
        scores[rem.abbrev].total += Number(rem.grade)
        scores[rem.abbrev].maxGrade = Math.max(scores[rem.abbrev].maxGrade, Number(rem.grade))
      })
    })
    const sorted = Object.entries(scores).sort((a, b) => b[1].total - a[1].total)
    return { top: sorted.slice(0, 15), extra: Math.max(0, sorted.length - 15) }
  }, [rubrics])

  // ── Рейтинг препаратов по добавленным рубрикам ───────────────────
  const analysisScores = useMemo(() => {
    const scores: Record<string, { name: string; total: number }> = {}
    analysisEntries.forEach(ae => {
      ae.rubric.remedies.forEach(r => {
        if (!scores[r.abbrev]) scores[r.abbrev] = { name: r.name, total: 0 }
        scores[r.abbrev].total += Number(r.grade) * ae.weight
      })
    })
    return Object.entries(scores).sort((a, b) => b[1].total - a[1].total).slice(0, 20)
  }, [analysisEntries])

  async function loadRubrics(q: string, gIdx: number, pg: number) {
    setLoading(true)
    setFocusedIndex(-1)
    const chapters = SECTION_GROUPS[gIdx].chapters
    const { rubrics: r, total: t } = await searchRepertory(q, chapters, 'publicum', pg)
    setRubrics(r)
    setTotal(t)
    setPage(pg)
    setLoading(false)
  }

  function handleQueryChange(v: string) {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadRubrics(v, groupIndex, 0), 300)
  }

  function handleGroupChange(idx: number) {
    setGroupIndex(idx)
    loadRubrics(query, idx, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      handleQueryChange('')
      setFocusedIndex(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, rubrics.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = focusedIndex >= 0 ? rubrics[focusedIndex] : rubrics[0]
      if (target) addToAnalysis(target)
    }
  }

  function addToAnalysis(rubric: RepertoryRubric) {
    if (analysisEntries.find(ae => ae.rubric.id === rubric.id)) return
    setAnalysisEntries(prev => [...prev, { rubric, weight: 1 }])
    setShowAnalysis(true)

    // Сохраняем в недавние
    setRecentRubrics(prev => {
      const next = [rubric, ...prev.filter(r => r.id !== rubric.id)].slice(0, MAX_RECENT)
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  function removeFromAnalysis(id: number) {
    setAnalysisEntries(prev => prev.filter(ae => ae.rubric.id !== id))
  }

  function setWeight(id: number, weight: 1 | 2 | 3) {
    setAnalysisEntries(prev => prev.map(ae => ae.rubric.id === id ? { ...ae, weight } : ae))
  }

  function toggleExpand(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function localize(r: RepertoryRubric): string {
    if (lang === 'en') {
      const prefix = r.chapter + ', '
      return r.fullpath.startsWith(prefix) ? r.fullpath.slice(prefix.length) : r.fullpath
    }
    // Если есть предварительный перевод из БД — используем его (быстрее и полнее)
    if (r.fullpath_ru) return r.fullpath_ru
    return translateRubric(r.fullpath, r.chapter)
  }

  async function openPatientModal() {
    setShowPatientModal(true)
    setPatientSearch('')
    if (patients.length === 0) {
      setPatientsLoading(true)
      const list = await getPatientsSimple()
      setPatients(list)
      setPatientsLoading(false)
    }
  }

  function openPrescribeModal(abbrev: string, name: string) {
    setPrescribeModal({ abbrev, name, potency: '30C', form: 'granules', scheme: '', duration: '' })
  }

  function savePrescriptionToConsultation() {
    if (!prescribeModal) return
    const { abbrev, potency, scheme, duration } = prescribeModal
    const dosage = [scheme, duration].filter(Boolean).join('. ')
    localStorage.setItem('hc-pending-prescription', JSON.stringify({ abbrev, potency, dosage }))
    const last = localStorage.getItem('hc-last-consultation')
    window.location.href = last || '/patients'
  }

  function goSelectPatient() {
    if (!prescribeModal) return
    const { abbrev, potency, scheme, duration } = prescribeModal
    const dosage = [scheme, duration].filter(Boolean).join('. ')
    localStorage.setItem('hc-pending-prescription', JSON.stringify({ abbrev, potency, dosage }))
    window.location.href = '/patients'
  }

  const totalPages = Math.ceil(total / 30)
  const isInAnalysis = (id: number) => analysisEntries.some(ae => ae.rubric.id === id)

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: 'Inter, sans-serif', backgroundColor: C.bg }}
    >
      {/* ══════════════════════════════════════════
          ШАПКА
      ══════════════════════════════════════════ */}
      <div className="shrink-0" style={{ backgroundColor: C.header }}>

        {/* Строка 1: Поиск + кнопка */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Поиск симптома... тревога, fear, боль ночью"
              className="w-full pl-10 pr-4 py-2.5 text-base rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.90)',
                outline: 'none',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
            {query && (
              <>
                <span
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded pointer-events-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.30)' }}
                >
                  [Enter] добавить
                </span>
                <button
                  onPointerDown={() => handleQueryChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {/* Кнопка "В консультацию" / "Вернуться к консультации" */}
          <button
            className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap"
            style={{
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.65)',
              backgroundColor: 'rgba(255,255,255,0.07)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
            onPointerDown={() => {
              window.location.href = lastConsultation || '/dashboard'
            }}
          >
            {lastConsultation ? (
              <>
                <span>←</span>
                <span className="hidden sm:inline">К консультации</span>
              </>
            ) : (
              <>
                <span>←</span>
                <span className="hidden sm:inline">На главную</span>
              </>
            )}
          </button>
        </div>

        {/* Строка 2: Живые топ-препараты */}
        <div className="px-4 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          >
            <span className="shrink-0 text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Топ сейчас:
            </span>
            <div className="flex items-baseline gap-x-2.5 gap-y-0.5 flex-wrap flex-1 min-w-0">
              {loading ? (
                <span className="text-[11px] animate-pulse" style={{ color: 'rgba(255,255,255,0.20)' }}>
                  загрузка...
                </span>
              ) : headerTopRemedies.top.length === 0 ? (
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                  нет данных
                </span>
              ) : (
                <>
                  {headerTopRemedies.top.map(([abbrev, data]) => (
                    <span
                      key={abbrev}
                      className="cursor-default"
                      style={{
                        color: data.maxGrade >= 3 ? '#7dd4a8' : data.maxGrade === 2 ? '#b8e0cc' : 'rgba(255,255,255,0.30)',
                        fontWeight: data.maxGrade >= 3 ? 700 : data.maxGrade === 2 ? 500 : 400,
                        fontSize: data.maxGrade >= 3 ? '13px' : data.maxGrade === 2 ? '12px' : '10px',
                        textTransform: data.maxGrade >= 3 ? 'uppercase' : 'none',
                        letterSpacing: data.maxGrade >= 3 ? '0.03em' : 'normal',
                      }}
                    >
                      {abbrev}
                    </span>
                  ))}
                  {headerTopRemedies.extra > 0 && (
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                      +{headerTopRemedies.extra} ещё
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Строка 3: Чипы разделов */}
        <div
          className="flex gap-1.5 overflow-x-auto px-4 pb-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {SECTION_GROUPS.map((group, idx) => (
            <button
              key={idx}
              onPointerDown={() => handleGroupChange(idx)}
              className="shrink-0 px-3 py-1.5 text-[13px] rounded-full border transition-all whitespace-nowrap"
              style={{
                borderColor: groupIndex === idx ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)',
                backgroundColor: groupIndex === idx ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: groupIndex === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.40)',
                fontWeight: groupIndex === idx ? 600 : 400,
              }}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ТЕЛО СТРАНИЦЫ
      ══════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ─ Колонка рубрик ─────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Недавно использованные */}
          {recentRubrics.length > 0 && (
            <div
              className="shrink-0 px-4 py-2.5 border-b"
              style={{ backgroundColor: C.sidebar, borderColor: C.borderLight }}
            >
              <p
                className="text-[12px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: C.muted }}
              >
                Недавно использованные
              </p>
              <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {recentRubrics.map(r => {
                  const inA = isInAnalysis(r.id)
                  const name = localize(r).split(', ').slice(0, 2).join(', ')
                  return (
                    <button
                      key={r.id}
                      onPointerDown={() => addToAnalysis(r)}
                      className="shrink-0 px-2.5 py-1 text-[13px] rounded-full border transition-all whitespace-nowrap"
                      style={{
                        borderColor: inA ? C.link : C.border,
                        borderWidth: inA ? 1.5 : 1,
                        color: inA ? C.link : C.secondary,
                        backgroundColor: inA ? 'rgba(45,106,79,0.06)' : 'white',
                      }}
                      title={r.fullpath}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Строка-заголовок раздела */}
          <div
            className="shrink-0 px-4 py-2 border-b flex items-center justify-between"
            style={{ borderColor: C.borderLight, backgroundColor: C.bg }}
          >
            <p className="text-[14px]" style={{ color: C.muted }}>
              {loading ? (
                <span className="animate-pulse">Загрузка...</span>
              ) : query ? (
                <>
                  Результаты поиска:&nbsp;
                  <span style={{ color: C.text }}>«{query}»</span>
                  &nbsp;·&nbsp;
                  <span style={{ color: C.link }}>{total.toLocaleString('ru-RU')}</span>
                  &nbsp;рубрик
                </>
              ) : (
                <>
                  <span style={{ fontStyle: 'italic', color: C.text, fontFamily: 'Georgia, serif' }}>
                    {SECTION_GROUPS[groupIndex].label}
                  </span>
                  &nbsp;·&nbsp;
                  <span style={{ color: C.link }}>{total.toLocaleString('ru-RU')}</span>
                  &nbsp;рубрик
                </>
              )}
            </p>

            {/* Кнопка анализа на мобильном */}
            <button
              className="lg:hidden flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border"
              style={{ borderColor: C.border, color: analysisEntries.length > 0 ? C.link : C.muted }}
              onPointerDown={() => setShowAnalysis(v => !v)}
            >
              Анализ
              {analysisEntries.length > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: C.link }}
                >
                  {analysisEntries.length}
                </span>
              )}
            </button>
          </div>

          {/* Список рубрик */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-2 space-y-px">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded animate-pulse"
                    style={{ backgroundColor: C.borderLight }}
                  />
                ))}
              </div>
            ) : rubrics.length === 0 ? (
              <div className="text-center py-16" style={{ color: C.muted }}>
                <p className="text-sm">Нет рубрик по вашему запросу</p>
                {query && (
                  <button
                    onPointerDown={() => handleQueryChange('')}
                    className="mt-2 text-sm underline"
                    style={{ color: C.link }}
                  >
                    Очистить поиск
                  </button>
                )}
              </div>
            ) : (
              <>
                {rubrics.map((rubric, idx) => (
                  <RubricRow
                    key={rubric.id}
                    rubric={rubric}
                    localName={localize(rubric)}
                    isExpanded={expandedIds.has(rubric.id)}
                    inAnalysis={isInAnalysis(rubric.id)}
                    isFocused={focusedIndex === idx}
                    onToggleExpand={() => toggleExpand(rubric.id)}
                    onAddToAnalysis={() => addToAnalysis(rubric)}
                  />
                ))}

                {/* Пагинация */}
                {totalPages > 1 && (
                  <div
                    className="flex items-center justify-center gap-4 py-4 border-t"
                    style={{ borderColor: C.borderLight }}
                  >
                    <button
                      onPointerDown={() => loadRubrics(query, groupIndex, page - 1)}
                      disabled={page === 0}
                      className="px-4 py-1.5 text-sm border rounded disabled:opacity-30 transition-colors"
                      style={{ borderColor: C.border, color: C.link }}
                    >
                      ← Пред.
                    </button>
                    <span className="text-sm" style={{ color: C.muted }}>
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onPointerDown={() => loadRubrics(query, groupIndex, page + 1)}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-1.5 text-sm border rounded disabled:opacity-30 transition-colors"
                      style={{ borderColor: C.border, color: C.link }}
                    >
                      След. →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─ Панель анализа (260px) ─────────────── */}
        <div
          className={`shrink-0 flex-col border-l bg-white ${showAnalysis ? 'flex' : 'hidden'} lg:flex`}
          style={{ width: 260, borderColor: C.border }}
        >
          {/* Заголовок */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: C.borderLight }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                Анализ
              </span>
              {analysisEntries.length > 0 && (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white"
                  style={{ backgroundColor: C.link }}
                >
                  {analysisEntries.length}
                </span>
              )}
            </div>
            <button
              className="lg:hidden text-sm"
              style={{ color: C.muted }}
              onPointerDown={() => setShowAnalysis(false)}
            >
              ✕
            </button>
          </div>

          {analysisEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}
              >
                <svg className="w-5 h-5" style={{ color: C.link }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: C.secondary }}>
                Добавьте рубрики
              </p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: C.muted }}>
                Нажмите [+] у рубрики или Enter в поиске
              </p>
            </div>
          ) : (
            <>
            <div className="flex-1 min-h-0 overflow-y-auto">

              {/* Добавленные рубрики с весами */}
              <div className="p-3 space-y-1.5 border-b" style={{ borderColor: C.borderLight }}>
                {analysisEntries.map(ae => (
                  <div
                    key={ae.rubric.id}
                    className="flex items-start gap-1.5 rounded-lg px-2 py-1.5"
                    style={{
                      backgroundColor: 'rgba(45,106,79,0.05)',
                      borderLeft: `3px solid ${C.link}`,
                    }}
                  >
                    <span
                      className="flex-1 text-[13px] leading-relaxed min-w-0 break-words"
                      style={{ color: C.text }}
                    >
                      {localize(ae.rubric).split(', ').slice(0, 3).join(', ')}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                      {([1, 2, 3] as const).map(w => (
                        <button
                          key={w}
                          onPointerDown={() => setWeight(ae.rubric.id, w)}
                          className="w-5 h-5 rounded text-[10px] font-bold transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: ae.weight === w ? C.link : 'transparent',
                            color: ae.weight === w ? 'white' : C.muted,
                            border: `1px solid ${ae.weight === w ? C.link : C.border}`,
                          }}
                          title={`Вес ×${w}`}
                        >
                          {w}
                        </button>
                      ))}
                      <button
                        onPointerDown={() => removeFromAnalysis(ae.rubric.id)}
                        className="ml-0.5 w-4 h-4 flex items-center justify-center text-[11px]"
                        style={{ color: C.muted }}
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Топ препаратов */}
              {analysisScores.length > 0 && (
                <div className="p-3 flex-1">
                  <p
                    className="text-[12px] font-semibold uppercase tracking-widest mb-3"
                    style={{ color: C.muted }}
                  >
                    Топ препаратов
                  </p>
                  <div className="space-y-1.5">
                    {analysisScores.slice(0, 15).map(([abbrev, data], rank) => {
                      const maxScore = analysisScores[0]?.[1].total || 1
                      const pct = (data.total / maxScore) * 100
                      return (
                        <div key={abbrev} className="group flex items-center gap-1.5">
                          <span
                            className="text-[13px] font-semibold shrink-0"
                            style={{
                              width: 50,
                              color: rank === 0 ? C.link : C.text,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {abbrev}
                          </span>
                          <div
                            className="flex-1 rounded-full overflow-hidden"
                            style={{ height: 5, backgroundColor: '#e8e0d4' }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: rank === 0 ? C.link : '#9ca3af',
                              }}
                            />
                          </div>
                          <span
                            className="text-[13px] font-bold shrink-0"
                            style={{ width: 16, textAlign: 'right', color: C.secondary }}
                          >
                            {data.total}
                          </span>
                          <button
                            type="button"
                            onPointerDown={() => openPrescribeModal(abbrev, data.name)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[13px] rounded"
                            style={{
                              border: `1px solid ${C.link}`,
                              color: C.link,
                              backgroundColor: 'transparent',
                              padding: '2px 6px',
                              lineHeight: 1.4,
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = C.link
                              e.currentTarget.style.color = 'white'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = C.link
                            }}
                          >
                            Rx
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Кнопка "Очистить" внизу */}
            {analysisEntries.length > 0 && (
              <div className="p-3 border-t shrink-0" style={{ borderColor: C.borderLight }}>
                <button
                  className="w-full py-2 text-sm rounded-lg transition-colors border"
                  style={{ borderColor: C.border, color: C.secondary, backgroundColor: 'transparent' }}
                  onPointerDown={() => setAnalysisEntries([])}
                >
                  Очистить
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          МОДАЛ ВЫБОРА ПАЦИЕНТА
      ══════════════════════════════════════════ */}
      {showPatientModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPointerDown={e => { if (e.target === e.currentTarget) setShowPatientModal(false) }}
        >
          <div
            className="w-full flex flex-col"
            style={{ maxWidth: 400, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', maxHeight: '80vh', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            {/* Заголовок */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <h2 className="text-base font-semibold text-gray-900">Выбрать пациента</h2>
              <button
                onPointerDown={() => setShowPatientModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Поиск */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <input
                type="text"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                placeholder="Поиск по имени..."
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Список */}
            <div className="flex-1 overflow-y-auto">
              {patientsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : patients.filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">Пациенты не найдены</div>
              ) : (
                patients
                  .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      onPointerDown={() => { window.location.href = `/patients/${p.id}` }}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: '1px solid #f7f7f7' }}
                    >
                      <span className="text-sm font-medium text-gray-900">{p.name}</span>
                      {p.lastVisit && (
                        <span className="text-xs text-gray-400 shrink-0 ml-3">
                          {new Date(p.lastVisit).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </button>
                  ))
              )}
            </div>

            {/* Отмена */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid #f0f0f0' }}>
              <button
                onPointerDown={() => setShowPatientModal(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          МОДАЛ "ВЫПИСАТЬ"
      ══════════════════════════════════════════ */}
      {prescribeModal && (
        <PrescribeModalDialog
          modal={prescribeModal}
          onChange={setPrescribeModal}
          onSaveToConsultation={savePrescriptionToConsultation}
          onSelectPatient={goSelectPatient}
          onClose={() => setPrescribeModal(null)}
        />
      )}
    </div>
  )
}

// ── Строка рубрики ─────────────────────────────────────────────────
function RubricRow({
  rubric, localName, isExpanded, inAnalysis, isFocused,
  onToggleExpand, onAddToAnalysis,
}: {
  rubric: RepertoryRubric
  localName: string
  isExpanded: boolean
  inAnalysis: boolean
  isFocused: boolean
  onToggleExpand: () => void
  onAddToAnalysis: () => void
}) {
  const depth = Math.max(0, rubric.fullpath.split(',').length - 2)
  const indent = depth * 16

  const segments = localName.split(', ')
  const firstWord = segments[0].toUpperCase()
  const rest = segments.length > 1 ? ', ' + segments.slice(1).join(', ') : ''

  const grade3 = rubric.remedies.filter(r => r.grade >= 3)
  const grade2 = rubric.remedies.filter(r => r.grade === 2)
  const grade1 = rubric.remedies.filter(r => r.grade <= 1)

  const showRemedies = isExpanded || inAnalysis

  return (
    <div
      className="group border-b"
      style={{
        borderColor: '#e8e4dc',
        borderLeftWidth: inAnalysis ? 3 : 0,
        borderLeftColor: C.link,
        backgroundColor: isFocused
          ? '#e8f0e8'
          : inAnalysis
            ? 'rgba(45,106,79,0.05)'
            : 'transparent',
      }}
    >
      {/* Основная строка 36px */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        style={{ paddingLeft: 12 + indent, paddingRight: 8, height: 36 }}
        onPointerDown={onToggleExpand}
      >
        {/* Чекбокс */}
        <div
          className="shrink-0 w-4 h-4 flex items-center justify-center transition-all"
          style={{
            border: `1.5px solid ${isExpanded ? C.link : '#c4b89a'}`,
            backgroundColor: isExpanded ? C.link : 'transparent',
            borderRadius: 4,
            width: 16, height: 16,
          }}
        >
          {isExpanded && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        {/* Название рубрики */}
        <span
          className="flex-1 text-[15px] leading-tight min-w-0 truncate"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <span className="font-bold" style={{ color: '#1a3020' }}>{firstWord}</span>
          {rest && <span style={{ color: '#3a3020' }}>{rest}</span>}
        </span>

        {/* Кнопка [+] — добавить в анализ */}
        <button
          type="button"
          onPointerDown={e => { e.stopPropagation(); onAddToAnalysis() }}
          className="shrink-0 flex items-center justify-center transition-all opacity-40 group-hover:opacity-100"
          style={{
            width: 20, height: 20,
            backgroundColor: inAnalysis ? '#1a7a40' : C.link,
            borderRadius: 4,
          }}
          title={inAnalysis ? 'Уже в анализе' : 'Добавить в анализ'}
        >
          {inAnalysis ? (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
        </button>

        {/* Счётчик */}
        <span
          className="shrink-0 text-[13px] text-right"
          style={{ width: 28, color: '#9a8a6a' }}
        >
          {rubric.remedy_count}
        </span>

        {/* Стрелка */}
        <span
          className="shrink-0 text-[13px] transition-transform duration-150 inline-block"
          style={{ color: '#9a8a6a', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
        >
          ›
        </span>
      </div>

      {/* Развёрнутые препараты */}
      {showRemedies && (
        <div
          className="pb-2 leading-relaxed"
          style={{
            paddingLeft: 14 + indent + 24,
            paddingRight: 8,
            fontSize: isExpanded ? undefined : '11px',
          }}
        >
          {grade3.map(r => (
            <span
              key={r.abbrev}
              className={`mr-2 cursor-pointer hover:underline font-bold uppercase`}
              style={{ fontSize: isExpanded ? '15px' : '13px', color: '#1a3020' }}
              title={r.name}
            >
              {r.abbrev}
            </span>
          ))}
          {grade2.map(r => (
            <span
              key={r.abbrev}
              className="mr-1.5 cursor-pointer hover:underline font-bold"
              style={{ fontSize: isExpanded ? '14px' : '12px', color: '#2a2010' }}
              title={r.name}
            >
              {r.abbrev}
            </span>
          ))}
          {(isExpanded ? grade1 : grade1.slice(0, 0)).map(r => (
            <span
              key={r.abbrev}
              className="mr-1 cursor-pointer hover:underline"
              style={{ fontSize: '13px', color: '#8a8070' }}
              title={r.name}
            >
              {r.abbrev}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Модал "Выписать препарат" ──────────────────────────────────────
const POTENCIES = ['6C', '12C', '30C', '200C', '1M', '10M', 'LM1', 'LM2', 'LM3']
const DURATIONS = ['1 неделя', '2 недели', '1 месяц', 'до улучшения']
const FORMS = [
  { value: 'granules', label: 'Гранулы' },
  { value: 'drops',    label: 'Капли'   },
  { value: 'powder',   label: 'Порошок' },
] as const

function PrescribeModalDialog({
  modal, onChange, onSaveToConsultation, onSelectPatient, onClose,
}: {
  modal: NonNullable<PrescribeModal>
  onChange: (m: PrescribeModal) => void
  onSaveToConsultation: () => void
  onSelectPatient: () => void
  onClose: () => void
}) {
  const hasActiveConsultation = typeof window !== 'undefined' && !!localStorage.getItem('hc-last-consultation')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#f7f3ed', border: '1px solid #d4c9b8' }}
      >
        {/* Заголовок */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #e0d8cc' }}>
          <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#9a8a6a' }}>Назначение</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 26, fontWeight: 600, color: '#1a3020', lineHeight: 1.2 }}>
            Выписать {modal.name || modal.abbrev}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Потенция */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#5a5040' }}>
              Потенция
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {POTENCIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onPointerDown={() => onChange({ ...modal, potency: p })}
                  className="px-3 py-1.5 text-xs rounded-lg border transition-all"
                  style={{
                    borderColor: modal.potency === p ? '#1a3020' : '#d4c9b8',
                    backgroundColor: modal.potency === p ? '#1a3020' : 'white',
                    color: modal.potency === p ? 'white' : '#5a5040',
                    fontWeight: modal.potency === p ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Форма */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#5a5040' }}>
              Форма
            </label>
            <div className="flex gap-2">
              {FORMS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onPointerDown={() => onChange({ ...modal, form: f.value })}
                  className="flex-1 py-2 text-xs rounded-lg border transition-all"
                  style={{
                    borderColor: modal.form === f.value ? '#1a3020' : '#d4c9b8',
                    backgroundColor: modal.form === f.value ? '#1a3020' : 'white',
                    color: modal.form === f.value ? 'white' : '#5a5040',
                    fontWeight: modal.form === f.value ? 600 : 400,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Схема */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#5a5040' }}>
              Схема приёма
            </label>
            <input
              type="text"
              value={modal.scheme}
              onChange={e => onChange({ ...modal, scheme: e.target.value })}
              placeholder="3 гранулы под язык, 1 раз в день"
              className="w-full px-3 py-2.5 text-sm rounded-lg"
              style={{
                border: '1px solid #d4c9b8',
                backgroundColor: 'white',
                color: '#1a1a0a',
                outline: 'none',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1a3020')}
              onBlur={e => (e.currentTarget.style.borderColor = '#d4c9b8')}
            />
          </div>

          {/* Длительность */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#5a5040' }}>
              Длительность
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onPointerDown={() => onChange({ ...modal, duration: modal.duration === d ? '' : d })}
                  className="px-3 py-1.5 text-xs rounded-lg border transition-all"
                  style={{
                    borderColor: modal.duration === d ? '#1a3020' : '#d4c9b8',
                    backgroundColor: modal.duration === d ? '#1a3020' : 'white',
                    color: modal.duration === d ? 'white' : '#5a5040',
                    fontWeight: modal.duration === d ? 600 : 400,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-6 pb-6 space-y-2" style={{ borderTop: '1px solid #e0d8cc', paddingTop: 16 }}>
          {hasActiveConsultation && (
            <button
              type="button"
              onPointerDown={onSaveToConsultation}
              className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ backgroundColor: '#1a3020' }}
            >
              Сохранить в текущую консультацию
            </button>
          )}
          <button
            type="button"
            onPointerDown={onSelectPatient}
            className="w-full py-2.5 text-sm font-medium rounded-xl border transition-colors"
            style={{
              borderColor: '#1a3020',
              color: '#1a3020',
              backgroundColor: hasActiveConsultation ? 'transparent' : '#1a3020',
              ...(hasActiveConsultation ? {} : { color: 'white' }),
            }}
          >
            Выбрать пациента и консультацию
          </button>
          <button
            type="button"
            onPointerDown={onClose}
            className="w-full py-2 text-sm rounded-xl transition-colors"
            style={{ color: '#9a8a6a', backgroundColor: 'transparent' }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
