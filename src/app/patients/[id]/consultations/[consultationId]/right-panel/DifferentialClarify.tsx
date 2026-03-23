'use client'

import { useState } from 'react'
import type { DifferentialQuestion } from '@/lib/mdri/differential'

type Props = {
  questions: DifferentialQuestion[]
  onSubmit: (answers: Record<string, string>) => void
  onSkip: () => void
  loading?: boolean
}

export default function DifferentialClarify({ questions, onSubmit, onSkip, loading }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const answeredCount = Object.keys(answers).length

  function selectOption(key: string, label: string) {
    setAnswers(prev => {
      if (prev[key] === label) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: label }
    })
  }

  return (
    <div className="ai-slide-up rounded-2xl border border-amber-200/60 bg-amber-50/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-200/40 bg-amber-50/50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <span className="text-[13px] font-semibold text-amber-800">Уточняющие вопросы</span>
          <span className="text-[10px] text-amber-500 ml-auto">{answeredCount}/{questions.length}</span>
        </div>
        <p className="text-[11px] text-amber-600 mt-1">
          Эти вопросы помогут различить близкие препараты. Выберите подходящий вариант.
        </p>
      </div>

      <div className="p-3 space-y-3">
        {questions.map((q, idx) => {
          const selected = answers[q.key]
          return (
            <div key={q.key} className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600 shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-[#3a3020] leading-snug">{q.question}</p>
                  {q.why_it_matters && (
                    <p className="text-[10px] text-amber-500 mt-0.5">{q.why_it_matters}</p>
                  )}
                </div>
              </div>
              <div className="ml-7 flex flex-wrap gap-1">
                {q.options.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => selectOption(q.key, opt.label)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      selected === opt.label
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white border-[rgba(0,0,0,0.1)] text-[#6a5a4a] hover:border-amber-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-amber-200/40 flex gap-2">
        <button
          onClick={onSkip}
          className="px-4 text-[12px] font-medium py-2 rounded-xl border border-[rgba(0,0,0,0.1)] text-[#9a8a6a] hover:bg-[#f8f5f0] transition-colors"
        >
          Пропустить
        </button>
        <button
          onClick={() => onSubmit(answers)}
          disabled={answeredCount === 0 || loading}
          className="flex-1 text-[12px] font-semibold py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Пересчёт...' : `Уточнить и пересчитать (${answeredCount})`}
        </button>
      </div>
    </div>
  )
}
