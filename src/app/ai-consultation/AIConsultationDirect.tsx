'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeText, logClarifyResult, logDoctorFeedback } from '@/lib/actions/ai-consultation'
import type { ConsensusResult } from '@/lib/mdri/types'
import type { ClarifyQuestion } from '@/lib/mdri/question-gain'
import { applyClarifyBonus } from '@/lib/mdri/question-gain'
import type { Lang } from '@/hooks/useLanguage'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ShineBorder } from '@/components/ui/shine-border'
import { Gauge } from '@/components/ui/gauge-1'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from '@/components/ui/chat-bubble'
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

// Анимированный placeholder с blur-эффектом
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
        opacity: phase === 'visible' ? 0.6 : 0,
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

// Маппинг уровня confidence → значение для Gauge (0-100)
function confidenceToGaugeValue(level?: string): number {
  switch (level) {
    case 'high': return 92
    case 'good': return 72
    case 'clarify': return 45
    case 'insufficient': return 20
    default: return 50
  }
}

// Цвета Gauge по уровню confidence
function confidenceGaugeColors(level?: string) {
  switch (level) {
    case 'high': return { '0': '#2d6a4f', primary: '#2d6a4f', secondary: '#e8e4dc' }
    case 'good': return { '0': '#5a9e7c', primary: '#5a9e7c', secondary: '#e8e4dc' }
    case 'clarify': return { '0': '#c8a035', primary: '#c8a035', secondary: '#e8e4dc' }
    case 'insufficient': return { '0': '#d97706', primary: '#d97706', secondary: '#e8e4dc' }
    default: return { '0': '#6b7280', primary: '#6b7280', secondary: '#e8e4dc' }
  }
}

// Лейбл confidence на русском/английском
function confidenceLabel(level?: string, lang: Lang = 'ru') {
  const labels: Record<string, { ru: string; en: string }> = {
    high: { ru: 'Высокая уверенность', en: 'High confidence' },
    good: { ru: 'Хорошая уверенность', en: 'Good confidence' },
    clarify: { ru: 'Требует уточнения', en: 'Needs clarification' },
    insufficient: { ru: 'Недостаточно данных', en: 'Insufficient data' },
  }
  return labels[level || '']?.[lang] || (lang === 'ru' ? 'Анализ' : 'Analysis')
}

