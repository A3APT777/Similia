'use client'

import { useState } from 'react'
import { DEMO_RESULTS, PRESET_KEYS } from './demo-cases'
import { generateQuestions, generateClarifyingQuestions } from '@/lib/actions/ai-consultation'
import type { AIQuestion } from '@/lib/actions/ai-consultation'

// --- Типы ---

type DemoResult = {
  remedy: string
  remedyName: string
  totalScore: number
  confidence: string
}

type SymptomEntry = {
  rubric: string
  category: 'mental' | 'general' | 'particular'
  present: boolean
  weight: number
}

type DemoMode = 'choose' | 'generating' | 'questions' | 'analyzing' | 'result' | 'clarifying'

// --- Маппинг ответов в симптомы (для демо) ---

function answersToSymptoms(answers: Record<string, string | string[]>): SymptomEntry[] {
  const symptoms: SymptomEntry[] = []

  // Маппинг ключевых слов к рубрикам
  const KEYWORD_MAP: Record<string, { rubric: string; category: 'mental' | 'general' | 'particular'; weight: number }> = {
    // Температура
    'Зябкий': { rubric: 'chilly', category: 'general', weight: 2 },
    'зябкий': { rubric: 'chilly', category: 'general', weight: 2 },
    'мёрзнет': { rubric: 'chilly', category: 'general', weight: 2 },
    'Жаркий': { rubric: 'hot patient', category: 'general', weight: 2 },
    'жаркий': { rubric: 'hot patient', category: 'general', weight: 2 },
    'прохлад': { rubric: 'hot patient', category: 'general', weight: 2 },
    // Жажда
    'Сильная жажда': { rubric: 'thirst large quantities', category: 'general', weight: 2 },
    'сильная': { rubric: 'thirst large quantities', category: 'general', weight: 1 },
    'глоток': { rubric: 'thirst small sips', category: 'general', weight: 2 },
    'Маленькими': { rubric: 'thirst small sips', category: 'general', weight: 2 },
    'не пьёт': { rubric: 'thirstless', category: 'general', weight: 2 },
    // Эмоции
    'Тревож': { rubric: 'anxiety', category: 'mental', weight: 2 },
    'тревож': { rubric: 'anxiety', category: 'mental', weight: 2 },
    'Раздражит': { rubric: 'irritability', category: 'mental', weight: 2 },
    'раздражит': { rubric: 'irritability', category: 'mental', weight: 2 },
    'Подавлен': { rubric: 'grief suppressed', category: 'mental', weight: 3 },
    'подавлен': { rubric: 'grief suppressed', category: 'mental', weight: 3 },
    'Плаксив': { rubric: 'weeping easily', category: 'mental', weight: 2 },
    'плаксив': { rubric: 'weeping easily', category: 'mental', weight: 2 },
    'Безразлич': { rubric: 'indifference family', category: 'mental', weight: 3 },
    'безразлич': { rubric: 'indifference family', category: 'mental', weight: 3 },
    'Беспокойн': { rubric: 'restlessness', category: 'mental', weight: 2 },
    'беспокойн': { rubric: 'restlessness', category: 'mental', weight: 2 },
    // Модальности
    'Холод': { rubric: 'chilly', category: 'general', weight: 2 },
    'холод': { rubric: 'chilly', category: 'general', weight: 2 },
    'Тепло': { rubric: 'hot patient', category: 'general', weight: 2 },
    'Движени': { rubric: 'motion agg', category: 'general', weight: 2 },
    'движени': { rubric: 'motion amel', category: 'general', weight: 2 },
    'Покой': { rubric: 'motion agg', category: 'general', weight: 2 },
    'покой': { rubric: 'motion agg', category: 'general', weight: 2 },
    'Ночью': { rubric: 'worse after sleep', category: 'general', weight: 2 },
    'ночью': { rubric: 'worse after sleep', category: 'general', weight: 2 },
    'Утром': { rubric: 'weakness morning', category: 'general', weight: 1 },
    'утром': { rubric: 'weakness morning', category: 'general', weight: 1 },
    'свежем воздухе': { rubric: 'open air amel', category: 'general', weight: 2 },
    'Свежий воздух': { rubric: 'open air amel', category: 'general', weight: 2 },
    // Жалобы
    'головн': { rubric: 'headache', category: 'particular', weight: 2 },
    'Головн': { rubric: 'headache', category: 'particular', weight: 2 },
    'горл': { rubric: 'throat pain', category: 'particular', weight: 2 },
    'кашел': { rubric: 'cough dry', category: 'particular', weight: 2 },
    'тошнот': { rubric: 'nausea', category: 'particular', weight: 2 },
    'бессонниц': { rubric: 'insomnia', category: 'particular', weight: 2 },
    'спин': { rubric: 'back pain', category: 'particular', weight: 1 },
    'суставы': { rubric: 'joint pain', category: 'particular', weight: 1 },
    'кож': { rubric: 'skin eruptions', category: 'particular', weight: 2 },
    'зуд': { rubric: 'skin itching', category: 'particular', weight: 2 },
    // Пищевые
    'солён': { rubric: 'desire salt', category: 'general', weight: 2 },
    'сладк': { rubric: 'desire sweets', category: 'general', weight: 2 },
    'кисл': { rubric: 'desire sour', category: 'general', weight: 2 },
    'жирн': { rubric: 'desire fat', category: 'general', weight: 2 },
    // Сон
    'живот': { rubric: 'sleep position abdomen', category: 'general', weight: 2 },
    'просыпается': { rubric: 'waking 2-4 am', category: 'particular', weight: 3 },
    'кошмар': { rubric: 'insomnia', category: 'particular', weight: 2 },
    // Страхи
    'смерт': { rubric: 'fear death', category: 'mental', weight: 2 },
    'одиноч': { rubric: 'fear alone', category: 'mental', weight: 2 },
    'темнот': { rubric: 'fear dark', category: 'mental', weight: 2 },
    'болезн': { rubric: 'fear disease', category: 'mental', weight: 2 },
    // Утешение
    'один': { rubric: 'consolation agg', category: 'mental', weight: 2 },
    'компани': { rubric: 'company desire', category: 'mental', weight: 2 },
    'внимани': { rubric: 'consolation amel', category: 'mental', weight: 2 },
  }

  const seen = new Set<string>()

  for (const [, value] of Object.entries(answers)) {
    const values = Array.isArray(value) ? value : [value]
    for (const v of values) {
      if (!v) continue
      for (const [keyword, symptom] of Object.entries(KEYWORD_MAP)) {
        if (v.includes(keyword) && !seen.has(symptom.rubric)) {
          seen.add(symptom.rubric)
          symptoms.push({ ...symptom, present: true })
        }
      }
    }
  }

  return symptoms
}

