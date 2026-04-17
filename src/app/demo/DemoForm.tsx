'use client'

import { useState } from 'react'
import { DEMO_RESULTS, PRESET_KEYS } from './demo-cases'

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

type DemoMode = 'choose' | 'questions' | 'analyzing' | 'result'

// --- Фиксированные вопросы (0 токенов, всё chips-multi) ---

type Question = {
  key: string
  label: string
  options: { label: string; rubric: string; category: 'mental' | 'general' | 'particular'; weight: number }[]
}

const QUESTIONS: Question[] = [
  {
    key: 'complaints',
    label: 'Что беспокоит пациента?',
    options: [
      { label: 'Головная боль', rubric: 'headache', category: 'particular', weight: 2 },
      { label: 'Боль в горле', rubric: 'throat pain', category: 'particular', weight: 2 },
      { label: 'Кашель', rubric: 'cough dry', category: 'particular', weight: 2 },
      { label: 'Тошнота', rubric: 'nausea', category: 'particular', weight: 2 },
      { label: 'Боль в спине', rubric: 'back pain', category: 'particular', weight: 1 },
      { label: 'Боль в суставах', rubric: 'joint pain', category: 'particular', weight: 1 },
      { label: 'Кожные высыпания', rubric: 'skin eruptions', category: 'particular', weight: 2 },
      { label: 'Зуд', rubric: 'skin itching', category: 'particular', weight: 2 },
      { label: 'Бессонница', rubric: 'insomnia', category: 'particular', weight: 2 },
      { label: 'Слабость', rubric: 'weakness morning', category: 'general', weight: 1 },
    ],
  },
  {
    key: 'worse',
    label: 'Что ухудшает состояние?',
    options: [
      { label: 'Холод', rubric: 'chilly', category: 'general', weight: 2 },
      { label: 'Тепло', rubric: 'hot patient', category: 'general', weight: 2 },
      { label: 'Движение', rubric: 'motion agg', category: 'general', weight: 2 },
      { label: 'Покой', rubric: 'motion amel', category: 'general', weight: 2 },
      { label: 'Ночью', rubric: 'worse after sleep', category: 'general', weight: 2 },
      { label: 'Утром', rubric: 'weakness morning', category: 'general', weight: 1 },
      { label: 'После еды', rubric: 'nausea morning', category: 'particular', weight: 1 },
    ],
  },
  {
    key: 'better',
    label: 'Что улучшает?',
    options: [
      { label: 'Тепло', rubric: 'chilly', category: 'general', weight: 2 },
      { label: 'Холод', rubric: 'hot patient', category: 'general', weight: 2 },
      { label: 'Движение', rubric: 'motion amel', category: 'general', weight: 2 },
      { label: 'Покой', rubric: 'motion agg', category: 'general', weight: 2 },
      { label: 'Свежий воздух', rubric: 'open air amel', category: 'general', weight: 2 },
      { label: 'На море', rubric: 'sea amel', category: 'general', weight: 2 },
      { label: 'Давление', rubric: 'headache pressing', category: 'particular', weight: 1 },
    ],
  },
  {
    key: 'thermal',
    label: 'Температурная характеристика',
    options: [
      { label: 'Зябкий, мёрзнет', rubric: 'chilly', category: 'general', weight: 2 },
      { label: 'Жаркий, любит прохладу', rubric: 'hot patient', category: 'general', weight: 2 },
      { label: 'Сильная жажда', rubric: 'thirst large quantities', category: 'general', weight: 2 },
      { label: 'Пьёт маленькими глотками', rubric: 'thirst small sips', category: 'general', weight: 2 },
      { label: 'Почти не пьёт', rubric: 'thirstless', category: 'general', weight: 2 },
      { label: 'Сильно потеет', rubric: 'perspiration profuse', category: 'general', weight: 2 },
    ],
  },
  {
    key: 'emotional',
    label: 'Эмоциональное состояние',
    options: [
      { label: 'Тревога, беспокойство', rubric: 'anxiety', category: 'mental', weight: 2 },
      { label: 'Раздражительность', rubric: 'irritability', category: 'mental', weight: 2 },
      { label: 'Подавленное горе', rubric: 'grief suppressed', category: 'mental', weight: 3 },
      { label: 'Плачет легко', rubric: 'weeping easily', category: 'mental', weight: 2 },
      { label: 'Безразличие к близким', rubric: 'indifference family', category: 'mental', weight: 3 },
      { label: 'Беспокойство, не усидеть', rubric: 'restlessness', category: 'mental', weight: 2 },
      { label: 'Переменчивое настроение', rubric: 'mood alternating', category: 'mental', weight: 2 },
      { label: 'Подавленный гнев', rubric: 'anger suppressed', category: 'mental', weight: 3 },
    ],
  },
  {
    key: 'consolation',
    label: 'Когда пациенту плохо',
    options: [
      { label: 'Хуже от утешения', rubric: 'consolation agg', category: 'mental', weight: 2 },
      { label: 'Лучше от утешения', rubric: 'consolation amel', category: 'mental', weight: 2 },
      { label: 'Хочет быть среди людей', rubric: 'company desire', category: 'mental', weight: 2 },
      { label: 'Избегает общения', rubric: 'company aversion', category: 'mental', weight: 2 },
    ],
  },
  {
    key: 'fears',
    label: 'Страхи',
    options: [
      { label: 'Страх смерти', rubric: 'fear death', category: 'mental', weight: 2 },
      { label: 'Страх одиночества', rubric: 'fear alone', category: 'mental', weight: 2 },
      { label: 'Страх темноты', rubric: 'fear dark', category: 'mental', weight: 2 },
      { label: 'Страх болезни', rubric: 'fear disease', category: 'mental', weight: 2 },
      { label: 'Страх грозы', rubric: 'fear thunderstorm', category: 'mental', weight: 2 },
    ],
  },
  {
    key: 'food',
    label: 'Пищевые предпочтения',
    options: [
      { label: 'Желание солёного', rubric: 'desire salt', category: 'general', weight: 2 },
      { label: 'Желание сладкого', rubric: 'desire sweets', category: 'general', weight: 2 },
      { label: 'Желание кислого', rubric: 'desire sour', category: 'general', weight: 2 },
      { label: 'Отвращение к жирному', rubric: 'aversion fat', category: 'general', weight: 2 },
      { label: 'Желание стимуляторов', rubric: 'desire stimulants', category: 'general', weight: 2 },
    ],
  },
  {
    key: 'sleep',
    label: 'Сон',
    options: [
      { label: 'Хуже после сна', rubric: 'worse after sleep', category: 'general', weight: 3 },
      { label: 'Просыпается в 2-4 ночи', rubric: 'waking 2-4 am', category: 'particular', weight: 3 },
      { label: 'Спит на животе', rubric: 'sleep position abdomen', category: 'general', weight: 2 },
      { label: 'Трудно засыпает', rubric: 'insomnia', category: 'particular', weight: 2 },
      { label: 'Кошмары', rubric: 'insomnia', category: 'particular', weight: 1 },
    ],
  },
]

