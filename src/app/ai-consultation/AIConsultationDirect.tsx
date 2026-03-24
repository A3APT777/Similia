'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeText } from '@/lib/actions/ai-consultation'
import type { ConsensusResult } from '@/lib/mdri/types'
import type { Lang } from '@/hooks/useLanguage'

type Patient = { id: string; name: string; constitutional_type: string | null }

type Props = {
  patients: Patient[]
  lang: Lang
}

export default function AIConsultationDirect({ patients, lang }: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [step, setStep] = useState<'input' | 'analyzing' | 'result' | 'assign'>('input')
  const [result, setResult] = useState<ConsensusResult | null>(null)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string>('')

  async function handleAnalyze() {
    if (!text.trim()) return
    setStep('analyzing')
    setError('')
    try {
      const res = await analyzeText({ text: text.trim() })
      setResult(res)
      setStep('result')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка'
      if (msg === 'NO_AI_ACCESS') {
        setError(lang === 'ru' ? 'Нет доступа к AI. Оформите подписку AI Pro или купите пакет кредитов.' : 'No AI access. Subscribe to AI Pro or buy credits.')
      } else {
        setError(lang === 'ru' ? 'Ошибка AI-анализа. Попробуйте ещё раз.' : 'AI analysis error. Try again.')
      }
      setStep('input')
    }
  }

  // Шаг 1: Ввод симптомов
  if (step === 'input') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <div className="mb-6" style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.1))' }} />
          <h1
            className="text-[28px] sm:text-[36px] font-light leading-[1.15] tracking-[-0.01em] mb-2"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
          >
            {lang === 'ru' ? 'AI-анализ случая' : 'AI Case Analysis'}
          </h1>
          <p className="text-[14px]" style={{ color: 'var(--sim-text-muted)' }}>
            {lang === 'ru'
              ? 'Опишите симптомы пациента — AI предложит препараты с обоснованием'
              : 'Describe patient symptoms — AI will suggest remedies with reasoning'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Симптомы' : 'Symptoms'}
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={lang === 'ru'
                ? 'Женщина 42 года. Горе после потери матери. Закрылась, плачет наедине. Хуже от утешения. Желание солёного. Головные боли от солнца...'
                : 'Woman 42. Grief after mother loss. Closed off, cries alone. Worse consolation. Desires salt. Headaches from sun...'}
              rows={8}
              autoFocus
              className="w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 focus:outline-none resize-none leading-relaxed"
              style={{ backgroundColor: 'var(--sim-bg-card)', borderColor: 'var(--sim-border)', color: 'var(--sim-text)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(45,106,79,0.06)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>

          {error && (
            <p className="text-[13px]" style={{ color: '#dc2626' }}>{error}</p>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!text.trim()}
            className="btn btn-primary w-full py-3.5"
          >
            {lang === 'ru' ? 'Анализировать' : 'Analyze'}
          </button>

          <p className="text-[12px] text-center" style={{ color: 'var(--sim-text-muted)' }}>
            {lang === 'ru'
              ? 'Комплексный анализ по 5 методам'
              : 'Comprehensive 5-method analysis'}
          </p>
        </div>
      </div>
    )
  }

  // Шаг 2: Анализ
  if (step === 'analyzing') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
          <svg className="w-5 h-5 animate-spin" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2
          className="text-[24px] font-light mb-2"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
        >
          {lang === 'ru' ? 'Анализирую...' : 'Analyzing...'}
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
          {lang === 'ru' ? 'Реперторный анализ + анализ паттернов' : 'Repertory analysis + pattern matching'}
        </p>
      </div>
    )
  }

  // Шаг 3: Результат
  if (step === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6" style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.1))' }} />

        <h2
          className="text-[24px] font-light mb-6"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
        >
          {lang === 'ru' ? 'Результат анализа' : 'Analysis Result'}
        </h2>

        {/* Топ препарат */}
        <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Рекомендация' : 'Recommendation'}
            </p>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.06)', color: 'var(--sim-green)' }}>
              {result.productConfidence?.label || result.method}
            </span>
          </div>
          <p
            className="text-[32px] font-light tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
          >
            {result.finalRemedy}
          </p>
          {result.mdriResults?.[0]?.potency && (
            <p className="text-sm mt-1" style={{ color: 'var(--sim-green)' }}>
              {typeof result.mdriResults[0].potency === 'string'
                ? result.mdriResults[0].potency
                : result.mdriResults[0].potency.potency}
            </p>
          )}
          {result.aiResult?.reasoning && (
            <p className="text-[13px] mt-3 leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
              {result.aiResult.reasoning}
            </p>
          )}
        </div>

        {/* Топ-5 из MDRI */}
        {result.mdriResults && result.mdriResults.length > 1 && (
          <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Альтернативы' : 'Alternatives'}
            </p>
            <div className="space-y-2">
              {result.mdriResults.slice(1, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < Math.min(result.mdriResults.length - 2, 3) ? '1px solid var(--sim-border)' : 'none' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>{r.remedy}</span>
                  <span className="text-[12px] tabular-nums" style={{ color: 'var(--sim-text-muted)' }}>{r.totalScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="space-y-3">
          <button
            onClick={() => setStep('assign')}
            className="btn btn-primary w-full py-3"
          >
            {lang === 'ru' ? 'Назначить пациенту' : 'Assign to patient'}
          </button>

          <button
            onClick={() => { setStep('input'); setResult(null); setText('') }}
            className="w-full py-3 text-sm rounded-full transition-all duration-200 hover:bg-black/[0.03]"
            style={{ color: 'var(--sim-text-muted)', border: '1px solid var(--sim-border)' }}
          >
            {lang === 'ru' ? 'Новый анализ' : 'New analysis'}
          </button>
        </div>
      </div>
    )
  }

  // Шаг 4: Выбор пациента для назначения
  if (step === 'assign') {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6" style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.1))' }} />

        <h2
          className="text-[24px] font-light mb-2"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
        >
          {lang === 'ru' ? 'Кому назначить?' : 'Assign to whom?'}
        </h2>
        <p className="text-[13px] mb-6" style={{ color: 'var(--sim-text-muted)' }}>
          {result?.finalRemedy} {typeof result?.mdriResults?.[0]?.potency === 'string' ? result.mdriResults[0].potency : result?.mdriResults?.[0]?.potency?.potency || '30C'}
        </p>

        {patients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13px] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Нет пациентов. Создайте первого.' : 'No patients. Create one first.'}
            </p>
            <button
              onClick={() => router.push('/patients/new')}
              className="btn btn-primary"
            >
              {lang === 'ru' ? 'Создать пациента' : 'Create patient'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatient(p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left"
                style={{
                  backgroundColor: selectedPatient === p.id ? 'rgba(45,106,79,0.06)' : 'var(--sim-bg-card)',
                  border: `1px solid ${selectedPatient === p.id ? 'var(--sim-green)' : 'var(--sim-border)'}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-semibold shrink-0"
                  style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--sim-green)' }}
                >
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--sim-text)' }}>{p.name}</p>
                  {p.constitutional_type && (
                    <p className="text-[12px] truncate" style={{ color: 'var(--sim-text-muted)' }}>{p.constitutional_type}</p>
                  )}
                </div>
                {selectedPatient === p.id && (
                  <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedPatient && (
          <button
            onClick={() => {
              // Перейти к консультации с предзаполненным препаратом
              const rx = encodeURIComponent(result?.finalRemedy || '')
              const p = result?.mdriResults?.[0]?.potency
              const potency = encodeURIComponent(typeof p === 'string' ? p : p?.potency || '30C')
              router.push(`/patients/${selectedPatient}?rx=${rx}&potency=${potency}`)
            }}
            className="btn btn-primary w-full py-3"
          >
            {lang === 'ru' ? 'Назначить и открыть карточку' : 'Assign and open card'}
          </button>
        )}

        <button
          onClick={() => setStep('result')}
          className="w-full mt-3 py-2.5 text-[13px] transition-colors hover:underline"
          style={{ color: 'var(--sim-text-muted)' }}
        >
          {lang === 'ru' ? '← Назад к результату' : '← Back to result'}
        </button>
      </div>
    )
  }

  return null
}
