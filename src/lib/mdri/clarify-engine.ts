/**
 * Clarify Engine — выбирает ЛУЧШИЙ дифференцирующий вопрос.
 *
 * AI генерирует кандидатов → engine ранжирует по information gain.
 * Максимум 2 вопроса за кейс. Engine core не изменён.
 */

import type { MDRIResult, MDRISymptom, MDRIModality } from './types'
import type { ConflictCheckResult } from './product-layer'
import type { DifferentialQuestion, OptionWithMapping } from './differential'

// =====================================================================
// 1. selectDifferentialPair — кто vs кого
// =====================================================================

export type DifferentialPair = {
  top1: { remedy: string; score: number; lenses: MDRIResult['lenses'] }
  alt: { remedy: string; score: number; lenses: MDRIResult['lenses'] }
  gap: number
  reason: string // почему выбрана эта пара
}

export function selectDifferentialPair(results: MDRIResult[], conflict: ConflictCheckResult): DifferentialPair | null {
  if (results.length < 2) return null

  const top1 = results[0]
  const top2 = results[1]
  const top3 = results[2]
  const gap12 = top1.totalScore - top2.totalScore

  // Если conflict указывает на конкретный alt с сильным constellation
  if (conflict.altAdvantages.length > 0) {
    const csAdv = conflict.altAdvantages.find(a => a.lens === 'Constellation' && a.altScore >= 40)
    if (csAdv) {
      const altResult = results.find(r => r.remedy.toLowerCase().replace(/\.$/, '') === csAdv.remedy)
      if (altResult) {
        return {
          top1: { remedy: top1.remedy, score: top1.totalScore, lenses: top1.lenses },
          alt: { remedy: altResult.remedy, score: altResult.totalScore, lenses: altResult.lenses },
          gap: top1.totalScore - altResult.totalScore,
          reason: `constellation conflict: ${altResult.remedy} cs=${csAdv.altScore}% vs top1 cs=${csAdv.topScore}%`,
        }
      }
    }
  }

  // Top-3 ближе к top-1 чем top-2? (редко, но бывает при tie)
  if (top3 && gap12 > 0) {
    const gap13 = top1.totalScore - top3.totalScore
    // Если top-3 имеет сильный constellation а top-2 нет
    const cs2 = top2.lenses.find(l => l.name === 'Constellation')?.score ?? 0
    const cs3 = top3.lenses.find(l => l.name === 'Constellation')?.score ?? 0
    if (cs3 > cs2 + 20 && gap13 < 15) {
      return {
        top1: { remedy: top1.remedy, score: top1.totalScore, lenses: top1.lenses },
        alt: { remedy: top3.remedy, score: top3.totalScore, lenses: top3.lenses },
        gap: gap13,
        reason: `top-3 stronger constellation: ${top3.remedy} cs=${cs3}% vs top-2 cs=${cs2}%`,
      }
    }
  }

  // Default: top-1 vs top-2
  return {
    top1: { remedy: top1.remedy, score: top1.totalScore, lenses: top1.lenses },
    alt: { remedy: top2.remedy, score: top2.totalScore, lenses: top2.lenses },
    gap: gap12,
    reason: 'default: top-1 vs top-2',
  }
}

// =====================================================================
// 2. buildDifferentialMatrix — что общего, что различает
// =====================================================================

export type DifferentialMatrix = {
  pair: DifferentialPair
  // Линзы где top1 сильнее alt
  top1Strengths: { lens: string; top1Score: number; altScore: number; delta: number }[]
  // Линзы где alt сильнее top1
  altStrengths: { lens: string; top1Score: number; altScore: number; delta: number }[]
  // Линзы где оба близки (delta < 10)
  sharedFeatures: { lens: string; score: number }[]
  // Ключевые линзы для дифференциации (delta >= 15)
  discriminators: string[]
  // Что НЕ хватает для разведения (нет данных)
  missingDiscriminators: string[]
}

const ALL_LENSES = ['Kent', 'Constellation', 'Hierarchy', 'Polarity', 'Negative']