// --- Компонент ---

export default function DemoForm() {
  const [mode, setMode] = useState<DemoMode>('choose')
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<Record<string, Set<string>>>({}) // key → Set<rubric>
  const [results, setResults] = useState<DemoResult[] | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customText, setCustomText] = useState<Record<string, string>>({}) // key → свободный текст

  // Переключить чип (всегда multi-select)
  function toggleChip(questionKey: string, rubric: string) {
    setSelected(prev => {
      const current = new Set(prev[questionKey] ?? [])
      if (current.has(rubric)) current.delete(rubric)
      else current.add(rubric)
      return { ...prev, [questionKey]: current }
    })
  }

  // Собрать симптомы из выбранных чипов + свободного текста
  function getSymptoms(): SymptomEntry[] {
    const seen = new Set<string>()
    const symptoms: SymptomEntry[] = []
    for (const q of QUESTIONS) {
      const sel = selected[q.key]
      if (!sel) continue
      for (const opt of q.options) {
        if (sel.has(opt.rubric) && !seen.has(opt.rubric)) {
          seen.add(opt.rubric)
          symptoms.push({ rubric: opt.rubric, category: opt.category, present: true, weight: opt.weight })
        }
      }
    }
    // Свободный текст → симптомы (используем как рубрику напрямую)
    for (const [, text] of Object.entries(customText)) {
      if (!text?.trim()) continue
      // Каждая фраза через запятую — отдельный симптом
      for (const part of text.split(',')) {
        const rubric = part.trim().toLowerCase()
        if (rubric && !seen.has(rubric)) {
          seen.add(rubric)
          symptoms.push({ rubric, category: 'particular', present: true, weight: 2 })
        }
      }
    }
    return symptoms
  }

  const totalSelected = Object.values(selected).reduce((sum, s) => sum + s.size, 0)
    + Object.values(customText).filter(t => t?.trim()).length

  // Пресет — мгновенный результат
  function loadPreset(idx: number) {
    const key = PRESET_KEYS[idx]
    const demo = DEMO_RESULTS[key]
    setResults(demo.results)
    setRemaining(null)
    setMode('result')
  }

  // Анализ через API (только MDRI, без Sonnet)
  async function handleAnalyze() {
    const symptoms = getSymptoms()
    if (symptoms.length < 3) {
      setError('Выберите минимум 3 симптома')
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
      setMode('result')
    } catch {
      setError('Ошибка сети')
      setMode('questions')
    } finally {
      setLoading(false)
    }
  }

  function handleRestart() {
    setMode('choose')
    setStep(0)
    setSelected({})
    setCustomText({})
    setResults(null)
    setError('')
  }

  const confidenceLabels: Record<string, string> = {
    'high': 'Высокая', 'medium': 'Средняя', 'low': 'Низкая', 'insufficient': 'Недостаточно',
  }
  const confidenceColors: Record<string, string> = {
    'high': 'var(--sim-green)', 'medium': '#3b82f6', 'low': '#f59e0b', 'insufficient': '#ef4444',
  }

  // ═══ ВЫБОР РЕЖИМА ═══
  if (mode === 'choose') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode('questions')}
          className="w-full rounded-xl p-5 text-left transition-all hover:shadow-md bg-white border border-(--sim-border)"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#2d6a4f]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#2d6a4f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1a0a]">Пошаговый опрос</p>
              <p className="text-xs text-[#9a8a6a]">9 вопросов · 2 минуты · выбирайте несколько ответов</p>
            </div>
          </div>
          <p className="text-xs text-[#9a8a6a] ml-[52px]">
            Жалобы → Модальности → Температура → Психика → Страхи → Еда → Сон → Результат
          </p>
        </button>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1 text-[#9a8a6a]">
            Или попробуйте готовый случай
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { name: 'Горе, подавленные эмоции', desc: 'Закрытый, плачет в одиночестве' },
              { name: 'Тревога, ночное беспокойство', desc: 'Страх смерти, маленькие глотки' },
              { name: 'Раздражительность, пищеварение', desc: 'Зябкий, любит стимуляторы' },
            ].map((p, i) => (
              <button
                key={i}
                onClick={() => loadPreset(i)}
                className="rounded-xl p-3 text-left transition-all hover:shadow-md bg-white border border-(--sim-border)"
              >
                <p className="text-sm font-medium text-[#1a1a0a]">{p.name}</p>
                <p className="text-[11px] text-[#9a8a6a] mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══ ВОПРОСЫ ═══
  if (mode === 'questions') {
    const q = QUESTIONS[step]
    const sel = selected[q.key] ?? new Set<string>()

    return (
      <div className="space-y-4">
        {/* Прогресс */}
        <div className="rounded-xl overflow-hidden bg-white border border-(--sim-border)">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-(--sim-border)">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : setMode('choose')}
              className="text-xs text-[#9a8a6a] hover:text-[#1a1a0a] flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Назад
            </button>
            <span className="text-xs text-[#9a8a6a] font-medium">{step + 1} / {QUESTIONS.length}</span>
            <span className="text-xs text-[#2d6a4f] font-medium">
              {totalSelected > 0 ? `${totalSelected} выбрано` : ''}
            </span>
          </div>

          {/* Полоска прогресса */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-[#2d6a4f] transition-all duration-300"
              style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>

          {/* Вопрос */}
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-base font-semibold text-[#1a1a0a]">{q.label}</h3>
            <p className="text-xs text-[#9a8a6a] mt-0.5">Можно выбрать несколько</p>
          </div>

          {/* Чипы — ВСЕГДА multi-select */}
          <div className="px-5 pb-5 pt-2">
            <div className="flex flex-wrap gap-2">
              {q.options.map(opt => {
                const isActive = sel.has(opt.rubric)
                return (
                  <button
                    key={opt.rubric + opt.label}
                    onClick={() => toggleChip(q.key, opt.rubric)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-[#2d6a4f] border-[#2d6a4f] text-white shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        isActive ? 'border-white bg-white/20' : 'border-gray-300'
                      }`}>
                        {isActive && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Свободный ввод "Другое" */}
            <div className="mt-3">
              <input
                type="text"
                value={customText[q.key] ?? ''}
                onChange={e => setCustomText(prev => ({ ...prev, [q.key]: e.target.value }))}
                placeholder="Другое (через запятую)..."
                className="w-full text-sm bg-[#faf7f2] border border-(--sim-border) rounded-lg px-3 py-2.5 text-[#1a1a0a] placeholder:text-[#9a8a6a] focus:outline-none focus:border-[#2d6a4f]"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Кнопка далее / анализировать */}
        <button
          onClick={() => {
            if (step < QUESTIONS.length - 1) {
              setStep(s => s + 1)
            } else {
              handleAnalyze()
            }
          }}
          className="btn btn-primary w-full py-3.5 text-sm"
        >
          {step === QUESTIONS.length - 1
            ? `Анализировать${totalSelected > 0 ? ` (${totalSelected})` : ''}`
            : 'Далее →'}
        </button>
      </div>
    )
  }

  // ═══ АНАЛИЗ ═══
  if (mode === 'analyzing') {
    return (
      <div className="rounded-xl p-8 text-center bg-white border border-(--sim-border)">
        <div className="w-12 h-12 rounded-full bg-[#2d6a4f]/10 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-[#2d6a4f] animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-sm text-[#1a1a0a] font-medium">MDRI Engine анализирует...</p>
        <p className="text-xs text-[#9a8a6a] mt-1">8 линз · реперторизация · матчинг</p>
      </div>
    )
  }

  // ═══ РЕЗУЛЬТАТ ═══
  if (mode === 'result' && results) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden border border-(--sim-border) bg-white">
          <div className="px-5 py-3 flex items-center justify-between border-b border-(--sim-border)">
            <div>
              <p className="text-xs font-semibold text-[#2d6a4f]">Результат MDRI-анализа</p>
              {remaining !== null && (
                <p className="text-[10px] mt-0.5 text-[#9a8a6a]">Осталось демо-запросов: {remaining}</p>
              )}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6366f1]/10 text-[#6366f1] font-medium">
              MDRI Engine
            </span>
          </div>
          <div className="divide-y divide-(--sim-border)/50">
            {results.map((r, i) => (
              <div key={r.remedy} className="px-5 py-3.5 flex items-center gap-3 ai-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-[#2d6a4f] text-white' : 'bg-gray-100 text-[#3a3020]'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="text-sm font-bold text-[#1a1a0a] uppercase">{r.remedy}</span>
                  <span className="text-xs text-[#9a8a6a] ml-1.5">{r.remedyName}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-base font-bold ${i === 0 ? 'text-[#2d6a4f]' : 'text-[#9a8a6a]'}`}>
                    {r.totalScore}%
                  </span>
                  <span className="block text-[10px] font-medium" style={{ color: confidenceColors[r.confidence] }}>
                    {confidenceLabels[r.confidence]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 text-center border-t border-(--sim-border)/50">
            <p className="text-[11px] text-[#9a8a6a]">
              В полной версии: детали по 8 линзам, AI-гомеопат, потенция, differential
            </p>
          </div>
        </div>

        <button onClick={handleRestart} className="btn btn-primary w-full" style={{ backgroundColor: 'transparent', color: 'var(--sim-green)', border: '1px solid #2d6a4f' }}>
          Попробовать другой случай
        </button>
      </div>
    )
  }

  return null
}
