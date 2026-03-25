'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeText, logClarifyResult, logDoctorFeedback } from '@/lib/actions/ai-consultation'
import type { ConsensusResult } from '@/lib/mdri/types'
import type { ClarifyQuestion } from '@/lib/mdri/question-gain'
import { applyClarifyBonus } from '@/lib/mdri/question-gain'
import type { Lang } from '@/hooks/useLanguage'
import './ai-styles.css'

type Patient = { id: string; name: string; constitutional_type: string | null }

type Props = {
  patients: Patient[]
  lang: Lang
  aiStatus?: { isAIPro: boolean; credits: number }
}

const PLACEHOLDERS_RU = [
  'Опишите жалобы пациента...',
  'Зябкий, раздражительный, хуже ночью...',
  'Головная боль от солнца, любит солёное...',
  'Ребёнок, потеет голова, поздно пошёл...',
  'Боли в суставах, первое движение хуже...',
  'Плачет одна, не переносит утешения...',
]

const PLACEHOLDERS_EN = [
  'Describe patient symptoms...',
  'Chilly, irritable, worse at night...',
  'Headache from sun, desires salt...',
  'Child, head sweats, late walking...',
  'Joint pain, first motion worse...',
  'Weeps alone, aversion to consolation...',
]

// Анимированный placeholder с blur-эффектом (чистый CSS)
function AnimatedPlaceholder({ texts, active }: { texts: string[]; active: boolean }) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'visible' | 'fading' | 'hidden'>('visible')

  useEffect(() => {
    if (active) return
    const interval = setInterval(() => {
      setPhase('fading')
      setTimeout(() => {
        setPhase('hidden')
        setTimeout(() => {
          setIndex(prev => (prev + 1) % texts.length)
          setPhase('visible')
        }, 150)
      }, 300)
    }, 3500)
    return () => clearInterval(interval)
  }, [active, texts.length])

  if (active) return null

  return (
    <span
      className="pointer-events-none select-none absolute inset-0 flex items-start pt-3 px-4 text-sm leading-relaxed"
      style={{
        color: 'var(--sim-text-muted)',
        opacity: phase === 'visible' ? 0.6 : phase === 'fading' ? 0 : 0,
        filter: phase === 'visible' ? 'blur(0px)' : 'blur(8px)',
        transform: phase === 'visible' ? 'translateY(0)' : phase === 'fading' ? 'translateY(-6px)' : 'translateY(6px)',
        transition: phase === 'visible'
          ? 'opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease'
          : 'opacity 0.3s ease, filter 0.3s ease, transform 0.3s ease',
      }}
    >
      {texts[index]}
    </span>
  )
}

