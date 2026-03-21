'use client'

import { useState, useEffect } from 'react'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const STORAGE_KEY = 'ai_onboarding_shown'
const TOTAL_SLIDES = 7

// Описания слайдов (русский/английский берём из i18n для заголовков)
const slideDescriptions = {
  ru: [
    'MDRI анализирует каждый случай через 8 независимых линз: Кент, Полярность, Иерархия, Созвездие, Негативный анализ, Миазм, AI-эксперт, Anti-domination',
    'Claude Sonnet анализирует случай как опытный гомеопат с 30-летним стажем, учитывая keynotes и критические различия между препаратами',
    'Если MDRI и AI-гомеопат расходятся — Opus арбитр выносит финальный вердикт. Точность: 76% top-1, 94% top-3',
    'AI изучает историю пациента и генерирует персональные вопросы. Пациент заполняет — врач получает структурированные данные',
    'Система рекомендует потенцию и дозировку на основе профиля: витальность, чувствительность, острое/хроническое',
    'Когда два препарата близки по баллам — AI формулирует уточняющий вопрос чтобы различить их',
    'Откройте карточку пациента и нажмите «AI-анализ» или создайте AI-анкету',
  ],
  en: [
    'MDRI analyzes each case through 8 independent lenses: Kent, Polarity, Hierarchy, Constellation, Negative analysis, Miasm, AI-expert, Anti-domination',
    'Claude Sonnet analyzes the case like an experienced homeopath with 30 years of practice, considering keynotes and critical differences between remedies',
    'When MDRI and AI homeopath disagree — Opus arbiter delivers the final verdict. Accuracy: 76% top-1, 94% top-3',
    'AI studies patient history and generates personalized questions. Patient fills them in — doctor receives structured data',
    'The system recommends potency and dosage based on profile: vitality, sensitivity, acute/chronic',
    'When two remedies are close in score — AI formulates a clarifying question to differentiate them',
    'Open a patient card and click "AI Analysis" or create an AI questionnaire',
  ],
} as const

// Цвета для 8 точек (слайд 1)
const lensColors = [
  '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#22d3ee', '#818cf8', '#c084fc', '#f472b6',
]

// SVG-иконки для каждого слайда
function SlideIcon({ index }: { index: number }) {
  const cls = 'w-10 h-10 text-indigo-300'
  switch (index) {
    case 0: // Sparkle
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM19.5 8.25l-.375-1.313a2.25 2.25 0 00-1.562-1.562L16.25 5l1.313-.375a2.25 2.25 0 001.562-1.562L19.5 1.75l.375 1.313a2.25 2.25 0 001.562 1.562L22.75 5l-1.313.375a2.25 2.25 0 00-1.562 1.562L19.5 8.25z" />
        </svg>
      )
    case 1: // Мозг / пользователь-эксперт
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    case 2: // Весы / баланс
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
        </svg>
      )
    case 3: // Документ / анкета
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      )
    case 4: // Пробирка / потенция
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      )
    case 5: // Стрелки / дифференциация
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      )
    case 6: // Ракета / старт
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      )
    default:
      return null
  }
}

// Визуал для слайда 1 — 8 точек в круге
function LensCircle() {
  return (
    <div className="relative w-32 h-32 mx-auto mt-4">
      {lensColors.map((color, i) => {
        const angle = (i / 8) * 2 * Math.PI - Math.PI / 2
        const x = 50 + 40 * Math.cos(angle)
        const y = 50 + 40 * Math.sin(angle)
        return (
          <div
            key={i}
            className="absolute w-4 h-4 rounded-full"
            style={{
              backgroundColor: color,
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 8px ${color}80`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        )
      })}
    </div>
  )
}

export default function AIOnboarding() {
  const { lang } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    // Показываем только если ещё не показывали
    const shown = localStorage.getItem(STORAGE_KEY)
    if (!shown) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const tr = t(lang).ai

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  function handleNext() {
    if (slide === TOTAL_SLIDES - 1) {
      handleClose()
    } else {
      setSlide(s => s + 1)
      setAnimKey(k => k + 1)
    }
  }

  const descriptions = slideDescriptions[lang]
  const slideKeys = [
    'onboardSlide1', 'onboardSlide2', 'onboardSlide3', 'onboardSlide4',
    'onboardSlide5', 'onboardSlide6', 'onboardSlide7',
  ] as const

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center ai-fade-in"
      style={{ backgroundColor: 'var(--sim-ai-dark)' }}
    >
      {/* Контент слайда */}
      <div
        key={animKey}
        className="ai-onboard-slide flex flex-col items-center text-center px-6 max-w-md w-full flex-1 justify-center"
      >
        {/* Иконка */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ backgroundColor: 'rgba(99,102,241,0.2)' }}
        >
          <SlideIcon index={slide} />
        </div>

        {/* Заголовок слайда */}
        <h2 className="text-xl font-semibold text-white mb-3">
          {tr[slideKeys[slide]]}
        </h2>

        {/* Описание */}
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(165,160,255,0.6)' }}>
          {descriptions[slide]}
        </p>

        {/* Визуал для первого слайда */}
        {slide === 0 && <LensCircle />}
      </div>

      {/* Нижняя панель */}
      <div className="w-full max-w-md px-6 pb-8">
        {/* Индикатор прогресса (точки) */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i === slide ? '#818cf8' : 'rgba(165,160,255,0.2)',
                transform: i === slide ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Кнопки */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleClose}
            className="btn btn-ai-outline px-4 py-2 text-sm"
          >
            {tr.onboardSkip}
          </button>

          <button
            onClick={handleNext}
            className="btn btn-ai px-6 py-2 text-sm"
          >
            {slide === TOTAL_SLIDES - 1 ? tr.onboardStart : `${tr.onboardNext} →`}
          </button>
        </div>
      </div>
    </div>
  )
}
