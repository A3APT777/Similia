/**
 * MDRI Differential Layer — стабилизированная версия
 *
 * AI генерирует вопросы → validateQuestions фильтрует мусор →
 * ответы детерминированно маппятся в симптомы → rerun engine.
 *
 * AI НЕ выбирает препарат. AI НЕ интерпретирует ответы.
 * Максимум 1 clarify цикл.
 */

import type { MDRIResult, MDRISymptom, MDRIModality } from './types'

// =====================================================================
// 0. Измерение эффективности clarify
// =====================================================================

export type ClarifyEffectivenessLevel = 'strong_effective' | 'weak_effective' | 'not_effective'

export type ClarifyEffectiveness = {
  level: ClarifyEffectivenessLevel
  top1_before: string; top2_before: string
  top1_after: string; top2_after: string
  top1_score_before: number; top1_score_after: number
  gap_before: number; gap_after: number; delta_gap: number
  changed_top1: boolean
  // Среднее давление альтернатив (top-2..4 / top-1)
  alt_pressure_before: number; alt_pressure_after: number
  // Максимальное давление (top-2 / top-1) — одна сильная альтернатива
  max_alt_pressure_before: number; max_alt_pressure_after: number
  confidence_before: string; confidence_after: string
  confidence_improved: boolean
  conflict_before: string; conflict_after: string
  ai_used: boolean; fallback_used: boolean
  valid_questions_count: number; selected_answers_count: number
  // Обратная совместимость
  clarify_effective: boolean
  reason: string
}

// Среднее давление top-2..4 относительно top-1
function calcAvgPressure(results: MDRIResult[]): number {
  if (results.length < 2 || results[0].totalScore === 0) return 0
  const alts = results.slice(1, 4)
  const avg = alts.reduce((s, r) => s + r.totalScore, 0) / alts.length
  return Math.round((avg / results[0].totalScore) * 100) / 100
}

// Максимальное давление — max(top-2, top-3, top-4) / top-1
function calcMaxPressure(results: MDRIResult[]): number {
  if (results.length < 2 || results[0].totalScore === 0) return 0
  const maxAlt = Math.max(...results.slice(1, 4).map(r => r.totalScore))
  return Math.round((maxAlt / results[0].totalScore) * 100) / 100
}

