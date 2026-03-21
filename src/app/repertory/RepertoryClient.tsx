'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { searchRepertory, getPatientsSimple, getPatientConsultationsSimple, type RepertoryRubric } from '@/lib/actions/repertory'
import { saveRepertoryData } from '@/lib/actions/consultations'
import { translateRubric } from '@/lib/repertory-translations'
import { useLanguage } from '@/hooks/useLanguage'
import { t } from '@/lib/i18n'
import FirstTimeHint from '@/components/FirstTimeHint'
import RepertoryTutorialPanel, { type TutorialStep } from './RepertoryTutorialPanel'

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
  { ru: 'Все разделы', en: 'All sections', chapters: [] as string[] },
  { ru: 'Психика', en: 'Mind', chapters: ['Mind'] },
  { ru: 'Голова', en: 'Head', chapters: ['Head', 'Vertigo'] },
  { ru: 'Глаза · Уши', en: 'Eyes · Ears', chapters: ['Eye', 'Vision', 'Ear', 'Hearing'] },
  { ru: 'Нос · Лицо · Рот', en: 'Nose · Face · Mouth', chapters: ['Nose', 'Face', 'Mouth', 'Teeth'] },
  { ru: 'Горло · Грудь', en: 'Throat · Chest', chapters: ['Throat', 'External throat', 'Larynx and trachea', 'Respiration', 'Cough', 'Expectoration', 'Chest', 'Heart & Circulation'] },
  { ru: 'Желудок · Живот', en: 'Stomach · Abdomen', chapters: ['Stomach', 'Appetite', 'Abdomen', 'Rectum', 'Stool', 'Bladder', 'Kidneys', 'Urethra', 'Prostate gland', 'Urine', 'Genitalia male', 'Genitalia female'] },
  { ru: 'Спина · Конечности', en: 'Back · Limbs', chapters: ['Back', 'Extremities'] },
  { ru: 'Сон · Жар', en: 'Sleep · Fever', chapters: ['Sleep', 'Chill', 'Fever', 'Perspiration'] },
  { ru: 'Кожа · Общее', en: 'Skin · General', chapters: ['Skin', 'Generalities', 'Blood', 'Clinical'] },
]

// ── Русские названия глав реперториума ────────────────────────────
const CHAPTER_LABELS: Record<string, string> = {
  'Mind': 'Психика',
  'Head': 'Голова',
  'Vertigo': 'Головокружение',
  'Eye': 'Глаза',
  'Vision': 'Зрение',
  'Ear': 'Уши',
  'Hearing': 'Слух',
  'Nose': 'Нос',
  'Face': 'Лицо',
  'Mouth': 'Рот',
  'Teeth': 'Зубы',
  'Throat': 'Горло',
  'External throat': 'Горло внеш.',
  'Larynx and trachea': 'Гортань',
  'Respiration': 'Дыхание',
  'Cough': 'Кашель',
  'Expectoration': 'Мокрота',
  'Chest': 'Грудь',
  'Heart & Circulation': 'Сердце',
  'Stomach': 'Желудок',
  'Appetite': 'Аппетит',
  'Abdomen': 'Живот',
  'Rectum': 'Прямая кишка',
  'Stool': 'Стул',
  'Bladder': 'Мочевой пузырь',
  'Kidneys': 'Почки',
  'Urethra': 'Уретра',
  'Prostate gland': 'Простата',
  'Urine': 'Моча',
  'Genitalia male': 'Гениталии м.',
  'Genitalia female': 'Гениталии ж.',
  'Back': 'Спина',
  'Extremities': 'Конечности',
  'Sleep': 'Сон',
  'Chill': 'Озноб',
  'Fever': 'Жар',
  'Perspiration': 'Потливость',
  'Skin': 'Кожа',
  'Generalities': 'Общее',
  'Blood': 'Кровь',
  'Clinical': 'Клиника',
}

// Цвета для coverage dots — по одному на каждую рубрику в анализе
const COVERAGE_COLORS = ['#2d6a4f', '#c8a035', '#2563eb', '#9333ea', '#dc2626', '#0d9488', '#ea580c', '#6b7280']

const RECENT_KEY = 'hc-recent-rubrics'
const MAX_RECENT = 10

type AnalysisEntry = { rubric: RepertoryRubric; weight: 1 | 2 | 3; eliminate?: boolean }