export function buildDifferentialMatrix(results: MDRIResult[], pair: DifferentialPair): DifferentialMatrix {
  const top1Result = results.find(r => r.remedy === pair.top1.remedy)!
  const altResult = results.find(r => r.remedy === pair.alt.remedy)!

  const top1Strengths: DifferentialMatrix['top1Strengths'] = []
  const altStrengths: DifferentialMatrix['altStrengths'] = []
  const sharedFeatures: DifferentialMatrix['sharedFeatures'] = []
  const discriminators: string[] = []

  for (const lensName of ALL_LENSES) {
    const t1 = top1Result.lenses.find(l => l.name === lensName)?.score ?? 0
    const alt = altResult.lenses.find(l => l.name === lensName)?.score ?? 0
    const delta = t1 - alt

    if (Math.abs(delta) < 10) {
      sharedFeatures.push({ lens: lensName, score: Math.round((t1 + alt) / 2) })
    } else if (delta > 0) {
      top1Strengths.push({ lens: lensName, top1Score: t1, altScore: alt, delta })
    } else {
      altStrengths.push({ lens: lensName, top1Score: t1, altScore: alt, delta: Math.abs(delta) })
    }

    if (Math.abs(delta) >= 15) {
      discriminators.push(lensName)
    }
  }

  // Missing discriminators: линзы где оба = 0 или нет данных
  const missingDiscriminators = ALL_LENSES.filter(lens => {
    const t1 = top1Result.lenses.find(l => l.name === lens)?.score ?? 0
    const alt = altResult.lenses.find(l => l.name === lens)?.score ?? 0
    return t1 === 0 && alt === 0
  })

  return { pair, top1Strengths, altStrengths, sharedFeatures, discriminators, missingDiscriminators }
}

// =====================================================================
// 3. rankClarifyQuestions — information gain ranking
// =====================================================================

export type RankedQuestion = DifferentialQuestion & {
  informationGain: number // 0..1
  rankReason: string
}

export function rankClarifyQuestions(
  matrix: DifferentialMatrix,
  questions: DifferentialQuestion[],
): RankedQuestion[] {
  const pair = matrix.pair
  const top1Name = pair.top1.remedy.toLowerCase().replace(/\.$/, '')
  const altName = pair.alt.remedy.toLowerCase().replace(/\.$/, '')

  const ranked: RankedQuestion[] = questions.map(q => {
    let gain = 0
    const reasons: string[] = []

    // 1. Supports top1 AND weakens alt (или наоборот) → высокий gain
    const supportsTop1 = q.supports.some(s => s.toLowerCase() === top1Name)
    const weakensAlt = q.weakens.some(s => s.toLowerCase() === altName)
    const supportsAlt = q.supports.some(s => s.toLowerCase() === altName)
    const weakensTop1 = q.weakens.some(s => s.toLowerCase() === top1Name)

    if ((supportsTop1 && weakensAlt) || (supportsAlt && weakensTop1)) {
      gain += 0.4
      reasons.push('прямо разводит пару')
    } else if (supportsTop1 || weakensAlt || supportsAlt || weakensTop1) {
      gain += 0.2
      reasons.push('частично разводит')
    }

    // 2. Связан с discriminator линзами → бонус
    for (const disc of matrix.discriminators) {
      const qText = q.question.toLowerCase()
      if (disc === 'Constellation' && (qText.includes('паттерн') || qText.includes('характерн'))) gain += 0.1
      if (disc === 'Polarity' && (qText.includes('тепл') || qText.includes('холод') || qText.includes('движен'))) gain += 0.1
      if (disc === 'Hierarchy' && (qText.includes('психик') || qText.includes('эмоц') || qText.includes('настроен'))) gain += 0.1
    }

    // 3. Имеет конкретные options с rubric → бонус за детерминированность
    const hasRubrics = q.options.every(o => o.rubric && o.rubric.length > 3)
    if (hasRubrics) {
      gain += 0.15
      reasons.push('детерминированный маппинг')
    }

    // 4. Peculiar options (weight=3) → бонус
    const hasPeculiar = q.options.some(o => o.weight >= 3)
    if (hasPeculiar) {
      gain += 0.1
      reasons.push('есть peculiar')
    }

    // 5. Penalty за общие вопросы
    const generic = ['как вы себя', 'расскажите', 'опишите', 'что вас беспокоит'].some(p => q.question.toLowerCase().includes(p))
    if (generic) {
      gain -= 0.3
      reasons.push('слишком общий')
    }

    return {
      ...q,
      informationGain: Math.max(0, Math.min(1, gain)),
      rankReason: reasons.join(', ') || 'baseline',
    }
  })

  // Сортировка по gain (desc)
  ranked.sort((a, b) => b.informationGain - a.informationGain)
  return ranked
}

// =====================================================================
// 4. selectBestQuestions — выбрать 1-2 лучших
// =====================================================================

const MAX_CLARIFY_QUESTIONS = 2
const MIN_GAIN_THRESHOLD = 0.2