export function measureClarifyEffectiveness(
  beforeResults: MDRIResult[],
  afterResults: MDRIResult[],
  confidenceBefore: string,
  confidenceAfter: string,
  conflictBefore: string,
  conflictAfter: string,
  meta: { aiUsed: boolean; fallbackUsed: boolean; validCount: number; answersCount: number },
): ClarifyEffectiveness {
  const top1B = beforeResults[0]?.remedy ?? ''
  const top2B = beforeResults[1]?.remedy ?? ''
  const top1A = afterResults[0]?.remedy ?? ''
  const top1ScoreB = beforeResults[0]?.totalScore ?? 0
  const top1ScoreA = afterResults[0]?.totalScore ?? 0
  const gapB = top1ScoreB - (beforeResults[1]?.totalScore ?? 0)
  const gapA = top1ScoreA - (afterResults[1]?.totalScore ?? 0)
  const deltaGap = gapA - gapB

  const avgPressureB = calcAvgPressure(beforeResults)
  const avgPressureA = calcAvgPressure(afterResults)
  const maxPressureB = calcMaxPressure(beforeResults)
  const maxPressureA = calcMaxPressure(afterResults)
  // Явные дельты
  const avgPressureDelta = avgPressureB - avgPressureA  // >0 = давление снизилось
  const maxPressureDelta = maxPressureB - maxPressureA  // >0 = давление снизилось
  const top1Delta = top1ScoreA - top1ScoreB             // >0 = top-1 усилился

  const top1NotWeaker = top1Delta >= 0

  const confImproved = (
    (confidenceBefore === 'insufficient' && confidenceAfter !== 'insufficient') ||
    (confidenceBefore === 'clarify' && (confidenceAfter === 'good' || confidenceAfter === 'high')) ||
    (confidenceBefore === 'good' && confidenceAfter === 'high')
  )
  const conflictResolved = conflictBefore !== 'none' && conflictAfter === 'none'

  // === improvementScore: взвешенная сумма нормализованных сигналов ===
  // maxPressureDelta (0.5) — самый важный: снижение самой сильной альтернативы
  // gapDelta (0.3) — рост разрыва
  // avgPressureDelta (0.2) — снижение общего давления
  //
  // Нормализация: clamp дельты к [0..1] диапазону
  // maxPressureDelta: 0.1 = отличный результат → 1.0
  // gapDelta: 10% = отличный результат → 1.0
  // avgPressureDelta: 0.1 = отличный результат → 1.0
  const normMaxP = Math.min(1, Math.max(0, maxPressureDelta / 0.10))
  const normGap = Math.min(1, Math.max(0, deltaGap / 10))
  const normAvgP = Math.min(1, Math.max(0, avgPressureDelta / 0.10))

  let improvementScore = 0.5 * normMaxP + 0.3 * normGap + 0.2 * normAvgP

  // Противоречие: gap растёт НО maxPressure тоже растёт → penalty
  if (deltaGap > 0 && maxPressureDelta < 0) {
    improvementScore *= 0.5 // сигналы противоречат друг другу
  }

  // Конфликт разрешён → бонус
  if (conflictResolved) {
    improvementScore = Math.min(1, improvementScore + 0.15)
  }

  let level: ClarifyEffectivenessLevel = 'not_effective'
  let reason = ''

  // top-1 ослаб → not_effective (безусловно)
  if (!top1NotWeaker) {
    reason = `top-1 ослаб: ${top1ScoreB}% → ${top1ScoreA}%`
  }
  // strong_effective: improvementScore ≥ 0.6
  else if (improvementScore >= 0.6) {
    level = 'strong_effective'
    const parts: string[] = []
    if (top1B !== top1A) parts.push(`смена лидера ${top1B} → ${top1A}`)
    if (deltaGap >= 2) parts.push(`gap +${deltaGap}%`)
    if (maxPressureDelta >= 0.02) parts.push(`макс. давление −${Math.round(maxPressureDelta * 100)}%`)
    reason = parts.length > 0 ? parts.join(', ') : `score=${improvementScore.toFixed(2)}`
  }
  // weak_effective: improvementScore ≥ 0.25
  else if (improvementScore >= 0.25) {
    level = 'weak_effective'
    const parts: string[] = []
    if (top1B !== top1A) parts.push(`смена лидера ${top1B} → ${top1A}`)
    if (deltaGap >= 1) parts.push(`gap +${deltaGap}%`)
    if (avgPressureDelta >= 0.01) parts.push(`давление немного снизилось`)
    reason = parts.length > 0 ? parts.join(', ') : `score=${improvementScore.toFixed(2)}`
  }
  // not_effective
  else {
    const parts: string[] = []
    if (deltaGap <= 0) parts.push('gap не вырос')
    if (maxPressureDelta <= 0) parts.push('давление не снизилось')
    if (deltaGap > 0 && maxPressureDelta < 0) parts.push('сигналы противоречат')
    reason = parts.length > 0 ? parts.join(', ') : 'недостаточно изменений'
  }

  // confidence — дополнительный сигнал: повышает weak → strong
  if (confImproved && level === 'weak_effective') {
    level = 'strong_effective'
    reason += ' + confidence вырос'
  }

  return {
    level,
    top1_before: top1B, top2_before: top2B,
    top1_after: top1A, top2_after: afterResults[1]?.remedy ?? '',
    top1_score_before: top1ScoreB, top1_score_after: top1ScoreA,
    gap_before: gapB, gap_after: gapA, delta_gap: deltaGap,
    changed_top1: top1B !== top1A,
    alt_pressure_before: avgPressureB, alt_pressure_after: avgPressureA,
    max_alt_pressure_before: maxPressureB, max_alt_pressure_after: maxPressureA,
    confidence_before: confidenceBefore, confidence_after: confidenceAfter,
    confidence_improved: confImproved,
    conflict_before: conflictBefore, conflict_after: conflictAfter,
    ai_used: meta.aiUsed, fallback_used: meta.fallbackUsed,
    valid_questions_count: meta.validCount,
    selected_answers_count: meta.answersCount,
    clarify_effective: level !== 'not_effective',
    reason,
  }
}
import type { ConfidenceResult, ConflictCheckResult } from './product-layer'