// --- Пресеты ---

const PRESETS = [
  {
    name: 'Горе, подавленные эмоции',
    description: 'Закрытый пациент, плачет в одиночестве',
    symptoms: [
      { rubric: 'grief suppressed', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'weeping alone', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'consolation agg', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'headache', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'desire salt', category: 'general' as const, present: true, weight: 2 },
    ],
  },
  {
    name: 'Тревога, ночное беспокойство',
    description: 'Страх смерти, пьёт маленькими глотками',
    symptoms: [
      { rubric: 'anxiety', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'restlessness', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'thirst small sips', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'fear death', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'chilly', category: 'general' as const, present: true, weight: 2 },
    ],
  },
  {
    name: 'Раздражительность, пищеварение',
    description: 'Nux vomica-типаж, стресс и кофе',
    symptoms: [
      { rubric: 'irritability', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'nausea', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'desire stimulants', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'constipation', category: 'particular' as const, present: true, weight: 1 },
      { rubric: 'chilly', category: 'general' as const, present: true, weight: 2 },
    ],
  },
]

// --- Компонент ---

export default function DemoForm() {
  const [mode, setMode] = useState<DemoMode>('choose')
  const [caseText, setCaseText] = useState('')
  const [questions, setQuestions] = useState<AIQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [results, setResults] = useState<DemoResult[] | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // --- Генерация вопросов ---

  async function handleGenerateQuestions() {
    if (!caseText.trim() || caseText.trim().length < 10) {
      setError('Опишите случай подробнее (минимум 10 символов)')
      return
    }
    setError('')
    setMode('generating')
    try {
      const qs = await generateQuestions(caseText)
      setQuestions(qs)
      setAnswers({})
      setMode('questions')
    } catch {
      setError('Не удалось сгенерировать вопросы. Попробуйте ещё раз.')
      setMode('choose')
    }
  }

  // --- Анализ через API ---

  const [clarifyRound, setClarifyRound] = useState(0)
  const MAX_CLARIFY_ROUNDS = 3
  const MIN_CONFIDENCE_SCORE = 60 // AI дозадаёт вопросы пока top-1 < 60%

  async function handleAnalyze() {
    const symptoms = answersToSymptoms(answers)
    if (symptoms.length < 2) {
      setError('Ответьте хотя бы на 2 вопроса для анализа')
      return
    }
    setError('')
    setMode('analyzing')
    setLoading(true)
    try {
      const res = await fetch('/api/ai-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ошибка анализа')
        setMode('questions')
        return
      }
      setResults(data.results)
      setRemaining(data.remaining)

      // Если score top-1 < 60% и не исчерпаны раунды — автоматически дозадать вопросы
      const topScore = data.results?.[0]?.totalScore ?? 0
      if (topScore < MIN_CONFIDENCE_SCORE && clarifyRound < MAX_CLARIFY_ROUNDS) {
        setClarifyRound(r => r + 1)
        // Генерируем уточняющие вопросы
        try {
          const currentSymptoms = symptoms.map((s: { rubric: string }) => s.rubric)
          const topRemedies = (data.results ?? []).slice(0, 3).map((r: DemoResult) => ({
            remedy: r.remedy, score: r.totalScore, confidence: r.confidence,
          }))
          const clarifyQs = await generateClarifyingQuestions(currentSymptoms, topRemedies)
          if (clarifyQs.length > 0) {
            setQuestions(clarifyQs)
            setMode('clarifying')
            return
          }
        } catch { /* fallback — показать результат как есть */ }
      }

      setMode('result')
    } catch {
      setError('Ошибка сети')
      setMode('questions')
    } finally {
      setLoading(false)
    }
  }

  // --- Пресет ---

  function loadPreset(idx: number) {
    const key = PRESET_KEYS[idx]
    const demo = DEMO_RESULTS[key]
    setResults(demo.results)
    setRemaining(null)
    setMode('result')
  }

  // --- Рестарт ---

  function handleRestart() {
    setMode('choose')
    setCaseText('')
    setQuestions([])
    setAnswers({})
    setResults(null)
    setError('')
  }

  // --- Chips toggle ---

  function toggleChip(key: string, value: string, multi: boolean) {
    setAnswers(prev => {
      if (multi) {
        const current = (prev[key] as string[]) || []
        const exists = current.includes(value)
        return { ...prev, [key]: exists ? current.filter(v => v !== value) : [...current, value] }
      }
      return { ...prev, [key]: value }
    })
  }

  // --- Метки уверенности ---

  const confidenceLabels: Record<string, string> = {
    'high': 'Высокая', 'medium': 'Средняя', 'low': 'Низкая', 'insufficient': 'Недостаточно',
  }
  const confidenceColors: Record<string, string> = {
    'high': '#34d399', 'medium': '#818cf8', 'low': '#fbbf24', 'insufficient': '#f87171',
  }

  // ═══════════════════════════════════════════════════════
  //   РЕЖИМ: choose
  // ═══════════════════════════════════════════════════════

  if (mode === 'choose') {
    return (
      <div className="space-y-5">
        {/* Описать случай */}
        <div className="rounded-2xl p-5 bg-white/[0.06] border border-white/[0.08]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Описать случай</p>
              <p className="text-xs text-white/40">AI сгенерирует уточняющие вопросы</p>
            </div>
          </div>

          <textarea
            value={caseText}
            onChange={e => setCaseText(e.target.value)}
            placeholder="Пациент 35 лет, жалуется на головные боли, усиливающиеся от движения. Зябкий, раздражительный, хочет быть один..."
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          />

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mt-2">{error}</div>
          )}

          <button
            onClick={handleGenerateQuestions}
            disabled={!caseText.trim()}
            className="btn btn-ai w-full mt-3"
          >
            Сгенерировать вопросы
          </button>
        </div>

        {/* Разделитель */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-white/30 uppercase tracking-wider">или</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

        {/* Готовые пресеты */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 text-white/40">
            Готовый пример — мгновенный результат
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => loadPreset(i)}
                className="rounded-xl p-3 text-left transition-all hover:bg-white/[0.1] bg-white/[0.06] border border-white/[0.08]"
              >
                <p className="text-sm font-medium text-indigo-200">{p.name}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //   РЕЖИМ: generating — AI генерирует вопросы
  // ═══════════════════════════════════════════════════════

  if (mode === 'generating') {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/[0.06] border border-white/[0.08]">
        <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 ai-pulse">
          <svg className="w-6 h-6 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-white font-medium">AI анализирует описание...</p>
        <p className="text-xs text-indigo-300 mt-1">Генерирую уточняющие вопросы</p>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //   РЕЖИМ: questions — врач отвечает
  // ═══════════════════════════════════════════════════════

  if (mode === 'questions') {
    return (
      <div className="space-y-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handleRestart}
            className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <span className="text-xs text-white/40">{questions.length} вопросов от AI</span>
        </div>

        {/* Вопросы */}
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.key} className="rounded-2xl p-4 bg-white/[0.06] border border-white/[0.08]">
              <p className="text-sm font-medium text-white mb-1">{q.label}</p>
              {q.hint && <p className="text-[11px] text-white/40 mb-3">{q.hint}</p>}

              {/* Chips */}
              {(q.type === 'chips' || q.type === 'chips-multi') && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => {
                    const multi = q.type === 'chips-multi'
                    const currentVal = answers[q.key]
                    const isActive = multi
                      ? (Array.isArray(currentVal) && currentVal.includes(opt))
                      : currentVal === opt
                    return (
                      <button
                        key={opt}
                        onClick={() => toggleChip(q.key, opt, multi)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isActive
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-white/[0.06] border-white/[0.1] text-indigo-200 hover:bg-white/[0.1]'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Textarea / Text */}
              {(q.type === 'textarea' || q.type === 'text') && (
                <textarea
                  value={(answers[q.key] as string) || ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder="Ваш ответ..."
                  rows={q.type === 'textarea' ? 3 : 1}
                  className="w-full rounded-xl px-4 py-2.5 text-sm resize-none bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                />
              )}
            </div>
          ))}
        </div>

        {/* Ошибка */}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Кнопка анализа */}
        <button
          onClick={handleAnalyze}
          className="btn btn-ai w-full"
        >
          Анализировать
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //   РЕЖИМ: analyzing — MDRI считает
  // ═══════════════════════════════════════════════════════

  if (mode === 'analyzing') {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/[0.06] border border-white/[0.08]">
        <div className="w-14 h-14 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 ai-pulse">
          <svg className="w-7 h-7 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-white font-medium">MDRI Engine анализирует...</p>
        <p className="text-xs text-indigo-300 mt-1">8 линз · реперторизация · матчинг</p>
        <div className="mt-4 flex justify-center gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500 ai-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //   РЕЖИМ: result
  // ═══════════════════════════════════════════════════════

  if (mode === 'result' || mode === 'clarifying') {
    if (loading) {
      return (
        <div className="rounded-2xl p-8 text-center bg-white/[0.06] border border-white/[0.08]">
          <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-3 ai-pulse">
            <svg className="w-5 h-5 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-indigo-300">Анализирую через 8 линз MDRI...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="space-y-3">
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
          <button onClick={handleRestart} className="text-xs text-indigo-300 hover:text-white underline">Начать заново</button>
        </div>
      )
    }

    if (results) {
      const topScore = results[0]?.totalScore ?? 0
      const needsClarification = mode === 'clarifying' && questions.length > 0

      return (
        <div className="space-y-4">
          {/* Уточняющие вопросы (если AI дозадаёт) */}
          {needsClarification && (
            <div className="rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10 ai-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-sm font-semibold text-amber-300">
                  AI нужно уточнить ({topScore}% — нужно {MIN_CONFIDENCE_SCORE}%+)
                </span>
                <span className="text-[10px] text-amber-400/60 ml-auto">Раунд {clarifyRound}/{MAX_CLARIFY_ROUNDS}</span>
              </div>
              <div className="space-y-3">
                {questions.map(q => (
                  <div key={q.key}>
                    <label className="text-xs font-medium text-white/80 mb-1.5 block">{q.label}</label>
                    {q.hint && <p className="text-[11px] text-white/40 mb-2">{q.hint}</p>}
                    {(q.type === 'chips' || q.type === 'chips-multi') && q.options && (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map(opt => {
                          const multi = q.type === 'chips-multi'
                          const currentVal = answers[q.key]
                          const isActive = multi
                            ? (Array.isArray(currentVal) && currentVal.includes(opt))
                            : currentVal === opt
                          return (
                            <button
                              key={opt}
                              onClick={() => toggleChip(q.key, opt, multi)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                isActive
                                  ? 'bg-amber-500 border-amber-400 text-white'
                                  : 'bg-white/[0.06] border-white/[0.1] text-amber-200 hover:bg-white/[0.1]'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {(q.type === 'textarea' || q.type === 'text') && (
                      <textarea
                        rows={2}
                        value={(answers[q.key] as string) ?? ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                        className="w-full text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 resize-none"
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAnalyze}
                  className="btn btn-ai w-full mt-2"
                >
                  Переанализировать с уточнениями
                </button>
              </div>
            </div>
          )}

          {/* Результаты */}
          <div className="rounded-2xl overflow-hidden border border-indigo-500/20">
            <div className="px-5 py-3 flex items-center justify-between bg-indigo-600/10">
              <div>
                <p className="text-xs font-semibold text-indigo-400">
                  {needsClarification ? 'Текущий результат (неточный)' : 'Результат MDRI-анализа'}
                </p>
                {remaining !== null && (
                  <p className="text-[10px] mt-0.5 text-white/40">
                    Осталось демо-запросов: {remaining}
                  </p>
                )}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 font-medium">
                MDRI Engine
              </span>
            </div>
            <div className="divide-y divide-white/[0.06] bg-white/[0.04]">
              {results.map((r, i) => (
                <div key={r.remedy} className="px-5 py-3.5 flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-indigo-600 text-white' : 'bg-white/[0.08] text-indigo-300'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-white uppercase">{r.remedy}</span>
                    <span className="text-xs text-indigo-300/60 ml-1.5">{r.remedyName}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-base font-bold ${i === 0 ? 'text-indigo-400' : 'text-indigo-300/60'}`}>
                      {r.totalScore}%
                    </span>
                    <span className="block text-[10px] font-medium" style={{ color: confidenceColors[r.confidence] }}>
                      {confidenceLabels[r.confidence]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 text-center bg-white/[0.02]">
              <p className="text-[11px] text-white/40">
                В полной версии: детали по 8 линзам, AI-гомеопат, потенция, differential
              </p>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2">
            <button
              onClick={handleRestart}
              className="btn btn-ai-outline flex-1"
            >
              Попробовать другой случай
            </button>
          </div>
        </div>
      )
    }
  }

  // Fallback
  return null
}