export function selectBestQuestions(ranked: RankedQuestion[]): RankedQuestion[] {
  return ranked
    .filter(q => q.informationGain >= MIN_GAIN_THRESHOLD)
    .slice(0, MAX_CLARIFY_QUESTIONS)
}

// =====================================================================
// 5. buildClarifyPrompt — промпт для AI с differential matrix
// =====================================================================

export function buildClarifyPrompt(
  matrix: DifferentialMatrix,
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
): string {
  const pair = matrix.pair
  const lensStr = (lenses: MDRIResult['lenses']) => lenses.map(l => `${l.name}:${l.score}%`).join(' ')

  const sympStr = symptoms.filter(s => s.present)
    .map(s => `${s.rubric} (${s.category}, w=${s.weight})`).join('\n  ')

  const modStr = modalities.length > 0
    ? modalities.map(m => `${m.pairId}: ${m.value}`).join(', ') : 'нет'

  const strengthsStr = [
    ...matrix.top1Strengths.map(s => `  ${pair.top1.remedy} сильнее по ${s.lens}: ${s.top1Score}% vs ${s.altScore}%`),
    ...matrix.altStrengths.map(s => `  ${pair.alt.remedy} сильнее по ${s.lens}: ${s.altScore + s.delta}% vs ${s.top1Score}%`),
  ].join('\n')

  const discStr = matrix.discriminators.length > 0
    ? `Ключевые линзы различия: ${matrix.discriminators.join(', ')}` : ''

  const missingStr = matrix.missingDiscriminators.length > 0
    ? `Нет данных по: ${matrix.missingDiscriminators.join(', ')}` : ''

  return `Ты помогаешь различить два гомеопатических препарата.

ПАРА ДЛЯ ДИФФЕРЕНЦИАЦИИ:
${pair.top1.remedy} (${pair.top1.score}%) — ${lensStr(pair.top1.lenses)}
${pair.alt.remedy} (${pair.alt.score}%) — ${lensStr(pair.alt.lenses)}
Gap: ${pair.gap}%

РАЗЛИЧИЯ:
${strengthsStr}
${discStr}
${missingStr}

СИМПТОМЫ ПАЦИЕНТА:
  ${sympStr}
Модальности: ${modStr}

Сформируй 3-4 вопроса, которые РАЗВЕДУТ ${pair.top1.remedy} и ${pair.alt.remedy}.

Правила:
1. Каждый вопрос должен усиливать ОДИН препарат и ослаблять ДРУГОЙ
2. Фокус на ${matrix.discriminators.length > 0 ? matrix.discriminators.join(', ') : 'ключевых различиях'}
3. Не задавай общие вопросы
4. Каждый option должен содержать rubric для детерминированного маппинга

Верни строго JSON:
[
  {
    "question": "вопрос на русском",
    "why_it_matters": "1 строка",
    "supports": ["${pair.top1.remedy.toLowerCase().replace(/\.$/, '')}"],
    "weakens": ["${pair.alt.remedy.toLowerCase().replace(/\.$/, '')}"],
    "target_discriminator": "Constellation|Polarity|Hierarchy|Kent",
    "options": [
      { "label": "текст", "rubric": "english rubric", "category": "mental|general|particular", "weight": 1-3 }
    ]
  }
]

ТОЛЬКО JSON.`
}

// =====================================================================
// 6. Полный clarify flow: matrix → AI → rank → select → return
// =====================================================================

export type ClarifyEngineResult = {
  pair: DifferentialPair | null
  matrix: DifferentialMatrix | null
  allCandidates: RankedQuestion[]
  selectedQuestions: RankedQuestion[]
  aiUsed: boolean
  fallbackUsed: boolean
}

export function runClarifyEngine(
  results: MDRIResult[],
  conflict: ConflictCheckResult,
  aiQuestions: DifferentialQuestion[],  // кандидаты от AI
): ClarifyEngineResult {
  const pair = selectDifferentialPair(results, conflict)
  if (!pair) return { pair: null, matrix: null, allCandidates: [], selectedQuestions: [], aiUsed: false, fallbackUsed: false }

  const matrix = buildDifferentialMatrix(results, pair)
  const ranked = rankClarifyQuestions(matrix, aiQuestions)
  const selected = selectBestQuestions(ranked)

  return {
    pair, matrix,
    allCandidates: ranked,
    selectedQuestions: selected,
    aiUsed: aiQuestions.length > 0,
    fallbackUsed: selected.length === 0 && aiQuestions.length > 0, // AI дал кандидатов, но все отфильтрованы
  }
}