// =====================================================================
// 1. shouldClarify
// =====================================================================

export function shouldClarify(
  confidence: ConfidenceResult,
  results: MDRIResult[],
  conflict: ConflictCheckResult,
  clarifyUsed = false,
): boolean {
  // Максимум 1 clarify цикл
  if (clarifyUsed) return false

  if (conflict.level === 'hard') return true
  if (conflict.level === 'differential') return true
  if (confidence.level !== 'high') return true

  if (results.length >= 2) {
    const gap = results[0].totalScore - results[1].totalScore
    if (gap < 8) return true
  }

  return false
}

// =====================================================================
// 2. Типы
// =====================================================================

export type DifferentialQuestion = {
  question: string
  why_it_matters: string
  supports: string[]
  weakens: string[]
  options: OptionWithMapping[]
  key: string
}

// Каждый option имеет детерминированный маппинг в symptom
export type OptionWithMapping = {
  label: string               // текст для UI
  rubric: string              // английский rubric для engine
  category: 'mental' | 'general' | 'particular'
  weight: 1 | 2 | 3
  modality?: { pairId: string; value: 'agg' | 'amel' }
}

export type DifferentialContext = {
  top1: { remedy: string; name: string; score: number; lenses: MDRIResult['lenses'] }
  top2: { remedy: string; name: string; score: number; lenses: MDRIResult['lenses'] }
  top3?: { remedy: string; name: string; score: number; lenses: MDRIResult['lenses'] }
  parsedSymptoms: MDRISymptom[]
  modalities: MDRIModality[]
  conflict: ConflictCheckResult
}

// =====================================================================
// 3. buildDifferentialContext
// =====================================================================

export function buildDifferentialContext(
  results: MDRIResult[],
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
  conflict: ConflictCheckResult,
): DifferentialContext {
  const r = (idx: number) => results[idx] ? {
    remedy: results[idx].remedy,
    name: results[idx].remedyName,
    score: results[idx].totalScore,
    lenses: results[idx].lenses,
  } : undefined

  return {
    top1: r(0)!, top2: r(1)!,
    top3: r(2),
    parsedSymptoms: symptoms.filter(s => s.present),
    modalities, conflict,
  }
}

// =====================================================================
// 4. buildDifferentialPrompt
// =====================================================================

