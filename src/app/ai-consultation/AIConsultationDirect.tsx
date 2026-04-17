'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeText, parseOnly, logClarifyResult, logClarifyRound, logDoctorFeedback, logDisagreement, applyClarifyAnswerAndReplan } from '@/lib/actions/ai-consultation'
import { createAIConsultation, savePrescription } from '@/lib/actions/consultations'
import type { ConsensusResult } from '@/lib/mdri/types'
import type { ClarifyQuestion } from '@/lib/mdri/question-gain'
import { applyClarifyBonus } from '@/lib/mdri/question-gain'
import type { Lang } from '@/hooks/useLanguage'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { ShineBorder } from '@/components/ui/shine-border'
import { Gauge } from '@/components/ui/gauge-1'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { ChatBubble, ChatBubbleMessage, ChatBubbleAvatar } from '@/components/ui/chat-bubble'
import type { PatientWithType } from '@/types'
import './ai-styles.css'

type Props = {
  patients: PatientWithType[]
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

// Категории учтённых симптомов
const SYMPTOM_CATEGORIES: Record<string, { ru: string; en: string; icon: string }> = {
  mental: { ru: 'Психика', en: 'Mental', icon: '🧠' },
  general: { ru: 'Общие', en: 'General', icon: '🌡' },
  modality: { ru: 'Модальности', en: 'Modalities', icon: '⚡' },
  particular: { ru: 'Частные', en: 'Particular', icon: '📍' },
}

// Перевод названий линз + пояснения для врача
function lensInfo(name: string, score: number, details: string, lang: Lang): { label: string; hint: string; displayScore: string } {
  const map: Record<string, { ru: string; en: string; hintRu: string; hintEn: string }> = {
    'Kent': {
      ru: 'Кент', en: 'Kent',
      hintRu: 'Классическая суммация по grade',
      hintEn: 'Classical grade summation',
    },
    'Coverage': {
      ru: 'Покрытие', en: 'Coverage',
      hintRu: 'Сколько симптомов покрыто',
      hintEn: 'Symptoms covered',
    },
    'Hierarchy': {
      ru: 'Иерархия', en: 'Hierarchy',
      hintRu: 'Mental > General > Particular',
      hintEn: 'Mental > General > Particular',
    },
    'Constellation': {
      ru: 'Портрет', en: 'Constellation',
      hintRu: 'Совпадение с портретом средства',
      hintEn: 'Remedy portrait match',
    },
    'Polarity': {
      ru: 'Полярность', en: 'Polarity',
      hintRu: 'Модальности Бённингхаузена',
      hintEn: 'Bönninghausen modalities',
    },
    'Miasm': {
      ru: 'Миазм', en: 'Miasm',
      hintRu: 'Миазматическое соответствие',
      hintEn: 'Miasmatic correspondence',
    },
  }

  const info = map[name]
  if (!info) return { label: name, hint: '', displayScore: `${score}` }

  // Coverage: показать "5/8" из details вместо процента
  const displayScore = name === 'Coverage' && details.includes('/')
    ? details
    : `${score}%`

  return {
    label: lang === 'ru' ? info.ru : info.en,
    hint: lang === 'ru' ? info.hintRu : info.hintEn,
    displayScore,
  }
}

// Описания средств для UI — ключевые черты на языке гомеопата
const REMEDY_DESCRIPTIONS_RU: Record<string, string> = {
  'Sep.': 'Равнодушие к близким, опущение, лучше от активных упражнений',
  'Puls.': 'Плаксивая, переменчивая, хуже в тепле, жажды нет',
  'Nat-m.': 'Замкнутость, горе, отвращение к утешению, тяга к соли',
  'Ign.': 'Горе со вздохами, переменчивость, парадоксальные симптомы',
  'Lach.': 'Ревность, многословие, хуже после сна, левая сторона',
  'Lyc.': 'Неуверенность, вздутие, хуже 16-20ч, правая сторона',
  'Sulph.': 'Жаркий, философ, хуже от жары и в 11ч, жжение',
  'Calc.': 'Зябкий, потливость головы, медлительный, тяга к яйцам',
  'Phos.': 'Открытый, сочувствующий, жажда холодного, кровоточивость',
  'Ars.': 'Тревога о здоровье, педантичность, жжение, хуже ночью',
  'Nux-v.': 'Раздражительный, трудоголик, зябкий, хуже утром',
  'Sil.': 'Робкий, зябкий, нагноения, потливость стоп',
  'Carc.': 'Перфекционизм, подавление эмоций, любовь к путешествиям',
  'Staph.': 'Подавленный гнев, обида, последствия унижения',
  'Aur.': 'Депрессия, ответственность, хуже ночью, сердце',
  'Med.': 'Спешка, экстремы, сон на животе, лучше у моря',
  'Thuj.': 'Скрытность, фиксации, бородавки, хуже от влажности',
  'Bell.': 'Внезапное начало, жар, покраснение, пульсация, хуже от света',
  'Bry.': 'Хуже от движения, сухость, жажда большими глотками, раздражительность',
  'Rhus-t.': 'Лучше от движения, беспокойство, хуже в покое и сырости',
  'Acon.': 'Страх смерти, внезапное начало после холодного ветра',
  'Apis': 'Отёки, жалящие боли, лучше от холода, хуже от тепла',
  'Arg-n.': 'Тревога ожидания, спешка, тяга к сладкому, понос от волнения',
  'Cham.': 'Невыносимая боль, капризность, одна щека красная',
  'Cina': 'Скрежет зубами, раздражительность у детей, глисты',
  'Cocc.': 'Укачивание, головокружение, слабость, бессонница от тревоги',
  'Gels.': 'Слабость, дрожь, тяжесть век, грипп, страх перед экзаменом',
  'Hep.': 'Крайняя чувствительность к боли и холоду, нагноения',
  'Ip.': 'Постоянная тошнота, чистый язык при тошноте, кровотечения',
  'Kali-c.': 'Боли в 2-4 часа ночи, зябкий, отёки, ригидность',
  'Lil-t.': 'Спешка, раздражительность, опущение матки, сердцебиение',
  'Merc.': 'Слюнотечение, потливость ночью, язвы, хуже от перемен температуры',
  'Nat-c.': 'Чувствительность к жаре, слабое пищеварение, молоко хуже',
  'Nat-s.': 'Хуже от сырости, астма, депрессия утром, печень',
  'Nit-ac.': 'Занозистые боли, трещины, раздражительность, тяга к жиру',
  'Ph-ac.': 'Апатия от горя, безразличие, выпадение волос, понос',
  'Plat.': 'Высокомерие, онемение, повышенная чувствительность половых органов',
  'Stram.': 'Страхи темноты, насилие, яркий бред, жажда, зрачки расширены',
  'Verat.': 'Холодный пот, коллапс, рвота с поносом, жажда холодного',
  'Cupr.': 'Судороги, спазмы, подёргивания, колики лучше от давления',
  'Dulc.': 'Хуже от сырости и холода, простуда от промокания, бородавки',
  'Hyos.': 'Подозрительность, ревность, обнажается, бормочет, судороги',
  'Mez.': 'Кожа толстая корками, зуд хуже от тепла, кости болят ночью',
  'Ruta': 'Ушибы надкостницы, напряжение глаз, слабость связок',
}

function getRemedyDescription(remedy: string, keyFeature: string, lang: Lang): string {
  if (lang !== 'ru') return keyFeature
  return REMEDY_DESCRIPTIONS_RU[remedy] || keyFeature
}

export default function AIConsultationDirect({ patients, lang, aiStatus }: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [step, setStep] = useState<'input' | 'pre-clarify' | 'analyzing' | 'result' | 'clarify' | 'assign'>('input')
  const [preClarifyAnswers, setPreClarifyAnswers] = useState<Record<string, string>>({})
  const [missingCategories, setMissingCategories] = useState<string[]>([])  // что не хватает из parseOnly
  const [result, setResult] = useState<ConsensusResult | null>(null)
  const [error, setError] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [clarifyCount, setClarifyCount] = useState(0)
  const [top1Flipped, setTop1Flipped] = useState(false)
  // Итеративный clarify-диалог: история заданных вопросов + визуальная метрика прогресса
  const [clarifyHistory, setClarifyHistory] = useState<string[]>([])
  const [clarifyProgress, setClarifyProgress] = useState<{ gapBefore: number; gapAfter: number; confBefore: string; confAfter: string } | null>(null)
  const [clarifyPending, setClarifyPending] = useState(false)
  const CLARIFY_MAX_ROUNDS = 3
  const [isFocused, setIsFocused] = useState(false)
  const [showRubrics, setShowRubrics] = useState(false)
  const [showLenses, setShowLenses] = useState(false)
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false)
  const [disagreeStep, setDisagreeStep] = useState<'none' | 'choose' | 'reason' | 'done'>('none')
  const [disagreeRemedy, setDisagreeRemedy] = useState('')
  const [assignRemedy, setAssignRemedy] = useState('')  // Какое средство назначаем (пусто = Top-1)
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

  // Полный текст для анализа = исходный текст + ответы на pre-clarify
  function getFullText(extraAnswers?: Record<string, string>) {
    const answers = extraAnswers ?? preClarifyAnswers
    const parts = [text.trim()]
    for (const [, answer] of Object.entries(answers)) {
      if (answer) parts.push(answer)
    }
    return parts.join('. ')
  }

  async function handleAnalyze() {
    if (!text.trim()) return
    if (text.trim().length < 30) {
      setError(lang === 'ru'
        ? 'Опишите подробнее — укажите жалобы, модальности (когда хуже/лучше), характер пациента.'
        : 'Please provide more detail — symptoms, modalities, patient character.')
      return
    }
    setStep('analyzing')
    setError('')
    try {
      // Шаг 1: парсинг + проверка достаточности
      const check = await parseOnly({ text: text.trim() })
      if (check._error === 'NO_AI_ACCESS' || check._error === 'AI_MONTHLY_LIMIT') { setError(check._error); setStep('input'); return }
      if (check._error === 'TOO_SHORT') { setError(lang === 'ru' ? 'Текст слишком короткий.' : 'Text too short.'); setStep('input'); return }

      // Если не хватает важной информации — спросить перед engine
      if (check.missing.length > 0) {
        setPreClarifyAnswers({})
        setMissingCategories(check.missing)
        setStep('pre-clarify')
        return
      }

      // Всё есть — запускаем engine
      await runEngine(text.trim())
    } catch {
      setError(lang === 'ru' ? 'Ошибка AI-анализа. Попробуйте ещё раз.' : 'AI analysis error. Try again.')
      setStep('input')
    }
  }

  async function runEngine(fullText: string) {
    setStep('analyzing')
    setError('')
    // Сброс состояния clarify-диалога перед новым анализом
    setClarifyCount(0)
    setClarifyHistory([])
    setClarifyProgress(null)
    setTop1Flipped(false)
    try {
      const res = await analyzeText({ text: fullText })
      if ('_error' in res && (res._error === 'NO_AI_ACCESS' || res._error === 'AI_MONTHLY_LIMIT')) { setError(res._error); setStep('input'); return }
      setResult(res)
      // Если CLARIFY, но движок не смог придумать вопрос (всё уже спрошено) —
      // сразу перейти к ручному сравнению top-3, иначе врач застрянет
      // на «Требует уточнения» без кнопок.
      const conf = res.productConfidence?.level
      const hasClarifyQ = !!res._clarifyQuestion
      if (conf === 'clarify' && !hasClarifyQ) {
        setStep('clarify')
      } else {
        setStep('result')
      }
    } catch {
      setError(lang === 'ru' ? 'Ошибка AI-анализа. Попробуйте ещё раз.' : 'AI analysis error. Try again.')
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

  // QuestionGain: вопрос вычислен на сервере (или перевыбран в replan на следующем раунде)
  const clarifyQ = result?._clarifyQuestion ?? null
  const needsClarify = clarifyCount < CLARIFY_MAX_ROUNDS && clarifyQ !== null && !clarifyPending

  async function handleClarifyAnswer(optionLabel: string) {
    if (!result?.mdriResults || !clarifyQ || clarifyPending) return
    const option = clarifyQ.options.find(o => o.label === optionLabel)
    if (!option) return

    setClarifyPending(true)
    const beforeTop1 = result.mdriResults[0]?.remedy
    const beforeTop3 = result.mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore }))
    const confBefore = result.productConfidence?.level ?? 'good'
    const historyWithCurrent = [...clarifyHistory, clarifyQ.feature]

    try {
      const replan = await applyClarifyAnswerAndReplan({
        results: result.mdriResults,
        option,
        symptoms: result._parsedSymptoms ?? [],
        modalities: result._parsedModalities ?? [],
        askedFeatures: historyWithCurrent,
      })

      const afterTop1 = replan.results[0]?.remedy
      const afterTop3 = replan.results.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore }))

      // Stability: блокируем второй flip (как и раньше)
      const flipNow = afterTop1 !== beforeTop1
      const flipBlocked = flipNow && top1Flipped
      const finalResults = flipBlocked ? result.mdriResults : replan.results
      if (flipNow && !flipBlocked) setTop1Flipped(true)

      const nextClarifyQ = replan.done ? null : (replan.nextQuestion as ClarifyQuestion | null)

      setResult({
        ...result,
        mdriResults: finalResults,
        finalRemedy: finalResults[0]?.remedy ?? result.finalRemedy,
        productConfidence: replan.confidence,
        _clarifyQuestion: nextClarifyQ ?? undefined,
      })
      setClarifyHistory(historyWithCurrent)
      setClarifyCount(prev => prev + 1)
      setClarifyProgress({
        gapBefore: replan.gapBefore,
        gapAfter: replan.gapAfter,
        confBefore,
        confAfter: replan.confidence.level,
      })

      // Accumulating лог раунда
      logClarifyRound({
        roundIndex: clarifyCount + 1,
        feature: clarifyQ.feature,
        answer: optionLabel,
        beforeTop3,
        afterTop3,
        gapBefore: replan.gapBefore,
        gapAfter: replan.gapAfter,
        confidenceBefore: confBefore,
        confidenceAfter: replan.confidence.level,
        reason: flipBlocked ? 'flip_blocked' : replan.reason,
      }).catch(() => {})

      // Если все раунды исчерпаны и всё ещё clarify — явно показать сравнение
      if (!replan.done && clarifyCount + 1 >= CLARIFY_MAX_ROUNDS) {
        setStep('clarify')
      }
    } catch {
      // в случае ошибки replan — fallback на старое локальное поведение
      const adjusted = applyClarifyBonus(result.mdriResults, option)
      setResult({ ...result, mdriResults: adjusted, finalRemedy: adjusted[0]?.remedy ?? result.finalRemedy })
      setClarifyCount(prev => prev + 1)
      logClarifyResult({
        clarifyUsed: true, clarifyFeature: clarifyQ.feature, clarifyGain: clarifyQ.gain,
        clarifyAnswer: optionLabel, top1Changed: adjusted[0]?.remedy !== beforeTop1, flipBlocked: false,
        beforeTop3, afterTop3: adjusted.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
        gapBefore: result.mdriResults[0].totalScore - (result.mdriResults[1]?.totalScore ?? 0),
        gapAfter: adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0),
      }).catch(() => {})
    } finally {
      setClarifyPending(false)
    }
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-24 sm:pb-12">
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

        <div className="mb-4 px-1 hidden">
          <p className="text-[12px] text-[#6b7280] leading-relaxed">
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
                  : <span className="hidden lg:inline">{lang === 'ru' ? 'Ctrl+Enter — анализ' : 'Ctrl+Enter — analyze'}</span>}
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
        {error && error !== 'NO_AI_ACCESS' && error !== 'AI_MONTHLY_LIMIT' && (
          <p className="text-[13px] mt-3 text-[#dc2626]">{error}</p>
        )}

        {/* Месячный лимит исчерпан */}
        {error === 'AI_MONTHLY_LIMIT' && (
          <div className="mt-4 rounded-2xl border border-[#c8a035]/20 bg-[#c8a035]/4 p-5">
            <p className="text-[14px] font-medium text-[#1a1a1a] mb-2">
              {lang === 'ru' ? 'Лимит анализов исчерпан' : 'Monthly limit reached'}
            </p>
            <p className="text-[13px] text-[#6b7280] leading-relaxed">
              {lang === 'ru'
                ? 'Вы использовали 100 AI-анализов в этом месяце. Лимит обновится 1-го числа следующего месяца.'
                : 'You have used 100 AI analyses this month. The limit resets on the 1st of next month.'}
            </p>
          </div>
        )}

        {/* Нет доступа к AI */}
        {error === 'NO_AI_ACCESS' && (
          <div className="mt-4 rounded-2xl border border-[#c8a035]/20 bg-[#c8a035]/4 p-5">
            <p className="text-[14px] font-medium text-[#1a1a1a] mb-2">
              {lang === 'ru' ? 'Нет доступа к AI-анализу' : 'No AI access'}
            </p>
            <p className="text-[13px] text-[#6b7280] leading-relaxed mb-3">
              {lang === 'ru'
                ? 'Для AI-анализа нужна подписка AI Pro или кредиты. Вы можете:'
                : 'AI analysis requires an AI Pro subscription or credits. You can:'}
            </p>
            <ul className="space-y-2 text-[13px] text-[#6b7280]">
              <li className="flex items-start gap-2">
                <span className="text-[#2d6a4f] mt-0.5">•</span>
                <span>
                  {lang === 'ru' ? 'Подключить подписку AI Pro — ' : 'Subscribe to AI Pro — '}
                  <a href="/pricing" className="text-[#2d6a4f] font-medium hover:underline">
                    {lang === 'ru' ? 'тарифы' : 'pricing'}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#2d6a4f] mt-0.5">•</span>
                <span>
                  {lang === 'ru' ? 'Получить бесплатные кредиты за приглашённых коллег — ' : 'Earn free credits by inviting colleagues — '}
                  <a href="/referral" className="text-[#2d6a4f] font-medium hover:underline">
                    {lang === 'ru' ? 'реферальная программа' : 'referral program'}
                  </a>
                </span>
              </li>
            </ul>
          </div>
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
            style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
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
  // Этап 2.5: Уточнение перед анализом
  // ═══════════════════════════════════════
  if (step === 'pre-clarify') {
    const PRE_QUESTIONS = [
      {
        id: 'thermal',
        requires: 'general',
        question: lang === 'ru' ? 'Пациент скорее зябкий или жаркий?' : 'Is the patient chilly or hot?',
        options: [
          { label: lang === 'ru' ? 'Зябкий, мёрзнет, любит тепло' : 'Chilly, likes warmth', value: 'Зябкий, мёрзнет, тепло лучше' },
          { label: lang === 'ru' ? 'Жаркий, духота хуже, любит прохладу' : 'Hot, worse in stuffy rooms', value: 'Жаркий, хуже от тепла, лучше на свежем воздухе' },
          { label: lang === 'ru' ? 'Не выражено' : 'Not pronounced', value: '' },
        ],
      },
      {
        id: 'thirst',
        requires: 'general',
        question: lang === 'ru' ? 'Как пьёт воду?' : 'How does the patient drink?',
        options: [
          { label: lang === 'ru' ? 'Много, большими глотками' : 'Large quantities', value: 'Жажда сильная, пьёт много большими глотками' },
          { label: lang === 'ru' ? 'Часто, мелкими глотками' : 'Frequent small sips', value: 'Пьёт часто мелкими глотками' },
          { label: lang === 'ru' ? 'Почти не пьёт, жажды нет' : 'Almost no thirst', value: 'Жажды нет, почти не пьёт' },
          { label: lang === 'ru' ? 'Не знаю' : "Don't know", value: '' },
        ],
      },
      {
        id: 'modality_motion',
        requires: 'modalities',
        question: lang === 'ru' ? 'Как влияет движение?' : 'Effect of motion?',
        options: [
          { label: lang === 'ru' ? 'Хуже от движения, лучше в покое' : 'Worse from motion', value: 'Хуже от движения, лучше лёжа в покое' },
          { label: lang === 'ru' ? 'Лучше от движения, не может сидеть' : 'Better from motion', value: 'Лучше от движения, хуже от покоя' },
          { label: lang === 'ru' ? 'Не замечено' : 'Not noticed', value: '' },
        ],
      },
      {
        id: 'modality_time',
        question: lang === 'ru' ? 'В какое время хуже?' : 'Time of aggravation?',
        requires: 'modalities',
        options: [
          { label: lang === 'ru' ? 'Утром' : 'Morning', value: 'Хуже утром' },
          { label: lang === 'ru' ? 'Днём' : 'Afternoon', value: 'Хуже днём' },
          { label: lang === 'ru' ? 'Вечером (16-20ч)' : 'Evening', value: 'Хуже вечером 16-20 часов' },
          { label: lang === 'ru' ? 'Ночью' : 'Night', value: 'Хуже ночью' },
          { label: lang === 'ru' ? 'Не знаю' : "Don't know", value: '' },
        ],
      },
      {
        id: 'consolation',
        requires: 'mental',
        question: lang === 'ru' ? 'Как реагирует на утешение, сочувствие?' : 'Reaction to consolation?',
        options: [
          { label: lang === 'ru' ? 'Хуже от утешения' : 'Worse from consolation', value: 'Утешение хуже, не хочет чтобы жалели' },
          { label: lang === 'ru' ? 'Лучше от утешения, ищет сочувствие' : 'Better from consolation', value: 'Утешение помогает, ищет сочувствие' },
          { label: lang === 'ru' ? 'Не выражено' : 'Not pronounced', value: '' },
        ],
      },
      {
        id: 'food',
        requires: 'general',
        question: lang === 'ru' ? 'Пищевые пристрастия?' : 'Food desires?',
        options: [
          { label: lang === 'ru' ? 'Любит солёное' : 'Desires salt', value: 'Любит солёное' },
          { label: lang === 'ru' ? 'Любит сладкое' : 'Desires sweets', value: 'Любит сладкое' },
          { label: lang === 'ru' ? 'Не переносит жирное' : 'Aversion to fat', value: 'Отвращение к жирной пище' },
          { label: lang === 'ru' ? 'Не выражено' : 'Not pronounced', value: '' },
        ],
      },
    ]

    // Показать только вопросы по недостающим категориям
    const filteredQuestions = PRE_QUESTIONS.filter(q => missingCategories.includes(q.requires))

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h2
          className="text-[24px] sm:text-[28px] font-light mb-2 text-[#1a1a1a]"
          style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
        >
          {lang === 'ru' ? 'Уточните для точного анализа' : 'Clarify for accurate analysis'}
        </h2>
        <p className="text-[13px] text-[#6b7280] mb-6">
          {lang === 'ru'
            ? 'В описании не хватает ключевой информации. Ответьте на вопросы — это повысит точность.'
            : 'Key information is missing. Answer the questions to improve accuracy.'}
        </p>

        <div className="space-y-5">
          {filteredQuestions.map(q => (
            <div key={q.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-[13px] font-medium text-[#1a1a1a] mb-3">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setPreClarifyAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                    className={`text-[12px] px-4 py-2 rounded-full transition-all duration-200 ${
                      preClarifyAnswers[q.id] === opt.value
                        ? 'bg-[#2d6a4f] text-white'
                        : 'bg-[#f7f3ed] text-[#1a1a1a] hover:bg-[#2d6a4f]/8'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => runEngine(getFullText())}
            className="w-full py-3.5 text-[14px] font-semibold rounded-full bg-[#1e3a2f] text-white shadow-[0_4px_16px_rgba(30,58,47,0.3)] transition-all duration-200 hover:-translate-y-0.5"
          >
            {lang === 'ru' ? 'Анализировать' : 'Analyze'}
          </button>
          <button
            onClick={() => runEngine(text.trim())}
            className="w-full py-2.5 text-[12px] rounded-full text-[#6b7280] hover:underline"
          >
            {lang === 'ru' ? 'Пропустить и анализировать как есть' : 'Skip and analyze as is'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Этап 4: "Кто лидер и почему?" — результат
  // ═══════════════════════════════════════
  if (step === 'result' && result) {
    const top1 = result.mdriResults?.[0]
    const top2 = result.mdriResults?.[1]
    const confLevel = result.productConfidence?.level
    const gaugeValue = confidenceToGaugeValue(confLevel)
    const gaugeColors = confidenceGaugeColors(confLevel)

    // Равноценные кандидаты: productConfidence говорит equal ИЛИ top-2 >= 95% от top-1
    const top2Pct = top1 && top2 ? Math.round((top2.totalScore / top1.totalScore) * 100) : 0
    const isEqual = result.productConfidence?.showAsEqual === true || top2Pct >= 95

    // Функция для отрисовки hero-карточки средства
    const renderHeroCard = (remedy: typeof top1, isSecondary = false) => {
      if (!remedy) return null

      return (
        <ShineBorder
          borderRadius={20}
          borderWidth={1.5}
          duration={10}
          color={isEqual ? ['#c8a035', '#d97706'] : confLevel === 'high' ? ['#2d6a4f', '#5a9e7c'] : confLevel === 'good' ? ['#5a9e7c', '#c8a035'] : ['#c8a035', '#d97706']}
          className={`w-full min-w-0! bg-white! p-0! ${isSecondary ? '' : 'result-card'}`}
          style={isSecondary ? undefined : { animationDelay: '0.1s' }}
        >
          <div className="p-5 sm:p-6">
            <p
              className={`${isEqual ? 'text-[28px] sm:text-[32px]' : 'text-[36px] sm:text-[44px]'} font-light tracking-[-0.03em] leading-tight text-[#1a1a1a]`}
              style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
            >
              {remedy.remedy}
            </p>
            {/* Краткое описание средства */}
            {REMEDY_DESCRIPTIONS_RU[remedy.remedy] && lang === 'ru' && (
              <p className="text-[12px] mt-2 text-[#6b7280] leading-relaxed">
                {REMEDY_DESCRIPTIONS_RU[remedy.remedy]}
              </p>
            )}
          </div>
        </ShineBorder>
      )
    }

    // Активные линзы (скрываем 0%)
    const activeLenses = top1?.lenses?.filter(l => l.score > 0) ?? []

    // Группировка usedSymptoms по категориям
    const symptomGroups = (result.usedSymptoms ?? []).reduce((acc, s) => {
      if (!acc[s.type]) acc[s.type] = []
      acc[s.type].push(s.label)
      return acc
    }, {} as Record<string, string[]>)

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Метка + Confidence */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">
            {lang === 'ru' ? 'Рекомендация' : 'Recommendation'}
          </p>
          {confLevel === 'clarify' || confLevel === 'insufficient' ? (
            <button
              onClick={() => setShowConfidenceDetails(v => !v)}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-[#c8a035]/10 text-[#92780a] hover:bg-[#c8a035]/20 transition-colors"
              title={lang === 'ru' ? 'Показать детали уверенности' : 'Show confidence details'}
            >
              {confidenceLabel(confLevel, lang)} {showConfidenceDetails ? '▴' : '▾'}
            </button>
          ) : (
            <button
              onClick={() => setShowConfidenceDetails(v => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title={lang === 'ru' ? 'Показать детали уверенности' : 'Show confidence details'}
            >
              <Gauge size="small" value={gaugeValue} colors={gaugeColors} showValue={false} />
              <span className="text-[11px] font-medium text-[#2d6a4f]">
                {confidenceLabel(confLevel, lang)} {showConfidenceDetails ? '▴' : '▾'}
              </span>
            </button>
          )}
        </div>

        {/* Confidence breakdown — раскрывается при клике на gauge */}
        {showConfidenceDetails && result.productConfidence?.factors && (
          <div className="result-card mb-5 rounded-xl bg-[#f7f3ed]/50 border border-[#e8e4dc] p-4" style={{ animationDelay: '0.05s' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-3 text-[#6b5f4f]">
              {lang === 'ru' ? 'Из чего складывается уверенность' : 'Confidence breakdown'}
            </div>
            <div className="space-y-2">
              {result.productConfidence.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-3 text-[12px]">
                  <span className={`mt-0.5 ${f.passed ? 'text-[#2d6a4f]' : 'text-[#92780a]'}`}>
                    {f.passed ? '✓' : '○'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-[#1a1a1a]">{f.name}:</span>
                      <span className={f.passed ? 'text-[#2d6a4f]' : 'text-[#92780a]'}>{f.value}</span>
                    </div>
                    <div className="text-[10px] text-[#6b7280] mt-0.5">{f.required}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#6b7280] mt-3 pt-3 border-t border-[#e8e4dc]">
              {lang === 'ru'
                ? 'HIGH = все 5 первых критериев пройдены и нет конфликтов в top-3.'
                : 'HIGH = all 5 first criteria passed and no conflicts in top-3.'}
            </p>
          </div>
        )}

        {/* Распознанная этиология (Causa по Ганеману §5) */}
        {result.detectedEtiologies && result.detectedEtiologies.length > 0 && (
          <div className="result-card mb-5 rounded-xl bg-[#2d6a4f]/4 border border-[#2d6a4f]/15 p-4" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#2d6a4f]">
                {lang === 'ru' ? 'Распознанная причина (Causa)' : 'Recognized cause (Causa)'}
              </span>
              <span className="text-[10px] text-[#6b7280]">
                {lang === 'ru' ? '— иерархически выше отдельных симптомов (Organon §5)' : '— hierarchically higher than individual symptoms'}
              </span>
            </div>
            <div className="space-y-3">
              {result.detectedEtiologies.map((et, i) => (
                <div key={i} className="text-[12px]">
                  <div className="font-medium text-[#1a1a1a] mb-1">
                    {et.labelRu}
                    <span className="text-[10px] text-[#6b7280] ml-2">({et.matchedRubrics.length} {lang === 'ru' ? 'упомин.' : 'mentions'})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {et.topRemedies.slice(0, 6).map(r => (
                      <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-[#2d6a4f]/15 text-[#2d6a4f] font-medium">
                        {r}
                      </span>
                    ))}
                    {et.secondaryRemedies.slice(0, 3).map(r => (
                      <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-white text-[#6b5f4f] border border-[#e8e4dc]">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Модальности: пациент vs top-3 */}
        {result.topModalities && Object.keys(result.topModalities).length > 0 && (result._parsedModalities?.length ?? 0) > 0 && (
          <div className="result-card mb-5 rounded-xl bg-white border border-gray-100 p-4 overflow-x-auto" style={{ animationDelay: '0.15s' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-3 text-[#6b5f4f]">
              {lang === 'ru' ? 'Модальности — пациент vs препараты' : 'Modalities — patient vs remedies'}
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase text-[#6b7280] border-b border-[#e8e4dc]">
                  <th className="py-2 pr-3 font-medium">{lang === 'ru' ? 'Модальность' : 'Modality'}</th>
                  <th className="py-2 pr-3 font-medium">{lang === 'ru' ? 'Пациент' : 'Patient'}</th>
                  {result.mdriResults.slice(0, 3).map(r => (
                    <th key={r.remedy} className="py-2 pr-3 font-medium">{r.remedy}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allPairs = new Set<string>()
                  for (const m of (result._parsedModalities ?? [])) allPairs.add(m.pairId)
                  for (const rem of Object.values(result.topModalities!)) {
                    for (const k of Object.keys(rem)) allPairs.add(k)
                  }
                  const labels: Record<string, string> = {
                    heat_cold: lang === 'ru' ? 'Термика' : 'Thermal',
                    motion_rest: lang === 'ru' ? 'Движение/покой' : 'Motion/rest',
                    morning_evening: lang === 'ru' ? 'Утро/вечер' : 'Morning/evening',
                    wet_dry: lang === 'ru' ? 'Сырость/сухость' : 'Wet/dry',
                    touch_pressure: lang === 'ru' ? 'Прикосновение' : 'Touch/pressure',
                    consolation: lang === 'ru' ? 'Утешение' : 'Consolation',
                  }
                  const fmtPatient = (m?: { value: 'agg' | 'amel' }) => m ? (m.value === 'agg' ? '↓ хуже' : '↑ лучше') : '—'
                  const fmtRemedy = (val?: string) => {
                    if (!val) return '—'
                    if (val.startsWith('agg_')) return `↓ ${val.slice(4)}`
                    if (val.startsWith('amel_')) return `↑ ${val.slice(5)}`
                    return val
                  }
                  return [...allPairs].map(pair => {
                    const patientMod = (result._parsedModalities ?? []).find(m => m.pairId === pair)
                    return (
                      <tr key={pair} className="border-b border-[#f0ebe1] last:border-b-0">
                        <td className="py-2 pr-3 font-medium text-[#1a1a1a]">{labels[pair] ?? pair}</td>
                        <td className="py-2 pr-3 text-[#6b5f4f]">{fmtPatient(patientMod)}</td>
                        {result.mdriResults.slice(0, 3).map(r => {
                          const remVal = result.topModalities![r.remedy]?.[pair]
                          const matches = patientMod && remVal && (
                            (patientMod.value === 'agg' && remVal.startsWith('agg_')) ||
                            (patientMod.value === 'amel' && remVal.startsWith('amel_'))
                          )
                          const conflicts = patientMod && remVal && !matches
                          return (
                            <td key={r.remedy} className={`py-2 pr-3 ${matches ? 'text-[#2d6a4f] font-medium' : conflicts ? 'text-[#dc2626]' : 'text-[#6b7280]'}`}>
                              {fmtRemedy(remVal)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
            <p className="text-[10px] text-[#6b7280] mt-2">
              {lang === 'ru'
                ? '✓ зелёный — совпадение, ✗ красный — противоречие, серый — нет данных'
                : '✓ green — match, ✗ red — conflict, gray — no data'}
            </p>
          </div>
        )}

        {/* Hero: один или два кандидата */}
        {isEqual && top2 ? (
          <div className="mb-5">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {renderHeroCard(top1)}
              {renderHeroCard(top2, true)}
            </div>

            {needsClarify ? (
              /* Плашка: нужно уточнить */
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#c8a035]/6 border border-[#c8a035]/15">
                <svg className="w-4 h-4 text-[#c8a035] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-[12px] text-[#92780a]">
                  {lang === 'ru'
                    ? 'Оба средства подходят одинаково. Ответьте на вопрос ниже, чтобы определиться.'
                    : 'Both remedies fit equally. Answer the question below to decide.'}
                </p>
              </div>
            ) : (
              /* Ручной выбор: clarify исчерпан, врач решает сам */
              <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-[12px] text-[#6b7280] mb-3">
                  {lang === 'ru'
                    ? 'Оба средства подходят. Какое ближе к пациенту?'
                    : 'Both remedies fit. Which is closer to the patient?'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[top1, top2].map((r) => r && (
                    <button
                      key={r.remedy}
                      onClick={() => {
                        setResult({ ...result, finalRemedy: r.remedy, mdriResults: [r, ...(result.mdriResults?.filter(m => m.remedy !== r.remedy) ?? [])] })
                      }}
                      className={`py-3 px-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                        result.finalRemedy === r.remedy
                          ? 'border-2 border-[#2d6a4f] bg-[#2d6a4f]/4 shadow-sm'
                          : 'border border-gray-200 hover:border-[#2d6a4f]/40 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <p
                          className="text-[18px] font-light text-[#1a1a1a]"
                          style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
                        >
                          {r.remedy}
                        </p>
                        {result.finalRemedy === r.remedy && (
                          <svg className="w-4 h-4 text-[#2d6a4f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {REMEDY_DESCRIPTIONS_RU[r.remedy] && lang === 'ru' && (
                        <p className="text-[11px] text-[#6b7280] leading-relaxed">
                          {REMEDY_DESCRIPTIONS_RU[r.remedy]}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ShineBorder
            borderRadius={20}
            borderWidth={1.5}
            duration={10}
            color={confLevel === 'high' ? ['#2d6a4f', '#5a9e7c'] : confLevel === 'good' ? ['#5a9e7c', '#c8a035'] : ['#c8a035', '#d97706']}
            className="w-full min-w-0! bg-white! p-0! mb-5 result-card"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="p-6 sm:p-8">
              <p
                className="text-[36px] sm:text-[44px] font-light tracking-[-0.03em] leading-tight text-[#1a1a1a]"
                style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
              >
                {result.finalRemedy}
              </p>


              {/* Обоснование */}
              {result.aiResult?.reasoning && (
                <div className="mt-5 pt-5 border-t border-black/4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280] mb-2">
                    {lang === 'ru' ? 'Почему это средство' : 'Why this remedy'}
                  </p>
                  <p className="text-[13px] leading-[1.7] text-[#6b7280]">
                    {result.aiResult.reasoning}
                  </p>
                </div>
              )}

              {/* Учтённые симптомы — вместо matchedRubrics */}
              {Object.keys(symptomGroups).length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/4">
                  <button
                    onClick={() => setShowRubrics(!showRubrics)}
                    className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#2d6a4f] hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <svg className={`w-3 h-3 transition-transform duration-200 ${showRubrics ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {lang === 'ru'
                      ? `Учтённые симптомы (${result.usedSymptoms?.length ?? 0})`
                      : `Used symptoms (${result.usedSymptoms?.length ?? 0})`}
                  </button>
                  {showRubrics && (
                    <div className="mt-3 space-y-3">
                      {(['mental', 'general', 'modality', 'particular'] as const).map(cat => {
                        const items = symptomGroups[cat]
                        if (!items?.length) return null
                        const catInfo = SYMPTOM_CATEGORIES[cat]
                        return (
                          <div key={cat}>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] mb-1">
                              {lang === 'ru' ? catInfo.ru : catInfo.en}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((label, i) => (
                                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-[#2d6a4f]/5 text-[#1a1a1a]">
                                  {label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Детализация по методам — только линзы с score > 0 */}
              {activeLenses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/4">
                  <button
                    onClick={() => setShowLenses(!showLenses)}
                    className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#2d6a4f] hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <svg className={`w-3 h-3 transition-transform duration-200 ${showLenses ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {lang === 'ru' ? 'Детализация по методам' : 'Method breakdown'}
                  </button>
                  {showLenses && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {activeLenses.map((lens, i) => {
                        const info = lensInfo(lens.name, lens.score, lens.details, lang)
                        const barColor = lens.score >= 60 ? '#2d6a4f' : lens.score >= 30 ? '#c8a035' : '#6b7280'
                        return (
                          <div key={i} className="rounded-xl bg-[#f7f3ed] p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280] mb-1">{info.label}</p>
                            <p className="text-[18px] font-light text-[#1a1a1a]">{info.displayScore}</p>
                            {/* Progress bar */}
                            <div className="h-1 rounded-full bg-black/6 mt-1.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lens.score}%`, backgroundColor: barColor }} />
                            </div>
                            <p className="text-[10px] text-[#6b7280]/70 mt-1">{info.hint}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ShineBorder>
        )}

        {/* Альтернативы — при equal пропускаем top-2 (он в hero) */}
        {result.mdriResults && result.mdriResults.length > (isEqual ? 2 : 1) && (
          <div className="result-card bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] p-5 sm:p-6 mb-5" style={{ animationDelay: '0.3s' }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b7280] mb-4">
              {lang === 'ru' ? 'Альтернативы' : 'Alternatives'}
            </p>
            <div className="space-y-0">
              {/* Сохраняем порядок от engine/verifier — не пересортируем по score, т.к. verifier
                  переранжирует, не пересчитывая scores. Лейбл «близости» — по позиции, не по числу. */}
              {result.mdriResults.slice(isEqual ? 2 : 1, isEqual ? 6 : 5).map((r, i) => {
                const positionInTop = i + (isEqual ? 3 : 2) // абсолютная позиция (2-е, 3-е, 4-е, 5-е)
                const gapLabel = positionInTop === 2
                  ? (lang === 'ru' ? 'Близкая' : 'Close')
                  : positionInTop === 3
                    ? (lang === 'ru' ? 'Возможная' : 'Possible')
                    : (lang === 'ru' ? 'Маловероятная' : 'Unlikely')
                const gapColor = positionInTop === 2 ? '#2d6a4f' : positionInTop === 3 ? '#c8a035' : '#6b7280'

                return (
                  <div key={i} className="py-3" style={{ borderBottom: i < Math.min(result.mdriResults.length - 2, 3) ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#9ca3af] font-medium tabular-nums w-4">#{positionInTop}</span>
                        <span className="text-[14px] font-medium text-[#1a1a1a]">{r.remedy}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${gapColor}10`, color: gapColor }}>
                          {gapLabel}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssignRemedy(r.remedy); setStep('assign') }}
                        className="text-[10px] px-2.5 py-1 rounded-full border border-[#2d6a4f]/20 text-[#2d6a4f] hover:bg-[#2d6a4f]/5 transition-all"
                      >
                        {lang === 'ru' ? 'Назначить' : 'Assign'}
                      </button>
                    </div>
                    {/* Чем отличается от лидера */}
                    {r.differential?.differentiatingQuestion && (
                      <p className="text-[11px] text-[#6b7280] mt-1.5 italic ml-6">
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
            {/* Прогресс: сколько раундов и как меняется разрыв */}
            <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-2 ml-10">
              <span>
                Уточнение {clarifyCount + 1} из {CLARIFY_MAX_ROUNDS}
              </span>
              {clarifyProgress && (
                <span>
                  Разрыв: {Math.round(clarifyProgress.gapBefore)}% → {Math.round(clarifyProgress.gapAfter)}%
                  {clarifyProgress.gapAfter > clarifyProgress.gapBefore && (
                    <span className="text-[#2d6a4f] ml-1">+{Math.round(clarifyProgress.gapAfter - clarifyProgress.gapBefore)}</span>
                  )}
                </span>
              )}
            </div>
            <ChatBubble variant="received" layout="ai" className="mb-0!">
              <ChatBubbleAvatar fallback="AI" className="h-8! w-8! bg-[#2d6a4f] text-white text-[11px]" />
              <div className="flex-1">
                <ChatBubbleMessage
                  variant="received"
                  className="bg-white! rounded-2xl! rounded-tl-sm! border border-gray-100 shadow-sm text-[13px]! text-[#1a1a1a]!"
                >
                  {clarifyQ.question}
                </ChatBubbleMessage>

                {/* Варианты ответов — chips */}
                <div className="flex flex-wrap gap-2 mt-3 ml-1">
                  {clarifyQ.options.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => handleClarifyAnswer(opt.label)}
                      disabled={clarifyPending}
                      className={`text-[12px] px-4 py-2 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait ${
                        opt.neutral
                          ? 'bg-white text-[#6b7280] border border-gray-200 hover:bg-gray-50'
                          : 'bg-[#2d6a4f]/6 text-[#1a1a1a] border border-[#2d6a4f]/15 hover:bg-[#2d6a4f]/10'
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
          {disagreeStep === 'none' && (
            <>
              <button
                onClick={() => { setAssignRemedy(''); setStep('assign') }}
                className="w-full py-3.5 text-[14px] font-semibold rounded-full bg-[#1e3a2f] text-white shadow-[0_4px_16px_rgba(30,58,47,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(30,58,47,0.35)] active:translate-y-0"
              >
                {lang === 'ru' ? 'Назначить пациенту' : 'Assign to patient'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setDisagreeStep('choose')}
                  className="flex-1 py-3 text-[13px] rounded-full border border-[#c8a035]/30 text-[#92780a] transition-all duration-200 hover:bg-[#c8a035]/4"
                >
                  {lang === 'ru' ? 'Другое средство' : 'Different remedy'}
                </button>
                <button
                  onClick={() => { setStep('input'); setResult(null); setText(''); setClarifyCount(0); setTop1Flipped(false); setShowRubrics(false); setShowLenses(false); setDisagreeStep('none') }}
                  className="flex-1 py-3 text-[13px] rounded-full border border-gray-200 text-[#6b7280] transition-all duration-200 hover:bg-black/2"
                >
                  {lang === 'ru' ? 'Новый анализ' : 'New analysis'}
                </button>
              </div>
            </>
          )}

          {/* Шаг 1: ввод средства */}
          {disagreeStep === 'choose' && (
            <div className="rounded-2xl border border-[#c8a035]/20 bg-[#c8a035]/3 p-5">
              <p className="text-[13px] text-[#1a1a1a] mb-3">
                {lang === 'ru' ? 'Какое средство вы бы назначили?' : 'Which remedy would you prescribe?'}
              </p>
              <input
                type="text"
                value={disagreeRemedy}
                onChange={e => setDisagreeRemedy(e.target.value)}
                placeholder={lang === 'ru' ? 'Например: Puls.' : 'e.g. Puls.'}
                className="w-full px-4 py-2.5 text-[13px] rounded-xl border border-gray-200 bg-white outline-none focus:border-[#2d6a4f] mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { if (disagreeRemedy.trim()) setDisagreeStep('reason') }}
                  disabled={!disagreeRemedy.trim()}
                  className="flex-1 py-2.5 text-[13px] rounded-full bg-[#2d6a4f] text-white font-medium disabled:opacity-40 transition-all"
                >
                  {lang === 'ru' ? 'Далее' : 'Next'}
                </button>
                <button
                  onClick={() => { setDisagreeStep('none'); setDisagreeRemedy('') }}
                  className="px-4 py-2.5 text-[13px] rounded-full text-[#6b7280] hover:underline"
                >
                  {lang === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Шаг 2: причина */}
          {disagreeStep === 'reason' && (
            <div className="rounded-2xl border border-[#c8a035]/20 bg-[#c8a035]/3 p-5">
              <p className="text-[13px] text-[#1a1a1a] mb-3">
                {lang === 'ru'
                  ? `Почему ${disagreeRemedy} а не ${result?.finalRemedy}?`
                  : `Why ${disagreeRemedy} instead of ${result?.finalRemedy}?`}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'symptom', ru: 'Не учтён ключевой симптом', en: 'Key symptom missed' },
                  { id: 'thermal', ru: 'Неправильная термика', en: 'Wrong thermal' },
                  { id: 'etiology', ru: 'Этиология указывает на другое', en: 'Etiology points elsewhere' },
                  { id: 'experience', ru: 'Клинический опыт', en: 'Clinical experience' },
                  { id: 'miasm', ru: 'Миазматическое соответствие', en: 'Miasmatic match' },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      logDisagreement(disagreeRemedy.trim(), r.id).catch(() => {})
                      setDisagreeStep('done')
                    }}
                    className="text-[12px] px-4 py-2 rounded-full border border-[#c8a035]/20 text-[#92780a] hover:bg-[#c8a035]/6 transition-all"
                  >
                    {lang === 'ru' ? r.ru : r.en}
                  </button>
                ))}
                <button
                  onClick={() => {
                    logDisagreement(disagreeRemedy.trim(), 'other').catch(() => {})
                    setDisagreeStep('done')
                  }}
                  className="text-[12px] px-4 py-2 rounded-full border border-gray-200 text-[#6b7280] hover:bg-black/2 transition-all"
                >
                  {lang === 'ru' ? 'Другая причина' : 'Other reason'}
                </button>
              </div>
            </div>
          )}

          {/* Шаг 3: спасибо */}
          {disagreeStep === 'done' && (
            <div className="rounded-2xl border border-[#2d6a4f]/15 bg-[#2d6a4f]/3 p-5 text-center">
              <p className="text-[13px] text-[#2d6a4f] font-medium mb-1">
                {lang === 'ru' ? 'Спасибо за обратную связь' : 'Thank you for the feedback'}
              </p>
              <p className="text-[12px] text-[#6b7280]">
                {lang === 'ru' ? 'Это поможет улучшить систему' : 'This helps improve the system'}
              </p>
              <button
                onClick={() => { setDisagreeStep('none'); setDisagreeRemedy('') }}
                className="mt-3 text-[12px] text-[#2d6a4f] hover:underline"
              >
                {lang === 'ru' ? '← Вернуться к результату' : '← Back to result'}
              </button>
            </div>
          )}
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
        <p className="text-[13px] mb-3 text-[#6b7280]">
          {lang === 'ru'
            ? 'Три ближайших препарата. Выберите наиболее подходящий.'
            : 'Three closest remedies. Choose the best fit.'}
        </p>
        {/* Если попали сюда без вопросов — дать врачу понимание почему */}
        {!clarifyQ && result?.productConfidence?.level === 'clarify' ? (
          <p className="text-[12px] mb-8 text-[#92780a] bg-[#c8a035]/6 border border-[#c8a035]/15 rounded-lg px-3 py-2">
            {lang === 'ru'
              ? 'Все ключевые модальности уже учтены — уточняющих вопросов нет. Сравните top-3 вручную.'
              : 'All key modalities already covered — no further clarifying questions. Compare top-3 manually.'}
          </p>
        ) : <div className="mb-5" />}

        <div className="space-y-3 mb-8">
          {comparison.map((c, idx) => (
            <button
              key={c.remedy}
              onClick={() => handleComparisonChoice(c.remedy)}
              className="result-card w-full text-left bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.08)]"
              style={{ animationDelay: `${0.1 + idx * 0.12}s`, cursor: 'pointer' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2d6a4f]/6 flex items-center justify-center text-[14px] font-semibold text-[#2d6a4f]">
                  {idx + 1}
                </div>
                <div>
                  <p
                    className="text-[18px] font-light text-[#1a1a1a]"
                    style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
                  >
                    {c.remedy}
                  </p>
                  <p className="text-[12px] text-[#6b7280] mt-0.5">{getRemedyDescription(c.remedy, c.keyFeature, lang)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep('result')}
          className="w-full py-3 text-[13px] rounded-full text-[#6b7280] border border-gray-200 hover:bg-black/2 transition-all duration-200"
        >
          {lang === 'ru' ? '← Вернуться к результату' : '← Back to result'}
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
          {assignRemedy || result?.finalRemedy || ''}
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
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-semibold shrink-0 bg-[#2d6a4f]/6 text-[#2d6a4f]">
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
            onClick={async () => {
              const chosenRemedy = assignRemedy || result?.finalRemedy || ''
              logDoctorFeedback(chosenRemedy).catch(() => {})
              try {
                // Создать AI-консультацию с назначением
                const aiNotes = `AI-анализ: ${chosenRemedy}\n\nТекст: ${text.trim().slice(0, 500)}`
                const consultationId = await createAIConsultation(selectedPatient, 'chronic', aiNotes)
                await savePrescription(consultationId, chosenRemedy, '', null, '')
                router.push(`/patients/${selectedPatient}/consultations/${consultationId}`)
              } catch {
                // Fallback — просто открыть карточку
                router.push(`/patients/${selectedPatient}`)
              }
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
