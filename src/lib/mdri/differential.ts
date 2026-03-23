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