export function buildDifferentialPrompt(ctx: DifferentialContext): string {
  const lensStr = (lenses: MDRIResult['lenses']) =>
    lenses.map(l => `${l.name}: ${l.score}%`).join(', ')

  const sympStr = ctx.parsedSymptoms
    .map(s => `${s.rubric} (${s.category}, w=${s.weight})`)
    .join('\n  ')

  const modStr = ctx.modalities.length > 0
    ? ctx.modalities.map(m => `${m.pairId}: ${m.value}`).join(', ')
    : 'нет модальностей'

  const conflictStr = ctx.conflict.hasConflict
    ? `КОНФЛИКТ: ${ctx.conflict.reason}`
    : ''

  const diffLenses = ctx.conflict.differentialLenses.length > 0
    ? `Ключевые линзы различия: ${ctx.conflict.differentialLenses.join(', ')}`
    : ''

  const altStr = ctx.conflict.altStrengths.length > 0
    ? 'Преимущества альтернатив:\n' + ctx.conflict.altStrengths
      .map(a => `  ${a.remedy}: ${a.strengths.join(', ')}`).join('\n')
    : ''

  return `Ты помогаешь различить гомеопатические препараты, а не подтвердить лидера.

Дано:
Top-1: ${ctx.top1.remedy} (${ctx.top1.name}) — ${ctx.top1.score}%
  Линзы: ${lensStr(ctx.top1.lenses)}
Top-2: ${ctx.top2.remedy} (${ctx.top2.name}) — ${ctx.top2.score}%
  Линзы: ${lensStr(ctx.top2.lenses)}
${ctx.top3 ? `Top-3: ${ctx.top3.remedy} (${ctx.top3.name}) — ${ctx.top3.score}%\n  Линзы: ${lensStr(ctx.top3.lenses)}` : ''}

Симптомы пациента:
  ${sympStr}
Модальности: ${modStr}
${conflictStr ? `\nКонфликт: ${conflictStr}` : ''}
${diffLenses ? `\n${diffLenses}` : ''}
${altStr ? `\n${altStr}` : ''}

Сформируй 3–5 уточняющих вопросов, которые:
1. Различают ${ctx.top1.remedy}, ${ctx.top2.remedy}${ctx.top3 ? `, ${ctx.top3.remedy}` : ''}
2. Могут изменить итоговый выбор
3. Не являются общими
4. Не подтверждают автоматически текущий top-1
5. Имеют варианты ответа (2–4 варианта)

ВАЖНО: каждый option должен содержать поле "rubric" — английский гомеопатический rubric.

Для каждого вопроса укажи:
- question (на русском, понятный врачу-гомеопату)
- why_it_matters (1 строка)
- supports (abbrev препаратов)
- weakens (abbrev препаратов)
- options (массив объектов: { "label": "текст", "rubric": "mind anxiety anticipation", "category": "mental|general|particular", "weight": 1-3 })

Верни строго JSON, без markdown:
[
  {
    "question": "...",
    "why_it_matters": "...",
    "supports": ["nux-v"],
    "weakens": ["ign"],
    "options": [
      { "label": "Вспышки гнева", "rubric": "mind anger violent", "category": "mental", "weight": 2 },
      { "label": "Подавляет обиду", "rubric": "mind ailments from anger suppressed", "category": "mental", "weight": 3 }
    ]
  }
]`
}

// =====================================================================
// 5. parseDifferentialResponse
// =====================================================================

export function parseDifferentialResponse(text: string): DifferentialQuestion[] {
  try {
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []

    return parsed.slice(0, 5).map((q: Record<string, unknown>, i: number) => {
      const rawOptions = Array.isArray(q.options) ? q.options : []

      // Парсим options с маппингом
      const options: OptionWithMapping[] = rawOptions.map((opt: unknown) => {
        if (typeof opt === 'string') {
          // Старый формат (просто строка) — fallback маппинг
          return { label: opt, rubric: opt.toLowerCase().replace(/[?!.,;:]/g, '').trim(), category: 'particular' as const, weight: 2 as const }
        }
        const o = opt as Record<string, unknown>
        return {
          label: String(o.label ?? ''),
          rubric: String(o.rubric ?? String(o.label ?? '').toLowerCase()),
          category: (['mental', 'general', 'particular'].includes(String(o.category)) ? String(o.category) : 'particular') as 'mental' | 'general' | 'particular',
          weight: Math.max(1, Math.min(3, Number(o.weight) || 2)) as 1 | 2 | 3,
        }
      }).filter((o: OptionWithMapping) => o.label.length > 0)

      return {
        question: String(q.question ?? ''),
        why_it_matters: String(q.why_it_matters ?? ''),
        supports: Array.isArray(q.supports) ? q.supports.map(String) : [],
        weakens: Array.isArray(q.weakens) ? q.weakens.map(String) : [],
        options,
        key: `diff-${i}`,
      }
    }).filter(q => q.question.length > 0 && q.options.length >= 2)
  } catch {
    return []
  }
}

// =====================================================================
// 6. validateQuestions — фильтрация мусора от AI
// =====================================================================

// Общие/бессмысленные фразы
const GENERIC_PATTERNS = [
  'как вы себя чувствуете',
  'расскажите подробнее',
  'что вас беспокоит',
  'как давно',
  'опишите свое состояние',
  'что вы ощущаете',
  'есть ли у вас проблемы',
]