type PrescribeModal = {
  abbrev: string
  name: string
  potency: string
  form: 'granules' | 'drops' | 'powder' | 'olfaction'
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
  const [coverageOnly, setCoverageOnly] = useState(false)

  // Недавно использованные
  const [recentRubrics, setRecentRubrics] = useState<RepertoryRubric[]>([])

  // Клавиатурная навигация
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Модал "Выписать"
  const [prescribeModal, setPrescribeModal] = useState<PrescribeModal>(null)

  // Сохранение анализа в консультацию
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Контекст кнопки "В консультацию"
  const [lastConsultation, setLastConsultation] = useState<string | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<{ id: string; name: string; lastVisit: string | null }[]>([])
  const [patientsLoading, setPatientsLoading] = useState(false)

  // Save-модал: выбор пациента → консультации
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [savePatientSearch, setSavePatientSearch] = useState('')
  const [savePatients, setSavePatients] = useState<{ id: string; name: string; lastVisit: string | null }[]>([])
  const [savePatientsLoading, setSavePatientsLoading] = useState(false)
  const [saveStep, setSaveStep] = useState<'patient' | 'consultation'>('patient')
  const [saveSelectedPatient, setSaveSelectedPatient] = useState<{ id: string; name: string } | null>(null)
  const [saveConsultations, setSaveConsultations] = useState<{ id: string; date: string; status: string }[]>([])
  const [saveConsLoading, setSaveConsLoading] = useState(false)

  // Учебный режим
  const [tutorialStep, setTutorialStep] = useState<number>(-1)
  const [tutorialAddedCount, setTutorialAddedCount] = useState(0)

  const { lang } = useLanguage()
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Авто-переход туториала: step 1 → 2 когда появились результаты поиска
  useEffect(() => {
    if (tutorialStep === 1 && query.length >= 2 && rubrics.length > 0 && !loading) {
      const timer = setTimeout(() => setTutorialStep(2), 800)
      return () => clearTimeout(timer)
    }
  }, [tutorialStep, query, rubrics.length, loading])

  // Авто-переход туториала: step 3 → 4 когда рубрика раскрыта
  useEffect(() => {
    if (tutorialStep === 3 && expandedIds.size > 0) {
      const timer = setTimeout(() => setTutorialStep(4), 600)
      return () => clearTimeout(timer)
    }
  }, [tutorialStep, expandedIds.size])

  // Авто-переход туториала: step 5 → 6 когда первая рубрика добавлена в анализ
  useEffect(() => {
    if (tutorialStep === 5 && tutorialAddedCount >= 1) {
      const timer = setTimeout(() => setTutorialStep(6), 600)
      return () => clearTimeout(timer)
    }
  }, [tutorialStep, tutorialAddedCount])

  // Загружаем недавние из localStorage + контекст консультации + автозапуск обучения
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) setRecentRubrics(JSON.parse(stored))
    } catch {}
    const last = localStorage.getItem('hc-last-consultation')
    setLastConsultation(last)

    // Автозапуск отключён — обучение через InteractiveTour в сайдбаре
    try {
      if (/* disabled */ false && !localStorage.getItem('rep_tutorial_done')) {
        setTimeout(() => {
          setTutorialStep(0)
          setTutorialAddedCount(0)
        }, 800)
      }
    } catch {}
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
  // coverage[i] = грейд препарата в i-й рубрике (0 = отсутствует)
  const analysisScores = useMemo(() => {
    const n = analysisEntries.length
    const scores: Record<string, { name: string; total: number; coverage: number[]; coveredCount: number }> = {}
    analysisEntries.forEach((ae, idx) => {
      ae.rubric.remedies.forEach(r => {
        if (!scores[r.abbrev]) {
          scores[r.abbrev] = { name: r.name, total: 0, coverage: new Array(n).fill(0), coveredCount: 0 }
        }
        const g = Number(r.grade)
        // Кент: grade 3 = 3 балла, grade 2 = 2 балла, grade 1 = 1 балл
        const pts = g >= 3 ? 3 : g === 2 ? 2 : 1
        scores[r.abbrev].total += pts * ae.weight
        scores[r.abbrev].coverage[idx] = g
        scores[r.abbrev].coveredCount++
      })
    })
    let entries = Object.entries(scores).sort((a, b) => {
      if (b[1].total !== a[1].total) return b[1].total - a[1].total
      return b[1].coveredCount - a[1].coveredCount  // при равном score — кто в большем числе рубрик
    })

    // Элиминация: убираем все препараты, которых нет хотя бы в одной рубрике с eliminate=true
    const eliminateEntries = analysisEntries.filter(ae => ae.eliminate)
    if (eliminateEntries.length > 0) {
      const eliminateIndices = eliminateEntries.map(ae => analysisEntries.indexOf(ae))
      entries = entries.filter(([, d]) =>
        eliminateIndices.every(idx => d.coverage[idx] > 0)
      )
    }

    // Фильтр «только присутствующие во всех рубриках»
    if (coverageOnly && n > 1) {
      entries = entries.filter(([, d]) => d.coveredCount === n)
    }
    return entries.slice(0, 20)
  }, [analysisEntries, coverageOnly])

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
    if (tutorialStep >= 0) setTutorialAddedCount(c => c + 1)

    // Сохраняем в недавние
    setRecentRubrics(prev => {
      const next = [rubric, ...prev.filter(r => r.id !== rubric.id)].slice(0, MAX_RECENT)
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // ── Tutorial handlers ────────────────────────────────────────────
  function startTutorial() {
    setTutorialStep(0)
    setTutorialAddedCount(0)
  }

  function handleTutorialNext() {
    if (tutorialStep === 0) {
      // Шаг 0 → 1: начинаем поиск примера
      const exampleQuery = lang === 'ru' ? 'головная боль' : 'headache'
      handleQueryChange(exampleQuery)
      setTutorialStep(1)
      setTimeout(() => searchRef.current?.focus(), 100)
      return
    }
    if (tutorialStep >= 12) {
      setTutorialStep(-1)
      try { localStorage.setItem('rep_tutorial_done', 'true') } catch {}
      return
    }
    setTutorialStep(s => s + 1)
  }

  function handleTutorialExit() {
    setTutorialStep(-1)
    try { localStorage.setItem('rep_tutorial_done', 'true') } catch {}
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

  async function handleSaveAnalysis() {
    if (!lastConsultation || analysisEntries.length === 0) return
    // Извлекаем consultationId из URL консультации: /patients/[id]/consultations/[consultationId]
    const match = lastConsultation.match(/\/consultations\/([a-f0-9-]+)/)
    if (!match) return
    const consultationId = match[1]
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
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
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
    // Если есть перевод из БД — проверяем что он не состоит из латиницы
    if (r.fullpath_ru) {
      const latinWords = r.fullpath_ru.split(/[\s,]+/).filter(w => w.length > 2 && /^[a-zA-Z]/.test(w))
      const totalWords = r.fullpath_ru.split(/[\s,]+/).filter(w => w.length > 1)
      // Если больше половины слов — латиница, показываем английский оригинал
      if (latinWords.length > 0 && latinWords.length >= totalWords.length / 2) {
        return translateRubric(r.fullpath, r.chapter)
      }
      return r.fullpath_ru
    }
    return translateRubric(r.fullpath, r.chapter)
  }

  async function openSaveModal() {
    setShowSaveModal(true)
    setSaveStep('patient')
    setSavePatientSearch('')
    setSaveSelectedPatient(null)
    setSaveConsultations([])
    if (savePatients.length === 0) {
      setSavePatientsLoading(true)
      const list = await getPatientsSimple()
      setSavePatients(list)
      setSavePatientsLoading(false)
    }
  }

  async function selectPatientForSave(patient: { id: string; name: string }) {
    setSaveSelectedPatient(patient)
    setSaveStep('consultation')
    setSaveConsLoading(true)
    const list = await getPatientConsultationsSimple(patient.id)
    setSaveConsultations(list)
    setSaveConsLoading(false)
  }

  async function saveToConsultation(consultationId: string) {
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
      setShowSaveModal(false)
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
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
    // Завершаем обучение при открытии модала (иначе z-index конфликт)
    if (tutorialStep >= 0) {
      setTutorialStep(-1)
      try { localStorage.setItem('rep_tutorial_done', 'true') } catch {}
    }
    setPrescribeModal({ abbrev, name, potency: '30C', form: 'granules', scheme: '', duration: '' })
  }

  function savePrescriptionToConsultation() {
    if (!prescribeModal) return
    const { abbrev, potency, scheme, duration } = prescribeModal
    const dosage = [scheme, duration].filter(Boolean).join('. ')
    const params = new URLSearchParams({ rx: abbrev, potency, dosage })
    const last = localStorage.getItem('hc-last-consultation')
    if (last && last.startsWith('/patients/')) {
      const sep = last.includes('?') ? '&' : '?'
      window.location.href = `${last}${sep}${params}`
    } else {
      setPrescribeModal(null)
      openSaveModal()
    }
  }

  function goSelectPatient() {
    // Сохраняем данные рецепта перед закрытием Rx-модалки
    // TODO: передать Rx-данные в saveToConsultation при выборе консультации
    setPrescribeModal(null)
    openSaveModal()
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
          <div className={`flex-1 relative${tutorialStep === 1 ? ' tut-glow-light' : ''}`}>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              data-tour="rep-search"
              ref={searchRef}
              type="text"
              aria-label={lang === 'ru' ? 'Поиск симптома в реперториуме' : 'Search symptom in repertory'}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(lang).repertory.searchPlaceholder}
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
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[12px] px-1.5 py-0.5 rounded pointer-events-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.30)' }}
                >
                  {t(lang).repertory.enterToAdd}
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
              window.location.href = (lastConsultation && lastConsultation.startsWith('/')) ? lastConsultation : '/dashboard'
            }}
          >
            {lastConsultation ? (
              <>
                <span>←</span>
                <span className="hidden sm:inline">{t(lang).repertory.toConsultation}</span>
              </>
            ) : (
              <>
                <span>←</span>
                <span className="hidden sm:inline">{t(lang).repertory.toHome}</span>
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
            <span className="shrink-0 text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {t(lang).repertory.topNow}
            </span>
            <div className="flex items-baseline gap-x-2.5 gap-y-0.5 flex-wrap flex-1 min-w-0">
              {loading ? (
                <span className="text-[12px] animate-pulse" style={{ color: 'rgba(255,255,255,0.20)' }}>
                  {t(lang).repertory.loading}
                </span>
              ) : headerTopRemedies.top.length === 0 ? (
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                  {t(lang).repertory.noData}
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
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                      +{headerTopRemedies.extra} {t(lang).repertory.more}
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
              {group[lang]}
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
                {t(lang).repertory.recentlyUsed}
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
                <span className="animate-pulse">{t(lang).common.loading}</span>
              ) : query ? (
                <>
                  {t(lang).repertory.searchResults}&nbsp;
                  <span style={{ color: C.text }}>«{query}»</span>
                  &nbsp;·&nbsp;
                  <span style={{ color: C.link }}>{total.toLocaleString('ru-RU')}</span>
                  &nbsp;{t(lang).repertory.rubrics}
                </>
              ) : (
                <>
                  <span style={{ fontStyle: 'italic', color: C.text, fontFamily: 'Georgia, serif' }}>
                    {SECTION_GROUPS[groupIndex][lang]}
                  </span>
                  &nbsp;·&nbsp;
                  <span style={{ color: C.link }}>{total.toLocaleString('ru-RU')}</span>
                  &nbsp;{t(lang).repertory.rubrics}
                </>
              )}
            </p>

            {/* Кнопка анализа на мобильном */}
            <button
              className="lg:hidden flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border"
              style={{ borderColor: C.border, color: analysisEntries.length > 0 ? C.link : C.muted }}
              onPointerDown={() => setShowAnalysis(v => !v)}
            >
              {t(lang).repertory.analysis}
              {analysisEntries.length > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-white text-[12px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: C.link }}
                >
                  {analysisEntries.length}
                </span>
              )}
            </button>
          </div>

          {tutorialStep < 0 && (
            <div className="px-4">
              <FirstTimeHint id="full_repertory">
                {lang === 'ru'
                  ? 'Полный реперторий Кента — 74 482 рубрики с поиском по разделам. Добавляйте рубрики в анализ [+], настраивайте веса и элиминацию. Кнопка «📚 Обучение» вверху — подробный тур из 13 шагов.'
                  : "Full Kent's Repertory — 74,482 rubrics searchable by chapter. Add rubrics to analysis [+], set weights and elimination. '📚 Tutorial' button — detailed 13-step tour."}
              </FirstTimeHint>
            </div>
          )}

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
                <p className="text-sm">{t(lang).repertory.noRubrics}</p>
                {query && (
                  <button
                    onPointerDown={() => handleQueryChange('')}
                    className="mt-2 text-sm underline"
                    style={{ color: C.link }}
                  >
                    {t(lang).repertory.clearSearch}
                  </button>
                )}
              </div>
            ) : (
              <>
                {rubrics.map((rubric, idx) => (
                  <RubricRow
                    key={rubric.id}
                    rubric={rubric}
                    lang={lang}
                    localName={localize(rubric)}
                    isExpanded={expandedIds.has(rubric.id)}
                    inAnalysis={isInAnalysis(rubric.id)}
                    isFocused={focusedIndex === idx}
                    tutorialStep={tutorialStep}
                    isTutorialTarget={tutorialStep >= 2 && tutorialStep <= 6 && idx === 0}
                    onToggleExpand={() => toggleExpand(rubric.id)}
                    onAddToAnalysis={() => addToAnalysis(rubric)}
                    onNavigate={term => {
                      setQuery(term)
                      setGroupIndex(0) // переходим в «Все разделы»
                      loadRubrics(term, 0, 0)
                      searchRef.current?.focus()
                    }}
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
                      {t(lang).repertory.prev}
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
                      {t(lang).repertory.next}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─ Панель анализа (260px) ─────────────── */}
        <div
          data-tour="rep-analysis"
          className={`shrink-0 flex-col border-l bg-white ${showAnalysis ? 'flex' : 'hidden'} lg:flex${tutorialStep >= 7 && tutorialStep <= 9 ? ' tut-glow' : ''}`}
          style={{ width: 260, borderColor: C.border }}
        >
          {/* Заголовок */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: C.borderLight }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                {t(lang).repertory.analysis}
              </span>
              {analysisEntries.length > 0 && (
                <span
                  className="px-1.5 py-0.5 text-[12px] font-bold rounded-full text-white"
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
                {t(lang).repertory.addRubrics}
              </p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: C.muted }}>
                {t(lang).repertory.addHint}
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
                      backgroundColor: ae.eliminate ? 'rgba(220,38,38,0.06)' : 'rgba(45,106,79,0.05)',
                      borderLeft: `3px solid ${ae.eliminate ? '#dc2626' : C.link}`,
                    }}
                  >
                    <span
                      className="flex-1 text-[13px] leading-relaxed min-w-0 break-words"
                      style={{ color: C.text }}
                    >
                      {localize(ae.rubric).split(', ').slice(0, 3).join(', ')}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                      {/* Кнопка элиминации: E — только препараты с этой рубрикой проходят */}
                      <button
                        data-tour="rep-eliminate"
                        onPointerDown={() => toggleEliminate(ae.rubric.id)}
                        className="w-6 h-6 rounded text-[12px] font-bold transition-all flex items-center justify-center"
                        style={{
                          backgroundColor: ae.eliminate ? '#dc2626' : 'transparent',
                          color: ae.eliminate ? 'white' : C.muted,
                          border: `1px solid ${ae.eliminate ? '#dc2626' : C.border}`,
                          ...(tutorialStep === 9 ? {
                            outline: '2px solid #dc2626',
                            outlineOffset: 2,
                            boxShadow: '0 0 12px rgba(220,38,38,0.4)',
                          } : {}),
                        }}
                        title={lang === 'ru' ? 'Элиминация: оставить только препараты, присутствующие в этой рубрике' : 'Elimination: keep only remedies present in this rubric'}
                      >
                        E
                      </button>
                      {([1, 2, 3] as const).map(w => (
                        <button
                          key={w}
                          onPointerDown={() => setWeight(ae.rubric.id, w)}
                          className="w-6 h-6 rounded text-[12px] font-bold transition-all flex items-center justify-center"
                          style={{
                            backgroundColor: ae.weight === w ? C.link : 'transparent',
                            color: ae.weight === w ? 'white' : C.muted,
                            border: `1px solid ${ae.weight === w ? C.link : C.border}`,
                            ...(tutorialStep === 8 ? {
                              outline: '2px solid #2d6a4f',
                              outlineOffset: 1,
                              boxShadow: '0 0 10px rgba(45,106,79,0.35)',
                            } : {}),
                          }}
                          title={t(lang).repertory.weight(w)}
                        >
                          {w}
                        </button>
                      ))}
                      <button
                        onPointerDown={() => removeFromAnalysis(ae.rubric.id)}
                        className="ml-0.5 w-6 h-6 flex items-center justify-center text-[12px]"
                        style={{ color: C.muted }}
                        title={t(lang).repertory.delete}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Топ препаратов */}
              {analysisScores.length > 0 && (
                <div data-tour="rep-top-remedies" className={`p-3 flex-1${tutorialStep >= 10 && tutorialStep <= 11 ? ' tut-glow' : ''}`}>
                  {/* Баннер: элиминация активна */}
                  {analysisEntries.some(ae => ae.eliminate) && (
                    <div
                      className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded text-[12px] font-medium"
                      style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
                    >
                      <span>⊘</span>
                      <span>{lang === 'ru' ? `Элиминация: ${analysisEntries.filter(ae => ae.eliminate).length} рубрик` : `Elimination: ${analysisEntries.filter(ae => ae.eliminate).length} rubrics`}</span>
                    </div>
                  )}
                  {/* Предупреждение: проверить по Materia Medica */}
                  <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded text-[12px]" style={{ backgroundColor: 'rgba(200,160,53,0.08)', color: '#9a6c00', border: '1px solid rgba(200,160,53,0.2)' }}>
                    <span>⚠</span>
                    <span>{lang === 'ru' ? 'Это кандидаты — проверьте по Materia Medica перед назначением' : 'These are candidates — verify via Materia Medica before prescribing'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
                      {t(lang).repertory.topRemedies}
                    </p>
                    {/* Фильтр «только во всех рубриках» */}
                    {analysisEntries.length > 1 && (
                      <button
                        onPointerDown={() => setCoverageOnly(v => !v)}
                        className="text-[12px] px-1.5 py-0.5 rounded border transition-all"
                        style={{
                          borderColor: coverageOnly ? C.link : C.border,
                          color: coverageOnly ? C.link : C.muted,
                          backgroundColor: coverageOnly ? 'rgba(45,106,79,0.07)' : 'transparent',
                          fontWeight: coverageOnly ? 600 : 400,
                        }}
                        title="Показывать только препараты, присутствующие во всех выбранных рубриках"
                      >
                        {lang === 'ru' ? 'Все рубрики' : 'All rubrics'}
                      </button>
                    )}
                  </div>

                  {/* Легенда grade — всегда видна */}
                  <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                    {[
                      { label: lang === 'ru' ? 'Крупный' : 'Bold', opacity: '1', title: lang === 'ru' ? 'Грейд 3: высокая степень подтверждённости в прувингах и клинике' : 'Grade 3: highest confirmation in provings and clinic' },
                      { label: lang === 'ru' ? 'Курсив' : 'Italic', opacity: 'aa', title: lang === 'ru' ? 'Грейд 2: средняя подтверждённость' : 'Grade 2: moderate confirmation' },
                      { label: lang === 'ru' ? 'Обычный' : 'Plain', opacity: '55', title: lang === 'ru' ? 'Грейд 1: слабая подтверждённость, единичные данные' : 'Grade 1: low confirmation, sparse data' },
                    ].map(({ label, opacity, title }) => (
                      <div key={label} className="flex items-center gap-0.5" title={title}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: `${C.link}${opacity === '1' ? '' : opacity}`, flexShrink: 0 }} />
                        <span className="text-[12px]" style={{ color: C.muted }}>{label}</span>
                      </div>
                    ))}
                    {analysisEntries.length > 1 && (
                      <span className="text-[12px]" style={{ color: C.muted }}>·</span>
                    )}
                    {analysisEntries.length > 1 && analysisEntries.map((ae, i) => (
                      <div key={i} className="flex items-center gap-0.5" title={localize(ae.rubric)}>
                        <span
                          style={{
                            display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                            backgroundColor: COVERAGE_COLORS[i % COVERAGE_COLORS.length],
                            opacity: 0.85, flexShrink: 0,
                          }}
                        />
                        <span className="text-[12px] truncate max-w-[50px]" style={{ color: C.muted }}>
                          {localize(ae.rubric).split(', ').slice(-1)[0]}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {analysisScores.slice(0, 15).map(([abbrev, data], rank) => {
                      const maxScore = analysisScores[0]?.[1].total || 1
                      const pct = (data.total / maxScore) * 100
                      return (
                        <div key={abbrev} className="group">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[13px] font-semibold shrink-0 truncate"
                              style={{ width: 46, color: rank === 0 ? C.link : C.text }}
                            >
                              {abbrev}
                            </span>
                            <div
                              className="flex-1 rounded-full overflow-hidden"
                              style={{ height: 4, backgroundColor: '#e8e0d4' }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: rank === 0 ? C.link : rank < 3 ? '#6aad89' : '#9ca3af',
                                }}
                              />
                            </div>
                            <span
                              className="text-[12px] font-bold shrink-0"
                              style={{ width: 20, textAlign: 'right', color: C.secondary }}
                            >
                              {data.total}
                            </span>
                            <button
                              type="button"
                              onPointerDown={() => openPrescribeModal(abbrev, data.name)}
                              className={`shrink-0 transition-opacity text-[12px] rounded ${tutorialStep === 11 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              style={{
                                border: `1px solid ${C.link}`, color: C.link,
                                backgroundColor: 'transparent', padding: '1px 5px', lineHeight: 1.4,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.link; e.currentTarget.style.color = 'white' }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = C.link }}
                            >
                              Rx
                            </button>
                          </div>

                          {/* Coverage dots: один квадрат на каждую рубрику, цвет = грейд */}
                          {analysisEntries.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-0.5" style={{ paddingLeft: 46 + 6 }}>
                              {data.coverage.map((grade, i) => (
                                <span
                                  key={i}
                                  title={`${localize(analysisEntries[i].rubric).split(', ').slice(-1)[0]}: ${grade > 0 ? `грейд ${grade}` : 'отсутствует'}`}
                                  style={{
                                    display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                                    backgroundColor: grade >= 3
                                      ? COVERAGE_COLORS[i % COVERAGE_COLORS.length]
                                      : grade === 2
                                        ? COVERAGE_COLORS[i % COVERAGE_COLORS.length] + 'aa'
                                        : grade === 1
                                          ? COVERAGE_COLORS[i % COVERAGE_COLORS.length] + '55'
                                          : '#e8e0d4',
                                    flexShrink: 0,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Кнопка "Очистить" внизу */}
            {analysisEntries.length > 0 && (
              <div className="p-3 border-t shrink-0 space-y-1.5" style={{ borderColor: C.borderLight }}>
                {/* Сохранить анализ в консультацию — всегда через выбор пациента */}
                <button
                  className="w-full py-2 text-sm rounded-lg transition-colors font-medium"
                  style={{
                    backgroundColor: saveStatus === 'saved' ? '#16a34a' : saveStatus === 'error' ? '#dc2626' : C.link,
                    color: 'white',
                    opacity: saveStatus === 'saving' ? 0.7 : 1,
                  }}
                  onPointerDown={openSaveModal}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving'
                    ? (lang === 'ru' ? 'Сохраняю...' : 'Saving...')
                    : saveStatus === 'saved'
                    ? (lang === 'ru' ? '✓ Сохранено' : '✓ Saved')
                    : saveStatus === 'error'
                    ? (lang === 'ru' ? 'Ошибка' : 'Error')
                    : (lang === 'ru' ? 'Сохранить в консультацию' : 'Save to consultation')}
                </button>
                <button
                  className="w-full py-2 text-sm rounded-lg transition-colors border"
                  style={{ borderColor: C.border, color: C.secondary, backgroundColor: 'transparent' }}
                  onPointerDown={() => setAnalysisEntries([])}
                >
                  {t(lang).repertory.clear}
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          МОДАЛ СОХРАНИТЬ В КОНСУЛЬТАЦИЮ
      ══════════════════════════════════════════ */}
      {showSaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'ru' ? 'Сохранить в консультацию' : 'Save to consultation'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onKeyDown={e => { if (e.key === 'Escape') setShowSaveModal(false) }}
          onPointerDown={e => { if (e.target === e.currentTarget) setShowSaveModal(false) }}
        >
          <div className="w-full flex flex-col" style={{ maxWidth: 400, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', maxHeight: '80vh', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Заголовок */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <h2 className="text-base font-semibold text-gray-900">
                {saveStep === 'patient'
                  ? (lang === 'ru' ? 'Выберите пациента' : 'Select patient')
                  : (lang === 'ru' ? `Консультации — ${saveSelectedPatient?.name}` : `Consultations — ${saveSelectedPatient?.name}`)}
              </h2>
              <div className="flex items-center gap-2">
                {saveStep === 'consultation' && (
                  <button onPointerDown={() => setSaveStep('patient')} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">
                    ← {lang === 'ru' ? 'Назад' : 'Back'}
                  </button>
                )}
                <button onPointerDown={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
              </div>
            </div>

            {/* Шаг 1: выбор пациента */}
            {saveStep === 'patient' && (
              <>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <input
                    type="text"
                    value={savePatientSearch}
                    onChange={e => setSavePatientSearch(e.target.value)}
                    placeholder={lang === 'ru' ? 'Поиск по имени...' : 'Search by name...'}
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {savePatientsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : savePatients.filter(p => p.name.toLowerCase().includes(savePatientSearch.toLowerCase())).length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400">{lang === 'ru' ? 'Нет пациентов' : 'No patients found'}</div>
                  ) : (
                    savePatients
                      .filter(p => p.name.toLowerCase().includes(savePatientSearch.toLowerCase()))
                      .map(p => (
                        <button
                          key={p.id}
                          onPointerDown={() => selectPatientForSave({ id: p.id, name: p.name })}
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
              </>
            )}

            {/* Шаг 2: выбор консультации */}
            {saveStep === 'consultation' && (
              <div className="flex-1 overflow-y-auto">
                {saveConsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : saveConsultations.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400">
                    {lang === 'ru' ? 'Нет консультаций' : 'No consultations'}
                  </div>
                ) : (
                  saveConsultations.map(c => (
                    <button
                      key={c.id}
                      onPointerDown={() => saveToConsultation(c.id)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                      style={{ borderBottom: '1px solid #f7f7f7' }}
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {c.date ? new Date(c.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : (lang === 'ru' ? 'Без даты' : 'No date')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-3"
                        style={{
                          backgroundColor: c.status === 'in_progress' ? '#ecfdf5' : '#f9fafb',
                          color: c.status === 'in_progress' ? '#059669' : '#6b7280',
                        }}
                      >
                        {c.status === 'in_progress' ? (lang === 'ru' ? 'Открыта' : 'Open') : (lang === 'ru' ? 'Завершена' : 'Done')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="px-4 py-3" style={{ borderTop: '1px solid #f0f0f0' }}>
              <button onPointerDown={() => setShowSaveModal(false)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                {lang === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <h2 className="text-base font-semibold text-gray-900">{t(lang).repertory.selectPatient}</h2>
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
                placeholder={t(lang).repertory.searchByName}
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
                <div className="text-center py-10 text-sm text-gray-400">{t(lang).repertory.noPatientsFound}</div>
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
                {t(lang).repertory.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          МОДАЛ "ВЫПИСАТЬ"
      ══════════════════════════════════════════ */}
      {/* Панель учебного режима */}
      {tutorialStep >= 0 && (
        <RepertoryTutorialPanel
          step={tutorialStep as TutorialStep}
          lang={lang}
          addedCount={tutorialAddedCount}
          onNext={handleTutorialNext}
          onExit={handleTutorialExit}
        />
      )}

      {prescribeModal && (
        <PrescribeModalDialog
          modal={prescribeModal}
          lang={lang}
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
  rubric, lang, localName, isExpanded, inAnalysis, isFocused, isTutorialTarget, tutorialStep,
  onToggleExpand, onAddToAnalysis, onNavigate,
}: {
  rubric: RepertoryRubric
  lang: 'ru' | 'en'
  localName: string
  isExpanded: boolean
  inAnalysis: boolean
  isFocused: boolean
  isTutorialTarget?: boolean
  tutorialStep?: number
  onToggleExpand: () => void
  onAddToAnalysis: () => void
  onNavigate?: (term: string) => void
}) {
  const depth = Math.max(0, rubric.fullpath.split(',').length - 2)
  const indent = depth * 16

  const segments = localName.split(', ')
  const parentSegments = segments.slice(0, -1)

  const grade3 = rubric.remedies.filter(r => Number(r.grade) >= 3)
  const grade2 = rubric.remedies.filter(r => Number(r.grade) === 2)
  const grade1 = rubric.remedies.filter(r => Number(r.grade) <= 1)

  // Превью: топ-10 по грейду для свёрнутого вида (как в мини-репертории)
  const previewRemedies = rubric.remedies.slice(0, 10)

  return (
    <div
      data-tour="rep-rubric-row"
      className={`group border-b${isTutorialTarget && tutorialStep !== 4 ? ' tut-glow' : ''}`}
      style={{
        borderColor: '#e8e4dc',
        borderLeftWidth: inAnalysis ? 3 : 0,
        borderLeftColor: C.link,
        backgroundColor: isFocused
          ? '#e8f0e8'
          : inAnalysis
            ? 'rgba(45,106,79,0.05)'
            : (tutorialStep !== undefined && (tutorialStep === 2 || tutorialStep === 3))
              ? 'rgba(45,106,79,0.06)'
              : 'transparent',
        ...((tutorialStep !== undefined && (tutorialStep === 2 || tutorialStep === 3))
          ? { position: 'relative' as const, zIndex: 9995 }
          : (tutorialStep === 4 && isTutorialTarget)
            ? { position: 'relative' as const, zIndex: 9995, background: 'white' }
            : {}),
      }}
    >
      {/* Основная строка */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        style={{ paddingLeft: 12 + indent, paddingRight: 8, paddingTop: 6, paddingBottom: isExpanded ? 6 : 2 }}
        onPointerDown={onToggleExpand}
      >
        {/* Название рубрики */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Хлебные крошки (только если есть родители) */}
          {parentSegments.length > 0 && onNavigate && (
            <div className="flex items-center gap-0.5 mb-0.5 flex-wrap">
              {parentSegments.map((seg, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span style={{ color: '#c4b89a', fontSize: 9 }}>›</span>}
                  <button
                    type="button"
                    onPointerDown={e => { e.stopPropagation(); onNavigate(seg) }}
                    className="text-[12px] transition-colors hover:underline"
                    style={{ color: 'var(--sim-text-hint)' }}
                    title={lang === 'ru' ? `Найти "${seg}"` : `Search "${seg}"`}
                  >
                    {seg}
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[14px] leading-tight truncate" style={{ fontFamily: 'Georgia, serif' }}>
              <span className="font-bold" style={{ color: 'var(--sim-forest)' }}>{segments[segments.length - 1].toUpperCase()}</span>
            </span>
            {rubric.chapter && (
              <span
                className="shrink-0 text-[12px] px-1 rounded"
                style={{ backgroundColor: '#e8e4dc', color: '#7a6a50', letterSpacing: '0.03em', lineHeight: '16px' }}
              >
                {CHAPTER_LABELS[rubric.chapter] ?? rubric.chapter}
              </span>
            )}
          </div>
        </div>

        {/* Кнопка [+] — добавить в анализ */}
        <button
          data-tour="rep-add-rubric"
          type="button"
          aria-label={inAnalysis ? 'Already in analysis' : 'Add to analysis'}
          onPointerDown={e => { e.stopPropagation(); onAddToAnalysis() }}
          className={`shrink-0 flex items-center justify-center transition-all ${isTutorialTarget || (tutorialStep !== undefined && tutorialStep >= 5 && tutorialStep <= 6) ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
          style={{
            width: 20, height: 20,
            backgroundColor: inAnalysis ? '#1a7a40' : C.link,
            borderRadius: 4,
            ...((tutorialStep !== undefined && tutorialStep >= 5 && tutorialStep <= 6 && !inAnalysis) ? {
              outline: '2px solid #2d6a4f',
              outlineOffset: 2,
              boxShadow: '0 0 12px rgba(45,106,79,0.4)',
            } : {}),
          }}
          title={inAnalysis ? t(lang).repertory.alreadyInAnalysis : t(lang).repertory.addToAnalysis}
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
        <span className="shrink-0 text-[13px] text-right" style={{ width: 28, color: 'var(--sim-text-hint)' }}>
          {rubric.remedy_count}
        </span>

        {/* Стрелка */}
        <span
          className="shrink-0 text-[13px] transition-transform duration-150 inline-block"
          style={{ color: 'var(--sim-text-hint)', transform: isExpanded ? 'rotate(90deg)' : 'none' }}
        >
          ›
        </span>
      </div>

      {/* Превью препаратов (свёрнуто) — как в мини-репертории */}
      {!isExpanded && previewRemedies.length > 0 && (
        <div
          className="flex flex-wrap gap-x-1.5 pb-2"
          style={{ paddingLeft: 14 + indent, paddingRight: 36 }}
        >
          {previewRemedies.map((r, i) => (
            <span
              key={i}
              style={{
                color: Number(r.grade) >= 3 ? '#2d6a4f' : Number(r.grade) === 2 ? '#2a2010' : '#9a9a8a',
                fontWeight: Number(r.grade) >= 3 ? 700 : Number(r.grade) === 2 ? 500 : 400,
                fontSize: Number(r.grade) >= 3 ? '11px' : '10px',
                fontStyle: Number(r.grade) === 2 ? 'italic' : 'normal',
              }}
              title={r.name}
            >
              {r.abbrev}
            </span>
          ))}
          {rubric.remedy_count > 10 && (
            <span style={{ color: 'var(--sim-text-hint)', fontSize: '12px' }}>+{rubric.remedy_count - 10}</span>
          )}
        </div>
      )}

      {/* Развёрнутые препараты */}
      {isExpanded && (
        <div
          className={`pb-3 leading-relaxed${tutorialStep === 4 && isTutorialTarget ? ' tut-glow' : ''}`}
          style={{ paddingLeft: 14 + indent, paddingRight: 8 }}
        >
          {grade3.map(r => (
            <span
              key={r.abbrev}
              className="mr-2 cursor-pointer hover:underline font-bold uppercase"
              style={{ fontSize: '15px', color: 'var(--sim-forest)' }}
              title={r.name}
            >
              {r.abbrev}
            </span>
          ))}
          {grade2.map(r => (
            <span
              key={r.abbrev}
              className="mr-1.5 cursor-pointer hover:underline"
              style={{ fontSize: '14px', color: '#2a2010', fontStyle: 'italic' }}
              title={r.name}
            >
              {r.abbrev}
            </span>
          ))}
          {grade1.map(r => (
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
const POTENCIES = ['6C', '12C', '30C', '200C', '1M', '10M', 'LM1', 'LM2', 'LM3', 'LM6']

function PrescribeModalDialog({
  modal, lang, onChange, onSaveToConsultation, onSelectPatient, onClose,
}: {
  modal: NonNullable<PrescribeModal>
  lang: 'ru' | 'en'
  onChange: (m: PrescribeModal) => void
  onSaveToConsultation: () => void
  onSelectPatient: () => void
  onClose: () => void
}) {
  const hasActiveConsultation = typeof window !== 'undefined' && !!localStorage.getItem('hc-last-consultation')
  const L = t(lang).repertory

  const DURATIONS = [L.week1, L.weeks2, L.month1, L.untilBetter]
  const FORMS = [
    { value: 'granules' as const, label: L.granules },
    { value: 'drops' as const,    label: L.drops   },
    { value: 'powder' as const,   label: L.powder  },
    { value: 'olfaction' as const, label: lang === 'ru' ? 'Ольфакция' : 'Olfaction' },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'ru' ? 'Назначение препарата' : 'Prescribe remedy'}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--sim-bg)', border: '1px solid var(--sim-border)' }}
      >
        {/* Заголовок */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #e0d8cc' }}>
          <p className="text-[12px] uppercase tracking-widest mb-1" style={{ color: 'var(--sim-text-hint)' }}>{L.prescribeTitle}</p>
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 26, fontWeight: 600, color: 'var(--sim-forest)', lineHeight: 1.2 }}>
            {L.prescribe(modal.name || modal.abbrev)}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Потенция */}
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sim-text-sec)' }}>
              {L.potency}
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
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sim-text-sec)' }}>
              {L.form}
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
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sim-text-sec)' }}>
              {L.scheme}
            </label>
            <input
              type="text"
              value={modal.scheme}
              onChange={e => onChange({ ...modal, scheme: e.target.value })}
              placeholder={L.schemePlaceholder}
              className="w-full px-3 py-2.5 text-sm rounded-lg"
              style={{
                border: '1px solid var(--sim-border)',
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
            <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sim-text-sec)' }}>
              {L.duration}
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
              style={{ backgroundColor: 'var(--sim-forest)' }}
            >
              {L.saveToConsultation}
            </button>
          )}
          <button
            type="button"
            onPointerDown={onSelectPatient}
            className="w-full py-2.5 text-sm font-medium rounded-xl border transition-colors"
            style={{
              borderColor: '#1a3020',
              color: 'var(--sim-forest)',
              backgroundColor: hasActiveConsultation ? 'transparent' : '#1a3020',
              ...(hasActiveConsultation ? {} : { color: 'white' }),
            }}
          >
            {L.selectPatientAndConsultation}
          </button>
          <button
            type="button"
            onPointerDown={onClose}
            className="w-full py-2 text-sm rounded-xl transition-colors"
            style={{ color: 'var(--sim-text-hint)', backgroundColor: 'transparent' }}
          >
            {L.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