export default function AIConsultationDirect({ patients, lang, aiStatus }: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [step, setStep] = useState<'input' | 'analyzing' | 'result' | 'clarify' | 'assign'>('input')
  const [result, setResult] = useState<ConsensusResult | null>(null)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [clarifyCount, setClarifyCount] = useState(0)
  const [top1Flipped, setTop1Flipped] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
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

  // Ctrl+Enter → анализ
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
      setStep('clarify')
      return
    }

    const oldTop1 = result.mdriResults[0]?.remedy
    const adjusted = applyClarifyBonus(result.mdriResults, option)
    const newTop1 = adjusted[0]?.remedy

    // Stability: если top-1 уже менялся — второй flip запрещён
    const flipBlocked = newTop1 !== oldTop1 && top1Flipped
    if (flipBlocked) {
      setClarifyCount(prev => prev + 1)
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

    const boostOption = { label: remedy, supports: [remedy], boost: 20 }
    const adjusted = applyClarifyBonus(result.mdriResults, boostOption)
    const newTop1 = adjusted[0]?.remedy

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
  // Этап 1: "Что я слышу?" — ввод симптомов
  // ═══════════════════════════════════════
  if (step === 'input') {
    const placeholders = lang === 'ru' ? PLACEHOLDERS_RU : PLACEHOLDERS_EN

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Баннер кредитов */}
        {aiStatus && !aiStatus.isAIPro && (
          <div className="mb-6 flex items-center justify-between rounded-full px-4 py-2.5 bg-white/60 border border-[#2d6a4f]/10">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${aiStatus.credits > 0 ? 'bg-[#2d6a4f]' : 'bg-[#dc2626]'}`} />
              <span className="text-[12px] text-[#6b7280]">
                {aiStatus.credits > 0
                  ? `${aiStatus.credits} ${aiStatus.credits === 1 ? 'анализ' : aiStatus.credits < 5 ? 'анализа' : 'анализов'} доступно`
                  : 'Нет доступных анализов'}
              </span>
            </div>
            <span className="text-[11px] text-[#6b7280]/70">
              1 анализ = 1 кредит
            </span>
          </div>
        )}
        {aiStatus?.isAIPro && (
          <div className="mb-6 flex items-center gap-2 rounded-full px-4 py-2.5 bg-white/60 border border-[#2d6a4f]/10">
            <div className="w-2 h-2 rounded-full bg-[#2d6a4f]" />
            <span className="text-[12px] text-[#2d6a4f]">AI Pro — безлимитные анализы</span>
          </div>
        )}

        {/* Заголовок */}
        <div className="mb-8">
          <h1
            className="text-[28px] sm:text-[36px] font-light leading-[1.15] tracking-[-0.01em] mb-2"
            style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)', color: '#1a1a1a' }}
          >
            {lang === 'ru' ? 'AI-анализ случая' : 'AI Case Analysis'}
          </h1>
          <p className="text-[14px] text-[#6b7280]">
            {lang === 'ru'
              ? 'Опишите симптомы пациента — AI предложит препараты с обоснованием'
              : 'Describe patient symptoms — AI will suggest remedies with reasoning'}
          </p>
        </div>

        {/* Подсказка по структуре описания */}
        <div className="mb-4 flex items-start gap-2.5 px-1">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#c8a035]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <p className="text-[12px] text-[#6b7280] leading-relaxed">
            {lang === 'ru'
              ? 'Опишите: что беспокоит, когда хуже/лучше, характер и настроение, семейный анамнез'
              : 'Describe: complaints, when worse/better, mood & character, family history'}
          </p>
        </div>

        {/* Анимированный input с gradient border */}
        <div className={`ai-input-wrapper ${isFocused ? 'focused' : ''}`}>
          <div className="ai-input-inner relative">
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
              className="w-full px-4 pt-3 pb-16 text-sm bg-transparent border-0 outline-none resize-none leading-relaxed"
              style={{
                color: '#1a1a1a',
                minHeight: isFocused || hasContent ? '160px' : '56px',
                transition: 'min-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />

            {/* Нижняя панель */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3"
              style={{
                background: 'linear-gradient(to top, var(--sim-bg-card, #f5f0e8) 60%, transparent)',
                opacity: isFocused || hasContent ? 1 : 0,
                transform: isFocused || hasContent ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.35s ease',
                pointerEvents: isFocused || hasContent ? 'auto' : 'none',
              }}
            >
              <span className="text-[11px] text-[#6b7280]">
                {hasContent
                  ? `${text.trim().split(/\s+/).length} ${lang === 'ru' ? 'слов' : 'words'}`
                  : (lang === 'ru' ? 'Ctrl+Enter — анализ' : 'Ctrl+Enter — analyze')}
              </span>

              <ShimmerButton
                onClick={handleAnalyze}
                disabled={!hasContent}
                shimmerColor="rgba(255,255,255,0.3)"
                shimmerSize="0.06em"
                borderRadius="100px"
                background={hasContent ? '#1e3a2f' : 'rgba(45,106,79,0.15)'}
                className={`text-[13px] font-semibold px-6 py-2.5 ${!hasContent ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  {lang === 'ru' ? 'Анализировать' : 'Analyze'}
                </span>
              </ShimmerButton>
            </div>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <p className="text-[13px] mt-3 text-[#dc2626]">{error}</p>
        )}

        {/* Подпись */}
        <p className="text-[11px] text-center mt-4 text-[#6b7280]/60">
          {lang === 'ru' ? 'Комплексный анализ по 5 методам + верификация' : 'Comprehensive 5-method analysis + verification'}
        </p>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Этап 3: "Что говорит реперторий?" — анализ
  // ═══════════════════════════════════════
  if (step === 'analyzing') {
    const steps = lang === 'ru'
      ? [
          { text: 'Ищу рубрики в реперториуме', detail: '169 000 рубрик', delay: '0.2s' },
          { text: 'Реперторизация по Кенту', detail: 'Суммация по grade', delay: '1.5s' },
          { text: 'Анализ полярностей и модальностей', detail: 'Bönninghausen', delay: '3s' },
          { text: 'Сопоставляю с портретами средств', detail: 'Констелляции', delay: '4.5s' },
          { text: 'Проверяю семейный анамнез', detail: 'Миазматический анализ', delay: '6s' },
          { text: 'Верификация по Materia Medica', detail: 'AI-проверка портрета', delay: '7.5s' },
        ]
      : [
          { text: 'Searching rubrics in repertory', detail: '169K rubrics', delay: '0.2s' },
          { text: 'Kent repertorization', detail: 'Grade summation', delay: '1.5s' },
          { text: 'Polarity & modality analysis', detail: 'Bönninghausen', delay: '3s' },
          { text: 'Matching remedy portraits', detail: 'Constellations', delay: '4.5s' },
          { text: 'Checking family history', detail: 'Miasmatic analysis', delay: '6s' },
          { text: 'Materia Medica verification', detail: 'AI portrait check', delay: '7.5s' },
        ]

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Orb animation */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="orb orb-1" style={{ top: '20%', left: '15%' }} />
          <div className="orb orb-2" style={{ top: '45%', right: '10%' }} />
          <div className="orb orb-3" style={{ bottom: '15%', left: '30%' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center glass-card">
              <svg className="w-7 h-7 text-[#2d6a4f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="text-center">
          <TextShimmer
            as="h2"
            className="text-[28px] font-light mb-3 [--base-color:#6b7280] [--base-gradient-color:#2d6a4f]"
            duration={2.5}
            style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' } as React.CSSProperties}
          >
            {lang === 'ru' ? 'Анализирую случай' : 'Analyzing case'}
          </TextShimmer>

          {/* Шаги анализа — появляются по одному */}
          <div className="space-y-2.5 max-w-sm mx-auto mt-6">
            {steps.map((s, i) => (
              <div
                key={i}
                className="analysis-step flex items-center gap-3 px-4 py-2 rounded-xl bg-white/40"
                style={{ animationDelay: s.delay }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] shrink-0" />
                <div className="flex-1 text-left">
                  <span className="text-[13px] text-[#1a1a1a]">{s.text}</span>
                  <span className="text-[11px] text-[#6b7280] ml-2">{s.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Этап 4: "Кто лидер и почему?" — результат
  // ═══════════════════════════════════════
  if (step === 'result' && result) {
    const top1 = result.mdriResults?.[0]
    const confLevel = result.productConfidence?.level
    const gaugeValue = confidenceToGaugeValue(confLevel)
    const gaugeColors = confidenceGaugeColors(confLevel)

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero-карточка Top-1 с Shine Border */}
        <ShineBorder
          borderRadius={20}
          borderWidth={1.5}
          duration={10}
          color={confLevel === 'high' ? ['#2d6a4f', '#5a9e7c'] : confLevel === 'good' ? ['#5a9e7c', '#c8a035'] : ['#c8a035', '#d97706']}
          className="w-full !min-w-0 !bg-white !p-0 mb-5 result-card"
          style={{ animationDelay: '0.1s' } as React.CSSProperties}
        >
          <div className="p-6 sm:p-8">
            {/* Метка + Confidence */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">
                {lang === 'ru' ? 'Рекомендация' : 'Recommendation'}
              </p>
              <div className="flex items-center gap-2">
                <Gauge
                  size="small"
                  value={gaugeValue}
                  colors={gaugeColors}
                  showValue={false}
                />
                <span className="text-[11px] font-medium text-[#2d6a4f]">
                  {confidenceLabel(confLevel, lang)}
                </span>
              </div>
            </div>

            {/* Название средства */}
            <p
              className="text-[36px] sm:text-[44px] font-light tracking-[-0.03em] leading-tight text-[#1a1a1a]"
              style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
            >
              {result.finalRemedy}
            </p>

            {/* Потенция */}
            {top1?.potency && (
              <p className="text-[15px] mt-2 font-medium text-[#2d6a4f]">
                {typeof top1.potency === 'string' ? top1.potency : top1.potency.potency}
                {typeof top1.potency !== 'string' && top1.potency.reasoning && (
                  <span className="text-[12px] text-[#6b7280] font-normal ml-2">
                    — {top1.potency.reasoning}
                  </span>
                )}
              </p>
            )}

            {/* Обоснование: почему это средство */}
            {result.aiResult?.reasoning && (
              <div className="mt-5 pt-5 border-t border-black/[0.04]">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280] mb-2">
                  {lang === 'ru' ? 'Почему это средство' : 'Why this remedy'}
                </p>
                <p className="text-[13px] leading-[1.7] text-[#6b7280]">
                  {result.aiResult.reasoning}
                </p>
              </div>
            )}

            {/* Совпавшие рубрики (если есть) */}
            {top1?.matchedRubrics && top1.matchedRubrics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-black/[0.04]">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#2d6a4f] hover:opacity-70 transition-opacity"
                >
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {lang === 'ru'
                    ? `${top1.matchedRubrics.length} совпавших рубрик`
                    : `${top1.matchedRubrics.length} matched rubrics`}
                </button>
                {showDetails && (
                  <div className="mt-3 space-y-1.5">
                    {top1.matchedRubrics.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px] text-[#6b7280]">
                        <span className="text-[#2d6a4f] mt-0.5">•</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6 линз — детализация */}
            {top1?.lenses && top1.lenses.length > 0 && (
              <div className="mt-4 pt-4 border-t border-black/[0.04]">
                <button
                  onClick={() => setShowDetails(prev => !prev)}
                  className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#2d6a4f] hover:opacity-70 transition-opacity"
                >
                  {lang === 'ru' ? 'Детализация по методам' : 'Method breakdown'}
                </button>
                {showDetails && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {top1.lenses.map((lens, i) => (
                      <div key={i} className="rounded-xl bg-[#f7f3ed] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] mb-1">{lens.name}</p>
                        <p className="text-[18px] font-light text-[#1a1a1a]">{Math.round(lens.score)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ShineBorder>

        {/* Альтернативы — Top 2-5 */}
        {result.mdriResults && result.mdriResults.length > 1 && (
          <div className="result-card bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] p-5 sm:p-6 mb-5" style={{ animationDelay: '0.3s' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b7280] mb-4">
              {lang === 'ru' ? 'Альтернативы' : 'Alternatives'}
            </p>
            <div className="space-y-0">
              {result.mdriResults.slice(1, 5).map((r, i) => {
                const top1Score = result.mdriResults[0]?.totalScore ?? 100
                const gap = top1Score - r.totalScore
                const pct = Math.max(10, Math.round((r.totalScore / top1Score) * 100))
                // Индикатор близости
                // Индикатор по проценту от лидера, не абсолютному gap
                const gapLabel = pct >= 90
                  ? (lang === 'ru' ? 'Близкая' : 'Close')
                  : pct >= 70
                    ? (lang === 'ru' ? 'Возможная' : 'Possible')
                    : (lang === 'ru' ? 'Маловероятная' : 'Unlikely')
                const gapColor = pct >= 90 ? '#2d6a4f' : pct >= 70 ? '#c8a035' : '#6b7280'

                return (
                  <div key={i} className="py-3" style={{ borderBottom: i < Math.min(result.mdriResults.length - 2, 3) ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[#1a1a1a]">{r.remedy}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${gapColor}10`, color: gapColor }}>
                          {gapLabel}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium tabular-nums" style={{ color: gapColor }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: gap < 10
                            ? 'linear-gradient(90deg, #2d6a4f, #5a9e7c)'
                            : 'linear-gradient(90deg, #d4d0c8, #c8c4bc)',
                          transitionDelay: `${0.3 + i * 0.15}s`,
                        }}
                      />
                    </div>
                    {/* Чем отличается от лидера */}
                    {r.differential?.differentiatingQuestion && (
                      <p className="text-[11px] text-[#6b7280] mt-1.5 italic">
                        {r.differential.differentiatingQuestion}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Уточняющий вопрос — Chat Bubble UI */}
        {needsClarify && clarifyQ && (
          <div className="result-card mb-5" style={{ animationDelay: '0.5s' }}>
            <ChatBubble variant="received" layout="ai" className="!mb-0">
              <ChatBubbleAvatar fallback="AI" className="!h-8 !w-8 bg-[#2d6a4f] text-white text-[11px]" />
              <div className="flex-1">
                <ChatBubbleMessage
                  variant="received"
                  className="!bg-white !rounded-2xl !rounded-tl-sm border border-gray-100 shadow-sm !text-[13px] !text-[#1a1a1a]"
                >
                  {clarifyQ.question}
                </ChatBubbleMessage>

                {/* Варианты ответов — chips */}
                <div className="flex flex-wrap gap-2 mt-3 ml-1">
                  {clarifyQ.options.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => handleClarifyAnswer(opt.label)}
                      className={`text-[12px] px-4 py-2 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                        opt.neutral
                          ? 'bg-white text-[#6b7280] border border-gray-200 hover:bg-gray-50'
                          : 'bg-[#2d6a4f]/[0.06] text-[#1a1a1a] border border-[#2d6a4f]/15 hover:bg-[#2d6a4f]/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </ChatBubble>
          </div>
        )}

        {/* Предупреждения */}
        {result.warnings && result.warnings.length > 0 && (
          <div className="result-card bg-[#fef3c7]/50 rounded-2xl border border-[#c8a035]/15 p-4 mb-5" style={{ animationDelay: '0.55s' }}>
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-[#92780a]">
                <span className="mt-0.5">⚠</span>
                <div>
                  <span className="font-medium">{w.message}</span>
                  {w.hint && <span className="text-[#6b7280] ml-1">— {w.hint}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Действия */}
        <div className="result-card space-y-3" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => setStep('assign')}
            className="w-full py-3.5 text-[14px] font-semibold rounded-full bg-[#1e3a2f] text-white shadow-[0_4px_16px_rgba(30,58,47,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(30,58,47,0.35)] active:translate-y-0"
          >
            {lang === 'ru' ? 'Назначить пациенту' : 'Assign to patient'}
          </button>

          <button
            onClick={() => { setStep('input'); setResult(null); setText(''); setClarifyCount(0); setTop1Flipped(false); setShowDetails(false) }}
            className="w-full py-3 text-[13px] rounded-full border border-gray-200 text-[#6b7280] transition-all duration-200 hover:bg-black/[0.02]"
          >
            {lang === 'ru' ? 'Новый анализ' : 'New analysis'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Этап 5: "Нужно уточнить?" — сравнение top-3
  // ═══════════════════════════════════════
  if (step === 'clarify') {
    const comparison = clarifyQ?.fallbackComparison ?? result?.mdriResults?.slice(0, 3).map(r => ({
      remedy: r.remedy,
      keyFeature: r.remedyName || r.remedy,
    })) ?? []

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h2
          className="text-[28px] font-light mb-2 text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
        >
          {lang === 'ru' ? 'Что ближе к пациенту?' : 'Which fits the patient?'}
        </h2>
        <p className="text-[13px] mb-8 text-[#6b7280]">
          {lang === 'ru'
            ? 'Три ближайших препарата. Выберите наиболее подходящий.'
            : 'Three closest remedies. Choose the best fit.'}
        </p>

        <div className="space-y-3 mb-8">
          {comparison.map((c, idx) => (
            <button
              key={c.remedy}
              onClick={() => handleComparisonChoice(c.remedy)}
              className="result-card w-full text-left bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.08)]"
              style={{ animationDelay: `${0.1 + idx * 0.12}s`, cursor: 'pointer' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2d6a4f]/[0.06] flex items-center justify-center text-[14px] font-semibold text-[#2d6a4f]">
                  {idx + 1}
                </div>
                <div>
                  <p
                    className="text-[18px] font-light text-[#1a1a1a]"
                    style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
                  >
                    {c.remedy}
                  </p>
                  <p className="text-[12px] text-[#6b7280] mt-0.5">{c.keyFeature}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep('result')}
          className="w-full py-3 text-[13px] rounded-full text-[#6b7280] hover:underline transition-colors"
        >
          {lang === 'ru' ? 'Оставить текущий результат' : 'Keep current result'}
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Выбор пациента для назначения
  // ═══════════════════════════════════════
  if (step === 'assign') {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <h2
          className="text-[24px] font-light mb-2 text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
        >
          {lang === 'ru' ? 'Кому назначить?' : 'Assign to whom?'}
        </h2>
        <p className="text-[13px] mb-6 text-[#6b7280]">
          {result?.finalRemedy} {typeof result?.mdriResults?.[0]?.potency === 'string' ? result.mdriResults[0].potency : result?.mdriResults?.[0]?.potency?.potency || '30C'}
        </p>

        {patients.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13px] mb-4 text-[#6b7280]">
              {lang === 'ru' ? 'Нет пациентов. Создайте первого.' : 'No patients. Create one first.'}
            </p>
            <button
              onClick={() => router.push('/patients/new')}
              className="px-6 py-2.5 rounded-full bg-[#2d6a4f] text-white text-[13px] font-semibold transition-all duration-200 hover:-translate-y-0.5"
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
                  backgroundColor: selectedPatient === p.id ? 'rgba(45,106,79,0.04)' : '#ffffff',
                  border: `1px solid ${selectedPatient === p.id ? '#2d6a4f' : '#e5e7eb'}`,
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-semibold shrink-0 bg-[#2d6a4f]/[0.06] text-[#2d6a4f]">
                  {p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-[#1a1a1a]">{p.name}</p>
                  {p.constitutional_type && (
                    <p className="text-[12px] truncate text-[#6b7280]">{p.constitutional_type}</p>
                  )}
                </div>
                {selectedPatient === p.id && (
                  <svg className="w-4 h-4 shrink-0 text-[#2d6a4f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              logDoctorFeedback(chosenRemedy).catch(() => {})
              const rx = encodeURIComponent(chosenRemedy)
              const p = result?.mdriResults?.[0]?.potency
              const potency = encodeURIComponent(typeof p === 'string' ? p : p?.potency || '30C')
              router.push(`/patients/${selectedPatient}?rx=${rx}&potency=${potency}`)
            }}
            className="w-full py-3.5 rounded-full bg-[#1e3a2f] text-white text-[14px] font-semibold shadow-[0_4px_16px_rgba(30,58,47,0.3)] transition-all duration-200 hover:-translate-y-0.5"
          >
            {lang === 'ru' ? 'Назначить и открыть карточку' : 'Assign and open card'}
          </button>
        )}

        <button
          onClick={() => setStep('result')}
          className="w-full mt-3 py-2.5 text-[13px] text-[#6b7280] transition-colors hover:underline"
        >
          {lang === 'ru' ? '← Назад к результату' : '← Back to result'}
        </button>
      </div>
    )
  }

  return null
}