export function validateQuestions(
  questions: DifferentialQuestion[],
  ctx: DifferentialContext,
): DifferentialQuestion[] {
  const topRemedies = [ctx.top1.remedy, ctx.top2.remedy, ctx.top3?.remedy].filter(Boolean) as string[]

  const valid = questions.filter(q => {
    // 1. Должен иметь supports И weakens
    if (q.supports.length === 0 && q.weakens.length === 0) return false

    // 2. Должен иметь ≥2 options
    if (q.options.length < 2) return false

    // 3. Не слишком общий
    const lower = q.question.toLowerCase()
    if (GENERIC_PATTERNS.some(p => lower.includes(p))) return false

    // 4. Должен различать НАШИ top remedies, а не случайные
    const allMentioned = [...q.supports, ...q.weakens]
    const relevant = allMentioned.some(r => topRemedies.includes(r.toLowerCase()))
    if (!relevant && allMentioned.length > 0) return false

    // 5. Не слишком короткий вопрос (< 15 символов = мусор)
    if (q.question.length < 15) return false

    return true
  })

  // Убираем дубли по question (первые 30 символов)
  const seen = new Set<string>()
  const unique = valid.filter(q => {
    const key = q.question.toLowerCase().slice(0, 30)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique.slice(0, 5) // max 5
}

// =====================================================================
// 7. convertAnswersToSymptoms — ДЕТЕРМИНИРОВАННЫЙ маппинг
//
// Каждый option уже содержит rubric/category/weight.
// AI не интерпретирует ответы. Только option → symptom.
// =====================================================================

export function convertAnswersToSymptoms(
  questions: DifferentialQuestion[],
  answers: Record<string, string>, // key → label выбранного option
): { symptoms: MDRISymptom[]; modalities: MDRIModality[] } {
  const symptoms: MDRISymptom[] = []
  const modalities: MDRIModality[] = []

  for (const q of questions) {
    const answerLabel = answers[q.key]
    if (!answerLabel) continue

    // Найти option по label
    const option = q.options.find(o => o.label === answerLabel)
    if (!option) continue

    // Детерминированный маппинг: option → symptom
    symptoms.push({
      rubric: option.rubric,
      category: option.category,
      present: true,
      weight: option.weight,
    })

    // Модальность если задана в option
    if (option.modality) {
      modalities.push(option.modality)
    }
  }

  return { symptoms, modalities }
}

// =====================================================================
// 8. FALLBACK QUESTIONS — детерминированные, по differentialLenses
// =====================================================================

const FALLBACK_BY_LENS: Record<string, DifferentialQuestion> = {
  Constellation: {
    key: 'fb-constellation',
    question: 'Как проявляется раздражительность у пациента?',
    why_it_matters: 'Различает характерные паттерны поведения',
    supports: [], weakens: [],
    options: [
      { label: 'Вспышки гнева, быстро проходит', rubric: 'mind anger violent', category: 'mental', weight: 2 },
      { label: 'Подавляет, копит обиду', rubric: 'mind ailments from anger suppressed', category: 'mental', weight: 3 },
      { label: 'Раздражителен по мелочам', rubric: 'mind irritability trifles', category: 'mental', weight: 2 },
      { label: 'Нет выраженной раздражительности', rubric: 'mind mildness', category: 'mental', weight: 1 },
    ],
  },
  Polarity: {
    key: 'fb-polarity',
    question: 'Как пациент реагирует на тепло и холод?',
    why_it_matters: 'Различает термическую модальность',
    supports: [], weakens: [],
    options: [
      { label: 'Зябкий, хуже от холода', rubric: 'chilly', category: 'general', weight: 2, modality: { pairId: 'heat_cold', value: 'amel' } },
      { label: 'Жаркий, хуже от тепла', rubric: 'hot patient', category: 'general', weight: 2, modality: { pairId: 'heat_cold', value: 'agg' } },
      { label: 'Нейтрально, без разницы', rubric: 'generalities temperature indifferent', category: 'general', weight: 1 },
    ],
  },
  Kent: {
    key: 'fb-kent',
    question: 'Что происходит ночью?',
    why_it_matters: 'Различает ночную симптоматику',
    supports: [], weakens: [],
    options: [
      { label: 'Просыпается в 2-4 часа с тревогой', rubric: 'mind anxiety night 2-4am', category: 'mental', weight: 3 },
      { label: 'Просыпается от мыслей о работе', rubric: 'mind thoughts business night', category: 'mental', weight: 2 },
      { label: 'Спит хорошо, не просыпается', rubric: 'sleep good', category: 'general', weight: 1 },
      { label: 'Ухудшение после сна', rubric: 'worse after sleep', category: 'general', weight: 3 },
    ],
  },
  Hierarchy: {
    key: 'fb-hierarchy',
    question: 'Когда пациенту плохо — как реагирует на утешение?',
    why_it_matters: 'Ключевой дифференциальный симптом',
    supports: [], weakens: [],
    options: [
      { label: 'Становится легче, хочет внимания', rubric: 'consolation ameliorates', category: 'mental', weight: 2, modality: { pairId: 'consolation', value: 'amel' } },
      { label: 'Раздражает, хочет побыть один', rubric: 'consolation aggravates', category: 'mental', weight: 3, modality: { pairId: 'consolation', value: 'agg' } },
      { label: 'Нейтрально', rubric: 'mind indifference consolation', category: 'mental', weight: 1 },
    ],
  },
  Negative: {
    key: 'fb-negative',
    question: 'Есть ли жажда?',
    why_it_matters: 'Жажда — ключевой общий симптом для дифференциации',
    supports: [], weakens: [],
    options: [
      { label: 'Сильная жажда, пьёт много', rubric: 'thirst large quantities', category: 'general', weight: 2 },
      { label: 'Пьёт мелкими глотками', rubric: 'thirst small sips frequently', category: 'general', weight: 3 },
      { label: 'Нет жажды', rubric: 'thirstless', category: 'general', weight: 2 },
      { label: 'Обычная, умеренная', rubric: 'thirst moderate', category: 'general', weight: 1 },
    ],
  },
}

// Общие fallback вопросы (если нет differentialLenses)
const GENERIC_FALLBACK: DifferentialQuestion[] = [
  FALLBACK_BY_LENS['Polarity'],
  FALLBACK_BY_LENS['Hierarchy'],
  FALLBACK_BY_LENS['Constellation'],
]

export function getFallbackQuestions(differentialLenses: string[]): DifferentialQuestion[] {
  if (differentialLenses.length === 0) return GENERIC_FALLBACK

  const questions: DifferentialQuestion[] = []
  for (const lens of differentialLenses) {
    const fb = FALLBACK_BY_LENS[lens]
    if (fb && !questions.some(q => q.key === fb.key)) {
      questions.push(fb)
    }
  }

  // Если по линзам нашли мало — добавить generic
  if (questions.length < 3) {
    for (const fb of GENERIC_FALLBACK) {
      if (!questions.some(q => q.key === fb.key)) {
        questions.push(fb)
        if (questions.length >= 3) break
      }
    }
  }

  return questions.slice(0, 5)
}

// =====================================================================
// 9. CaseAnalysisLog — единый лог-объект для полного аудита кейса
// =====================================================================

export type MappedAnswer = {
  questionKey: string
  questionText: string
  selectedLabel: string
  mappedRubric: string
  mappedCategory: 'mental' | 'general' | 'particular'
  mappedWeight: 1 | 2 | 3
  mappedModality?: { pairId: string; value: 'agg' | 'amel' }
}

export type CaseAnalysisLog = {
  // A. META
  meta: {
    caseId: string | null
    timestamp: string
    sourceType: 'free_text' | 'card' | 'confirmed'
    clarifyUsed: boolean
    aiUsed: boolean
    fallbackUsed: boolean
  }

  // B. INPUT
  input: {
    parsedSymptoms: { rubric: string; category: string; weight: number }[]
    parsedModalities: { pairId: string; value: string }[]
    confirmedCount: number
    warningsCount: number
    warnings: string[]
    inferredProfile?: { caseType: string; vitality: string; sensitivity: string; age: string }
  }

  // C. BEFORE RESULT
  before: {
    top1: string; top2: string; top3: string
    top1Score: number; top2Score: number; top3Score: number
    gap: number
    avgPressure: number; maxPressure: number
    confidence: string
    conflictLevel: string
    differentialLenses: string[]
  }

  // D. CLARIFY (null если не вызывался)
  clarify: {
    shouldClarify: boolean
    clarifyReason: string
    rawQuestionsCount: number
    validQuestionsCount: number
    invalidCount: number
    removedReasons: string[]
    generatedQuestions: { question: string; supports: string[]; weakens: string[]; optionCount: number }[]
    validatedQuestions: { question: string; supports: string[]; weakens: string[]; optionCount: number }[]
    selectedAnswers: MappedAnswer[]
    mappedSymptomsCount: number
    mappedModalitiesCount: number
  } | null

  // E. AFTER RESULT (null если clarify не вызывался)
  after: {
    top1: string; top2: string; top3: string
    top1Score: number; top2Score: number; top3Score: number
    gap: number
    avgPressure: number; maxPressure: number
    confidence: string
    conflictLevel: string
  } | null

  // F. EFFECTIVENESS (null если clarify не вызывался)
  effectiveness: {
    level: ClarifyEffectivenessLevel
    improvementScore: number
    top1Delta: number
    gapDelta: number
    avgPressureDelta: number
    maxPressureDelta: number
    changedTop1: boolean
    top1Weakened: boolean
    confidenceImproved: boolean
    contradictionPenalty: boolean
    conflictResolvedBonus: boolean
    reason: string
  } | null
}

// Builder — собирает лог по частям (вызывается из разных точек flow)
export class CaseLogBuilder {
  private log: CaseAnalysisLog

  constructor(caseId: string | null, sourceType: 'free_text' | 'card' | 'confirmed') {
    this.log = {
      meta: { caseId, timestamp: new Date().toISOString(), sourceType, clarifyUsed: false, aiUsed: false, fallbackUsed: false },
      input: { parsedSymptoms: [], parsedModalities: [], confirmedCount: 0, warningsCount: 0, warnings: [] },
      before: { top1: '', top2: '', top3: '', top1Score: 0, top2Score: 0, top3Score: 0, gap: 0, avgPressure: 0, maxPressure: 0, confidence: '', conflictLevel: 'none', differentialLenses: [] },
      clarify: null, after: null, effectiveness: null,
    }
  }

  setInput(symptoms: MDRISymptom[], modalities: MDRIModality[], warnings: { type: string }[], profile?: { caseType: { value: string }; vitality: { value: string }; sensitivity: { value: string }; age: { value: string } }) {
    this.log.input = {
      parsedSymptoms: symptoms.filter(s => s.present).map(s => ({ rubric: s.rubric, category: s.category, weight: s.weight })),
      parsedModalities: modalities.map(m => ({ pairId: m.pairId, value: m.value })),
      confirmedCount: symptoms.filter(s => s.present).length,
      warningsCount: warnings.length,
      warnings: warnings.map(w => w.type),
      ...(profile ? { inferredProfile: { caseType: profile.caseType.value, vitality: profile.vitality.value, sensitivity: profile.sensitivity.value, age: profile.age.value } } : {}),
    }
    return this
  }

  setBefore(results: MDRIResult[], confidence: string, conflictLevel: string, differentialLenses: string[]) {
    const r = (i: number) => results[i]
    const top1 = results[0]?.totalScore ?? 0
    this.log.before = {
      top1: r(0)?.remedy ?? '', top2: r(1)?.remedy ?? '', top3: r(2)?.remedy ?? '',
      top1Score: r(0)?.totalScore ?? 0, top2Score: r(1)?.totalScore ?? 0, top3Score: r(2)?.totalScore ?? 0,
      gap: top1 - (r(1)?.totalScore ?? 0),
      avgPressure: results.length >= 2 ? Math.round(results.slice(1, 4).reduce((s, x) => s + x.totalScore, 0) / Math.min(3, results.length - 1) / Math.max(top1, 1) * 100) / 100 : 0,
      maxPressure: results.length >= 2 ? Math.round(Math.max(...results.slice(1, 4).map(x => x.totalScore)) / Math.max(top1, 1) * 100) / 100 : 0,
      confidence, conflictLevel, differentialLenses,
    }
    return this
  }

  setClarify(data: {
    shouldClarify: boolean
    clarifyReason: string
    rawQuestions: DifferentialQuestion[]
    validatedQuestions: DifferentialQuestion[]
    removedReasons: string[]
    aiUsed: boolean
    fallbackUsed: boolean
  }) {
    this.log.meta.aiUsed = data.aiUsed
    this.log.meta.fallbackUsed = data.fallbackUsed
    this.log.clarify = {
      shouldClarify: data.shouldClarify,
      clarifyReason: data.clarifyReason,
      rawQuestionsCount: data.rawQuestions.length,
      validQuestionsCount: data.validatedQuestions.length,
      invalidCount: data.rawQuestions.length - data.validatedQuestions.length,
      removedReasons: data.removedReasons,
      generatedQuestions: data.rawQuestions.map(q => ({ question: q.question, supports: q.supports, weakens: q.weakens, optionCount: q.options.length })),
      validatedQuestions: data.validatedQuestions.map(q => ({ question: q.question, supports: q.supports, weakens: q.weakens, optionCount: q.options.length })),
      selectedAnswers: [],
      mappedSymptomsCount: 0,
      mappedModalitiesCount: 0,
    }
    return this
  }

  setAnswers(questions: DifferentialQuestion[], answers: Record<string, string>, mappedSymptoms: MDRISymptom[], mappedModalities: MDRIModality[]) {
    if (!this.log.clarify) return this
    this.log.meta.clarifyUsed = true

    const mapped: MappedAnswer[] = []
    for (const [key, label] of Object.entries(answers)) {
      const q = questions.find(x => x.key === key)
      if (!q) continue
      const opt = q.options.find(o => o.label === label)
      mapped.push({
        questionKey: key,
        questionText: q.question,
        selectedLabel: label,
        mappedRubric: opt?.rubric ?? label,
        mappedCategory: opt?.category ?? 'particular',
        mappedWeight: opt?.weight ?? 2,
        ...(opt?.modality ? { mappedModality: opt.modality } : {}),
      })
    }

    this.log.clarify.selectedAnswers = mapped
    this.log.clarify.mappedSymptomsCount = mappedSymptoms.length
    this.log.clarify.mappedModalitiesCount = mappedModalities.length
    return this
  }

  setAfter(results: MDRIResult[], confidence: string, conflictLevel: string) {
    const r = (i: number) => results[i]
    const top1 = results[0]?.totalScore ?? 0
    this.log.after = {
      top1: r(0)?.remedy ?? '', top2: r(1)?.remedy ?? '', top3: r(2)?.remedy ?? '',
      top1Score: r(0)?.totalScore ?? 0, top2Score: r(1)?.totalScore ?? 0, top3Score: r(2)?.totalScore ?? 0,
      gap: top1 - (r(1)?.totalScore ?? 0),
      avgPressure: results.length >= 2 ? Math.round(results.slice(1, 4).reduce((s, x) => s + x.totalScore, 0) / Math.min(3, results.length - 1) / Math.max(top1, 1) * 100) / 100 : 0,
      maxPressure: results.length >= 2 ? Math.round(Math.max(...results.slice(1, 4).map(x => x.totalScore)) / Math.max(top1, 1) * 100) / 100 : 0,
      confidence, conflictLevel,
    }
    return this
  }

  setEffectiveness(eff: ClarifyEffectiveness, improvementScore: number, contradictionPenalty: boolean, conflictBonus: boolean) {
    this.log.effectiveness = {
      level: eff.level,
      improvementScore,
      top1Delta: eff.top1_score_after - eff.top1_score_before,
      gapDelta: eff.delta_gap,
      avgPressureDelta: eff.alt_pressure_before - eff.alt_pressure_after,
      maxPressureDelta: eff.max_alt_pressure_before - eff.max_alt_pressure_after,
      changedTop1: eff.changed_top1,
      top1Weakened: eff.top1_score_after < eff.top1_score_before,
      confidenceImproved: eff.confidence_improved,
      contradictionPenalty,
      conflictResolvedBonus: conflictBonus,
      reason: eff.reason,
    }
    return this
  }

  build(): CaseAnalysisLog {
    return this.log
  }
}