export default function AIConsultationDirect({ patients, lang, aiStatus }: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [step, setStep] = useState<'input' | 'analyzing' | 'result' | 'clarify' | 'assign'>('input')
  const [result, setResult] = useState<ConsensusResult | null>(null)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [clarifyCount, setClarifyCount] = useState(0)       // макс 2 вопроса
  const [top1Flipped, setTop1Flipped] = useState(false)     // контроль oscillation
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasContent = text.trim().length > 0

  // Автоматическая высота textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const minH = isFocused || hasContent ? 160 : 56
    el.style.height = Math.max(minH, Math.min(el.scrollHeight, 320)) + 'px'
  }, [isFocused, hasContent])

  useEffect(() => { adjustHeight() }, [text, isFocused, adjustHeight])

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

  // Отправка по Ctrl+Enter
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim()) {
      e.preventDefault()
      handleAnalyze()
    }
  }

  // QuestionGain: вопрос вычислен на сервере
  const clarifyQ = result?._clarifyQuestion ?? null
  const needsClarify = clarifyCount < 2 && clarifyQ !== null

  function handleClarifyAnswer(optionLabel: string) {
    if (!result?.mdriResults || !clarifyQ) return
    const option = clarifyQ.options.find(o => o.label === optionLabel)
    if (!option) return

    if (option.neutral) {
      // "Не знаю" → показать сравнение top-3
      setStep('clarify')
      return
    }

    // Единственный источник bonus-логики: applyClarifyBonus (с 20% clamp)
    const oldTop1 = result.mdriResults[0]?.remedy
    const adjusted = applyClarifyBonus(result.mdriResults, option)
    const newTop1 = adjusted[0]?.remedy

    // Stability: если top-1 уже менялся — второй flip запрещён
    const flipBlocked = newTop1 !== oldTop1 && top1Flipped
    if (flipBlocked) {
      setClarifyCount(prev => prev + 1)
      // Логирование: flip заблокирован
      logClarifyResult({
        clarifyUsed: true, clarifyFeature: clarifyQ.feature, clarifyGain: clarifyQ.gain,
        clarifyAnswer: optionLabel, top1Changed: false, flipBlocked: true,
        beforeTop3: result.mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
        afterTop3: adjusted.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
        gapBefore: result.mdriResults[0].totalScore - (result.mdriResults[1]?.totalScore ?? 0),
        gapAfter: adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0),
      }).catch(() => {})
      return
    }

    if (newTop1 !== oldTop1) setTop1Flipped(true)
    setResult({ ...result, mdriResults: adjusted, finalRemedy: adjusted[0]?.remedy ?? result.finalRemedy })
    setClarifyCount(prev => prev + 1)

    // Логирование clarify
    logClarifyResult({
      clarifyUsed: true, clarifyFeature: clarifyQ.feature, clarifyGain: clarifyQ.gain,
      clarifyAnswer: optionLabel, top1Changed: newTop1 !== oldTop1, flipBlocked: false,
      beforeTop3: result.mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
      afterTop3: adjusted.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
      gapBefore: result.mdriResults[0].totalScore - (result.mdriResults[1]?.totalScore ?? 0),
      gapAfter: adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0),
    }).catch(() => {})
  }

  function handleComparisonChoice(remedy: string) {
    if (!result?.mdriResults) return
    const oldTop1 = result.mdriResults[0]?.remedy

    // Comparison choice = boost через applyClarifyBonus
    const boostOption = { label: remedy, supports: [remedy], boost: 20 }
    const adjusted = applyClarifyBonus(result.mdriResults, boostOption)
    const newTop1 = adjusted[0]?.remedy

    // Stability: второй flip запрещён
    if (newTop1 !== oldTop1 && top1Flipped) {
      setClarifyCount(prev => prev + 1)
      setStep('result')
      return
    }

    if (newTop1 !== oldTop1) setTop1Flipped(true)
    setResult({ ...result, mdriResults: adjusted, finalRemedy: adjusted[0]?.remedy ?? result.finalRemedy })
    setClarifyCount(prev => prev + 1)
    setStep('result')
  }

  // ═══════════════════════════════════════
  // Шаг 1: Ввод симптомов — анимированный
  // ═══════════════════════════════════════
  if (step === 'input') {
    const placeholders = lang === 'ru' ? PLACEHOLDERS_RU : PLACEHOLDERS_EN

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Баннер кредитов */}
        {aiStatus && !aiStatus.isAIPro && (
          <div className="mb-6 flex items-center justify-between rounded-full px-4 py-2.5" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.12)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: aiStatus.credits > 0 ? 'var(--sim-green)' : '#dc2626' }} />
              <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
                {aiStatus.credits > 0
                  ? `${aiStatus.credits} ${aiStatus.credits === 1 ? 'анализ' : aiStatus.credits < 5 ? 'анализа' : 'анализов'} доступно`
                  : 'Нет доступных анализов'}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--sim-text-muted)', opacity: 0.7 }}>
              1 анализ = 1 кредит
            </span>
          </div>
        )}
        {aiStatus?.isAIPro && (
          <div className="mb-6 flex items-center gap-2 rounded-full px-4 py-2.5" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.12)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--sim-green)' }} />
            <span className="text-[12px]" style={{ color: 'var(--sim-green)' }}>AI Pro — безлимитные анализы</span>
          </div>
        )}

        {/* Заголовок */}
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

        {/* Анимированный input с gradient border */}
        <div className={`ai-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <div className="ai-input-inner relative">
          {/* Placeholder анимация */}
          {!hasContent && (
            <AnimatedPlaceholder texts={placeholders} active={isFocused} />
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { if (!hasContent) setIsFocused(false) }}
            placeholder={isFocused ? (lang === 'ru' ? 'Опишите жалобы, модальности, характер...' : 'Describe complaints, modalities, character...') : ''}
            autoFocus
            className="w-full px-4 pt-3 pb-14 text-sm bg-transparent border-0 outline-none resize-none leading-relaxed"
            style={{
              color: 'var(--sim-text)',
              minHeight: isFocused || hasContent ? '160px' : '56px',
              transition: 'min-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Нижняя панель */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5"
            style={{
              background: 'linear-gradient(to top, var(--sim-bg-card) 60%, transparent)',
              opacity: isFocused || hasContent ? 1 : 0,
              transform: isFocused || hasContent ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.35s ease',
              pointerEvents: isFocused || hasContent ? 'auto' : 'none',
            }}
          >
            <span className="text-[11px]" style={{ color: 'var(--sim-text-muted)' }}>
              {hasContent
                ? `${text.trim().split(/\s+/).length} ${lang === 'ru' ? 'слов' : 'words'}`
                : (lang === 'ru' ? 'Ctrl+Enter — анализ' : 'Ctrl+Enter — analyze')}
            </span>

            <button
              onClick={handleAnalyze}
              disabled={!hasContent}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300"
              style={{
                backgroundColor: hasContent ? '#1e3a2f' : 'rgba(45,106,79,0.1)',
                color: hasContent ? '#ffffff' : '#8a7e6c',
                border: 'none',
                boxShadow: hasContent ? '0 4px 12px rgba(30,58,47,0.3)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              {lang === 'ru' ? 'Анализировать' : 'Analyze'}
            </button>
          </div>
        </div>
        </div>

        {/* Ошибка */}
        {error && (
          <p className="text-[13px] mt-3" style={{ color: 'var(--sim-red, #dc2626)' }}>{error}</p>
        )}

        {/* Подпись */}
        <p
          className="text-[11px] text-center mt-4"
          style={{
            color: 'var(--sim-text-muted)',
            opacity: 0.6,
          }}
        >
          {lang === 'ru' ? 'Комплексный анализ по 5 методам' : 'Comprehensive 5-method analysis'}
        </p>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Шаг 2: Анализ (спиннер)
  // ═══════════════════════════════════════
  if (step === 'analyzing') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Orb animation container */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="orb orb-1" style={{ top: '20%', left: '15%' }} />
          <div className="orb orb-2" style={{ top: '45%', right: '10%' }} />
          <div className="orb orb-3" style={{ bottom: '15%', left: '30%' }} />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center glass-card">
              <svg className="w-7 h-7" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2
            className="text-[28px] font-light mb-3 shimmer-text"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}
          >
            {lang === 'ru' ? 'Анализирую случай' : 'Analyzing case'}
          </h2>

          {/* Analysis steps - appear one by one */}
          <div className="space-y-2 max-w-xs mx-auto">
            {[
              { text: lang === 'ru' ? 'Реперторизация по Кенту' : 'Kent repertorization', delay: '0.2s' },
              { text: lang === 'ru' ? 'Анализ полярностей' : 'Polarity analysis', delay: '1.5s' },
              { text: lang === 'ru' ? 'Иерархия симптомов' : 'Symptom hierarchy', delay: '3s' },
              { text: lang === 'ru' ? 'Констелляции и паттерны' : 'Constellations & patterns', delay: '4.5s' },
              { text: lang === 'ru' ? 'Формирование рекомендации' : 'Building recommendation', delay: '6s' },
            ].map((s, i) => (
              <div
                key={i}
                className="analysis-step flex items-center gap-2 justify-center"
                style={{ animationDelay: s.delay }}
              >
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--sim-green)' }} />
                <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Шаг 3: Результат
  // ═══════════════════════════════════════
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

        {/* Топ препарат — glassmorphism card */}
        <div className="result-card glass-card rounded-2xl p-6 mb-4" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Рекомендация' : 'Recommendation'}
            </p>
            <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--sim-green)' }}>
              {result.productConfidence?.label || result.method}
            </span>
          </div>
          <p
            className="text-[36px] sm:text-[42px] font-light tracking-[-0.03em] leading-tight"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
          >
            {result.finalRemedy}
          </p>
          {result.mdriResults?.[0]?.potency && (
            <p className="text-[15px] mt-2 font-medium" style={{ color: 'var(--sim-green)' }}>
              {typeof result.mdriResults[0].potency === 'string'
                ? result.mdriResults[0].potency
                : result.mdriResults[0].potency.potency}
            </p>
          )}

          {/* Confidence meter */}
          {result.mdriResults?.[0]?.totalScore && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--sim-text-muted)' }}>
                  {lang === 'ru' ? 'Уверенность' : 'Confidence'}
                </span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--sim-green)' }}>
                  {result.productConfidence?.level === 'high' ? (lang === 'ru' ? 'Высокая' : 'High')
                    : result.productConfidence?.level === 'moderate' ? (lang === 'ru' ? 'Средняя' : 'Moderate')
                    : (lang === 'ru' ? 'Требует уточнения' : 'Needs clarification')}
                </span>
              </div>
              <div className="confidence-track">
                <div
                  className="confidence-fill"
                  style={{
                    width: result.productConfidence?.level === 'high' ? '90%'
                      : result.productConfidence?.level === 'moderate' ? '60%'
                      : '35%',
                    background: result.productConfidence?.level === 'high'
                      ? 'linear-gradient(90deg, var(--sim-green), #5a9e7c)'
                      : result.productConfidence?.level === 'moderate'
                        ? 'linear-gradient(90deg, #c8a035, #dbb84d)'
                        : 'linear-gradient(90deg, #d97706, #f59e0b)',
                  }}
                />
              </div>
            </div>
          )}

          {result.aiResult?.reasoning && (
            <p className="text-[13px] mt-4 leading-[1.7]" style={{ color: 'var(--sim-text-muted)' }}>
              {result.aiResult.reasoning}
            </p>
          )}
        </div>

        {/* Альтернативы — staggered glass cards */}
        {result.mdriResults && result.mdriResults.length > 1 && (
          <div className="result-card glass-card rounded-2xl p-5 mb-6" style={{ animationDelay: '0.3s' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
              {lang === 'ru' ? 'Альтернативы' : 'Alternatives'}
            </p>
            <div className="space-y-0">
              {result.mdriResults.slice(1, 5).map((r, i) => {
                const top1Score = result.mdriResults[0]?.totalScore ?? 100
                const gap = top1Score - r.totalScore
                const pct = Math.max(10, Math.round((r.totalScore / top1Score) * 100))
                return (
                  <div key={i} className="py-3" style={{ borderBottom: i < Math.min(result.mdriResults.length - 2, 3) ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-medium" style={{ color: 'var(--sim-text)' }}>{r.remedy}</span>
                      <span className="text-[11px] font-medium" style={{ color: gap < 10 ? 'var(--sim-green)' : 'var(--sim-text-muted)' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="confidence-track">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${pct}%`,
                          background: gap < 10
                            ? 'linear-gradient(90deg, var(--sim-green), #5a9e7c)'
                            : 'linear-gradient(90deg, var(--sim-border), rgba(45,106,79,0.2))',
                          transitionDelay: `${0.3 + i * 0.15}s`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Уточняющий вопрос — QuestionGain (1 лучший вопрос, без API) */}
        {needsClarify && clarifyQ && (
          <div className="result-card glass-card rounded-2xl p-5 mb-5" style={{ animationDelay: '0.5s', borderColor: 'rgba(200,160,53,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" style={{ color: '#c8a035' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-[13px] font-medium" style={{ color: '#92780a' }}>
                {clarifyQ.question}
              </p>
            </div>
            <div className="space-y-2 mt-3">
              {clarifyQ.options.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleClarifyAnswer(opt.label)}
                  className="w-full text-left py-2.5 px-4 text-[13px] rounded-xl transition-all duration-200 hover:opacity-90"
                  style={{
                    backgroundColor: opt.neutral ? 'transparent' : 'rgba(146,120,10,0.06)',
                    color: opt.neutral ? 'var(--sim-text-muted)' : 'var(--sim-text)',
                    border: `1px solid ${opt.neutral ? 'var(--sim-border)' : 'rgba(146,120,10,0.2)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="result-card space-y-3" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => setStep('assign')}
            className="w-full py-3.5 text-[14px] font-semibold rounded-full transition-all duration-300 hover:opacity-90"
            style={{
              backgroundColor: '#1e3a2f',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(30,58,47,0.3)',
            }}
          >
            {lang === 'ru' ? 'Назначить пациенту' : 'Assign to patient'}
          </button>

          <button
            onClick={() => { setStep('input'); setResult(null); setText(''); setClarifyCount(0); setTop1Flipped(false) }}
            className="w-full py-3 text-[13px] rounded-full transition-all duration-200 hover:bg-black/[0.03]"
            style={{ color: 'var(--sim-text-muted)', border: '1px solid var(--sim-border)' }}
          >
            {lang === 'ru' ? 'Новый анализ' : 'New analysis'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Шаг 3.5: Сравнение top-3 (fallback при "Не знаю")
  // ═══════════════════════════════════════
  if (step === 'clarify') {
    const comparison = clarifyQ?.fallbackComparison ?? result?.mdriResults?.slice(0, 3).map(r => ({
      remedy: r.remedy,
      keyFeature: r.remedyName || r.remedy,
    })) ?? []

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6" style={{ height: '3px', background: 'linear-gradient(to right, #c8a035, rgba(200,160,53,0.1))', borderRadius: '2px' }} />
        <h2
          className="text-[28px] font-light mb-2"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
        >
          {lang === 'ru' ? 'Что ближе к пациенту?' : 'Which fits the patient?'}
        </h2>
        <p className="text-[13px] mb-8" style={{ color: 'var(--sim-text-muted)' }}>
          {lang === 'ru'
            ? 'Три ближайших препарата. Выберите наиболее подходящий.'
            : 'Three closest remedies. Choose the best fit.'}
        </p>
        <div className="space-y-3 mb-8">
          {comparison.map((c, idx) => (
            <button
              key={c.remedy}
              onClick={() => handleComparisonChoice(c.remedy)}
              className="result-card w-full text-left glass-card rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01]"
              style={{ animationDelay: `${0.1 + idx * 0.12}s`, cursor: 'pointer' }}
            >
              <p className="text-[16px] font-semibold uppercase tracking-wide" style={{ color: 'var(--sim-text)' }}>
                {c.remedy}
              </p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--sim-text-muted)' }}>
                {c.keyFeature}
              </p>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setClarifyUsed(true); setStep('result') }}
          className="w-full py-3 text-[13px] rounded-full transition-all duration-200 hover:bg-black/[0.03]"
          style={{ color: 'var(--sim-text-muted)' }}
        >
          {lang === 'ru' ? 'Оставить текущий результат' : 'Keep current result'}
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Шаг 4: Выбор пациента для назначения
  // ═══════════════════════════════════════
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
              const chosenRemedy = result?.finalRemedy || ''
              // Сохранить doctor_choice (silent feedback)
              logDoctorFeedback(chosenRemedy).catch(() => {})
              const rx = encodeURIComponent(chosenRemedy)
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
