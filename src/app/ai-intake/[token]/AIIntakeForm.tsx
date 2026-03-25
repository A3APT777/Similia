'use client'

import { useState, useEffect, useRef } from 'react'
import { submitAIIntake } from '@/lib/actions/ai-intake'

// --- Типы ---

type FieldType = 'textarea' | 'text' | 'chips' | 'chips-multi' | 'scale'

type Field = {
  key: string
  label: string
  type: FieldType
  options?: string[]
  hint?: string
  required?: boolean
}

type Step = {
  title: string
  subtitle: string
  fields: Field[]
}

type Props = {
  token: string
  steps: Step[]
}

// --- Компонент ---

export default function AIIntakeForm({ token, steps }: Props) {
  const DRAFT_KEY = `ai_intake_draft_${token}`
  const restoredRef = useRef(false)

  const [step, setStep] = useState(-1) // -1 = приветствие
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [draftRestored, setDraftRestored] = useState(false)

  // Восстановить черновик
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as { step: number; answers: Record<string, string> }
      if (draft.answers && Object.keys(draft.answers).length > 0) {
        setAnswers(draft.answers)
        if (typeof draft.step === 'number' && draft.step >= 0) {
          setStep(draft.step)
          setDraftRestored(true)
        }
      }
    } catch { /* игнорируем */ }
  }, [DRAFT_KEY])

  // Сохранять черновик
  useEffect(() => {
    if (done) return
    try {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, answers }))
      }
    } catch { /* игнорируем */ }
  }, [answers, step, done, DRAFT_KEY])

  const totalSteps = steps.length
  const currentStep = steps[step]

  function setField(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function toggleMultiChip(key: string, opt: string) {
    const current = answers[key] ? answers[key].split(',').map(s => s.trim()).filter(Boolean) : []
    const next = current.includes(opt) ? current.filter(s => s !== opt) : [...current, opt]
    setAnswers(prev => ({ ...prev, [key]: next.join(', ') }))
  }

  function canProceed(): boolean {
    if (step < 0) return true
    return currentStep.fields.filter(f => f.required).every(f => (answers[f.key] || '').trim().length > 0)
  }

  async function handleNext() {
    if (step < totalSteps - 1) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSubmitting(true)
      setSubmitError('')
      try {
        await submitAIIntake(token, answers)
        try { localStorage.removeItem(DRAFT_KEY) } catch { /* игнорируем */ }
        setDone(true)
      } catch {
        setSubmitError('Не удалось сохранить анкету. Проверьте соединение и попробуйте ещё раз.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  function handleBack() {
    setStep(s => Math.max(-1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Готово
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Анкета отправлена!</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Спасибо за подробные ответы. AI подготовит персональный анализ к вашему визиту.
          </p>
        </div>
      </div>
    )
  }

  // Приветствие
  if (step === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-indigo-50 via-white to-white">
        <div className="max-w-sm w-full">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Персональная анкета</h1>
              <p className="text-xs text-gray-400 mt-0.5">Подготовлена AI на основе вашей истории</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Эта анкета создана специально для вас — вопросы подобраны с учётом вашей истории болезни и предыдущих назначений.
          </p>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '✨', text: `${totalSteps} разделов · 10–15 мин` },
                { icon: '🔒', text: 'Только ваш врач' },
                { icon: '🎯', text: 'Персональные вопросы' },
                { icon: '🤖', text: 'AI-анализ ответов' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base leading-none">{item.icon}</span>
                  <p className="text-xs text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {draftRestored && (
            <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs border bg-indigo-50 border-indigo-200 text-indigo-700">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Найден незавершённый черновик — продолжите с места остановки.</span>
            </div>
          )}

          <button
            onClick={() => draftRestored ? setStep(step) : setStep(0)}
            className="w-full font-semibold text-sm py-3 rounded-xl transition-colors shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {draftRestored ? 'Продолжить →' : 'Начать заполнение →'}
          </button>

          {draftRestored && (
            <button
              onClick={() => {
                try { localStorage.removeItem(DRAFT_KEY) } catch { /* игнорируем */ }
                setAnswers({})
                setStep(0)
                setDraftRestored(false)
              }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
            >
              Начать заново
            </button>
          )}
        </div>
      </div>
    )
  }

  // Шаги
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Прогресс */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div
          className="h-1 transition-all duration-500 bg-indigo-500"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <span className="text-xs text-gray-400 font-medium">{step + 1} / {totalSteps}</span>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{currentStep.title}</h2>
          {currentStep.subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{currentStep.subtitle}</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          {currentStep.fields.map((field, fieldIdx) => (
            <div
              key={field.key}
              className={`px-4 py-3.5 ${fieldIdx < currentStep.fields.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <label className="block text-[13px] font-semibold text-gray-700 mb-1 leading-snug">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.hint && (
                <p className="text-[12px] text-gray-400 mb-2 leading-relaxed">{field.hint}</p>
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  rows={3}
                  className="w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-4 focus:border-indigo-400 focus:ring-indigo-500/10 transition-all"
                />
              )}

              {field.type === 'text' && (
                <input
                  type="text"
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  className="w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-4 focus:border-indigo-400 focus:ring-indigo-500/10 transition-all"
                />
              )}

              {field.type === 'chips' && field.options && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField(field.key, answers[field.key] === opt ? '' : opt)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        answers[field.key] === opt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'chips-multi' && field.options && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map(opt => {
                    const selected = (answers[field.key] || '').split(',').map(s => s.trim()).includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleMultiChip(field.key, opt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}

              {field.type === 'scale' && (
                <div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 mb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setField(field.key, String(n))}
                        className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                          answers[field.key] === String(n)
                            ? n <= 3 ? 'bg-emerald-500 text-white border-emerald-500'
                              : n <= 6 ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-red-500 text-white border-red-500'
                            : 'border-gray-200 text-gray-500 bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[12px] text-gray-300">
                    <span>Почти не мешает</span>
                    <span>Невыносимо</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка снизу */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto space-y-3">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="w-full font-semibold text-sm py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting ? 'Отправляю...' : step === totalSteps - 1 ? 'Отправить анкету' : 'Далее →'}
          </button>
        </div>
      </div>
    </div>
  )
}
