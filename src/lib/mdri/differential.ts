/**
 * MDRI Differential Layer
 *
 * AI-управляемая дифференциация. Вызывается ТОЛЬКО когда shouldClarify() == true.
 * AI не выбирает препарат — только генерирует вопросы для различения top-1 vs top-2 vs top-3.
 * Engine core не изменён.
 */

import type { MDRIResult, MDRISymptom, MDRIModality } from './types'
import type { ConfidenceResult, ConflictCheckResult } from './product-layer'

// =====================================================================
// 1. shouldClarify — определяет нужны ли уточняющие вопросы
// =====================================================================

export function shouldClarify(
  confidence: ConfidenceResult,
  results: MDRIResult[],
  conflict: ConflictCheckResult,
): boolean {
  // Всегда уточнять при hard contradiction
  if (conflict.level === 'hard') return true

  // Уточнять при differential conflict
  if (conflict.level === 'differential') return true

  // Уточнять если confidence не high
  if (confidence.level !== 'high') return true

  // Уточнять если top-2 слишком близко (gap < 8)
  if (results.length >= 2) {
    const gap = results[0].totalScore - results[1].totalScore
    if (gap < 8) return true
  }

  return false
}

// =====================================================================
// 2. Типы для differential questions
// =====================================================================

export type DifferentialQuestion = {
  question: string
  why_it_matters: string
  supports: string[]    // препараты которые усиливает ответ "да"
  weakens: string[]     // препараты которые ослабляет ответ "да"
  options: string[]     // варианты ответа
  key: string           // уникальный ключ для отслеживания
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
// 3. buildDifferentialContext — собрать контекст для AI
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
    top1: r(0)!,
    top2: r(1)!,
    top3: r(2),
    parsedSymptoms: symptoms.filter(s => s.present),
    modalities,
    conflict,
  }
}

// =====================================================================
// 4. buildDifferentialPrompt — промпт для Sonnet
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
    ? `\nКОНФЛИКТ: ${ctx.conflict.reason}\nДифференциальные линзы: ${ctx.conflict.differentialLenses.join(', ')}`
    : ''

  const altStrStr = ctx.conflict.altStrengths.length > 0
    ? '\nПреимущества альтернатив:\n' + ctx.conflict.altStrengths
      .map(a => `  ${a.remedy}: ${a.strengths.join(', ')}`)
      .join('\n')
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
${conflictStr ? `\nКонфликт:\n${conflictStr}` : ''}
${ctx.conflict.differentialLenses.length > 0 ? `\nКлючевые линзы различия: ${ctx.conflict.differentialLenses.join(', ')}` : ''}
${altStrStr}

Сформируй 3–5 уточняющих вопросов, которые:
1. Различают ${ctx.top1.remedy}, ${ctx.top2.remedy}${ctx.top3 ? `, ${ctx.top3.remedy}` : ''}
2. Могут изменить итоговый выбор
3. Не являются общими
4. Не подтверждают автоматически текущий top-1
5. Имеют варианты ответа (2–4 варианта)

Для каждого вопроса укажи:
- question (на русском, понятный врачу-гомеопату)
- why_it_matters (1 строка — почему этот вопрос различает препараты)
- supports (какие препараты усиливает ответ)
- weakens (какие препараты ослабляет)
- options (варианты ответа)

Верни строго JSON:
[
  {
    "question": "конкретный вопрос",
    "why_it_matters": "почему этот вопрос различает препараты (1 строка)",
    "supports": ["abbrev препарата который усиливается"],
    "weakens": ["abbrev препарата который ослабляется"],
    "options": ["вариант 1", "вариант 2", "вариант 3"]
  }
]

ТОЛЬКО JSON, без markdown.`
}

// =====================================================================
// 5. parseDifferentialResponse — парсинг ответа AI
// =====================================================================

export function parseDifferentialResponse(text: string): DifferentialQuestion[] {
  try {
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []

    return parsed.slice(0, 5).map((q: Record<string, unknown>, i: number) => ({
      question: String(q.question ?? ''),
      why_it_matters: String(q.why_it_matters ?? ''),
      supports: Array.isArray(q.supports) ? q.supports.map(String) : [],
      weakens: Array.isArray(q.weakens) ? q.weakens.map(String) : [],
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      key: `diff-${i}`,
    })).filter(q => q.question.length > 0 && q.options.length >= 2)
  } catch {
    return []
  }
}

// =====================================================================
// 6. convertAnswersToSymptoms — ответы → симптомы для rerun
// =====================================================================

export function convertAnswersToSymptoms(
  questions: DifferentialQuestion[],
  answers: Record<string, string>,
): { symptoms: MDRISymptom[]; modalities: MDRIModality[] } {
  const symptoms: MDRISymptom[] = []
  const modalities: MDRIModality[] = []

  for (const q of questions) {
    const answer = answers[q.key]
    if (!answer) continue

    // Каждый ответ = новый симптом с weight=2 (значимый, подтверждён врачом)
    // Рубрика формируется из вопроса + ответа
    const rubric = `${q.question} ${answer}`.toLowerCase()
      .replace(/[?!.,;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 6)
      .join(' ')

    // Определяем категорию по содержанию
    const lowerQ = q.question.toLowerCase()
    let category: 'mental' | 'general' | 'particular' = 'particular'
    if (lowerQ.includes('настроен') || lowerQ.includes('эмоц') || lowerQ.includes('страх') ||
        lowerQ.includes('тревог') || lowerQ.includes('раздраж') || lowerQ.includes('характер')) {
      category = 'mental'
    } else if (lowerQ.includes('зябк') || lowerQ.includes('жажд') || lowerQ.includes('потеет') ||
               lowerQ.includes('сон') || lowerQ.includes('аппетит') || lowerQ.includes('энерг')) {
      category = 'general'
    }

    symptoms.push({ rubric, category, present: true, weight: 2 })

    // Модальности из ответа
    const lowerA = answer.toLowerCase()
    if (lowerA.includes('хуже от тепл') || lowerA.includes('жарк')) {
      modalities.push({ pairId: 'heat_cold', value: 'agg' })
    }
    if (lowerA.includes('хуже от холод') || lowerA.includes('зябк')) {
      modalities.push({ pairId: 'heat_cold', value: 'amel' })
    }
    if (lowerA.includes('хуже от движен')) {
      modalities.push({ pairId: 'motion_rest', value: 'agg' })
    }
    if (lowerA.includes('лучше от движен')) {
      modalities.push({ pairId: 'motion_rest', value: 'amel' })
    }
  }

  return { symptoms, modalities }
}
