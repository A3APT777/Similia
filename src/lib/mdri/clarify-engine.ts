/**
 * Clarify Engine v3 — discriminator-first architecture.
 *
 * НЕ генерирует вопросы абстрактно.
 * Сначала выбирает КОНКРЕТНЫЙ discriminator (различие между парой),
 * затем AI формулирует вопрос ТОЛЬКО от этого discriminator.
 *
 * Flow: selectPair → buildMatrix → selectDiscriminator → AI формулирует → validate
 * Максимум 1 вопрос. Engine core не изменён.
 */

import type { MDRIResult, MDRISymptom, MDRIModality } from './types'
import type { ConflictCheckResult } from './product-layer'
import type { DifferentialQuestion, OptionWithMapping } from './differential'

// =====================================================================
// 1. selectDifferentialPair
// =====================================================================

export type DifferentialPair = {
  top1: { remedy: string; score: number; lenses: MDRIResult['lenses'] }
  alt: { remedy: string; score: number; lenses: MDRIResult['lenses'] }
  gap: number
  reason: string
}

export function selectDifferentialPair(results: MDRIResult[], conflict: ConflictCheckResult): DifferentialPair | null {
  if (results.length < 2) return null
  const top1 = results[0]
  const top2 = results[1]
  const top3 = results[2]

  // Constellation conflict → выбрать alt с сильным cs
  if (conflict.altAdvantages.length > 0) {
    const csAdv = conflict.altAdvantages.find(a => a.lens === 'Constellation' && a.altScore >= 40)
    if (csAdv) {
      const altResult = results.find(r => r.remedy.toLowerCase().replace(/\.$/, '') === csAdv.remedy)
      if (altResult) return {
        top1: { remedy: top1.remedy, score: top1.totalScore, lenses: top1.lenses },
        alt: { remedy: altResult.remedy, score: altResult.totalScore, lenses: altResult.lenses },
        gap: top1.totalScore - altResult.totalScore,
        reason: `constellation conflict: ${altResult.remedy} cs=${csAdv.altScore}%`,
      }
    }
  }

  // Top-3 с более сильным constellation?
  if (top3) {
    const cs2 = top2.lenses.find(l => l.name === 'Constellation')?.score ?? 0
    const cs3 = top3.lenses.find(l => l.name === 'Constellation')?.score ?? 0
    if (cs3 > cs2 + 20 && top1.totalScore - top3.totalScore < 15) {
      return {
        top1: { remedy: top1.remedy, score: top1.totalScore, lenses: top1.lenses },
        alt: { remedy: top3.remedy, score: top3.totalScore, lenses: top3.lenses },
        gap: top1.totalScore - top3.totalScore,
        reason: `top-3 stronger constellation: cs=${cs3}%`,
      }
    }
  }

  return {
    top1: { remedy: top1.remedy, score: top1.totalScore, lenses: top1.lenses },
    alt: { remedy: top2.remedy, score: top2.totalScore, lenses: top2.lenses },
    gap: top1.totalScore - top2.totalScore,
    reason: 'top-1 vs top-2',
  }
}

// =====================================================================
// 2. buildDifferentialMatrix
// =====================================================================

export type DifferentialMatrix = {
  pair: DifferentialPair
  top1Strengths: { lens: string; top1Score: number; altScore: number; delta: number }[]
  altStrengths: { lens: string; top1Score: number; altScore: number; delta: number }[]
  sharedFeatures: { lens: string; score: number }[]
  discriminators: string[]
  missingDiscriminators: string[]
}

const ALL_LENSES = ['Kent', 'Constellation', 'Hierarchy', 'Polarity', 'Negative']

export function buildDifferentialMatrix(results: MDRIResult[], pair: DifferentialPair): DifferentialMatrix {
  const top1R = results.find(r => r.remedy === pair.top1.remedy)!
  const altR = results.find(r => r.remedy === pair.alt.remedy)!

  const top1Strengths: DifferentialMatrix['top1Strengths'] = []
  const altStrengths: DifferentialMatrix['altStrengths'] = []
  const sharedFeatures: DifferentialMatrix['sharedFeatures'] = []
  const discriminators: string[] = []

  for (const lens of ALL_LENSES) {
    const t1 = top1R.lenses.find(l => l.name === lens)?.score ?? 0
    const alt = altR.lenses.find(l => l.name === lens)?.score ?? 0
    const d = t1 - alt
    if (Math.abs(d) < 10) sharedFeatures.push({ lens, score: Math.round((t1 + alt) / 2) })
    else if (d > 0) top1Strengths.push({ lens, top1Score: t1, altScore: alt, delta: d })
    else altStrengths.push({ lens, top1Score: t1, altScore: alt, delta: Math.abs(d) })
    if (Math.abs(d) >= 15) discriminators.push(lens)
  }

  const missingDiscriminators = ALL_LENSES.filter(l => {
    const t1 = top1R.lenses.find(x => x.name === l)?.score ?? 0
    const alt = altR.lenses.find(x => x.name === l)?.score ?? 0
    return t1 === 0 && alt === 0
  })

  return { pair, top1Strengths, altStrengths, sharedFeatures, discriminators, missingDiscriminators }
}

// =====================================================================
// 3. Discriminator — КОНКРЕТНОЕ различие между парой
// =====================================================================

export type Discriminator = {
  type: 'modality' | 'symptom' | 'thermal' | 'thirst' | 'time' | 'sensitivity'
  description: string           // человекочитаемое описание
  top1Supports: string          // что характерно для top-1
  altSupports: string           // что характерно для alt
  rubricTop1: string            // rubric если ответ за top-1
  rubricAlt: string             // rubric если ответ за alt
  categoryTop1: 'mental' | 'general' | 'particular'
  categoryAlt: 'mental' | 'general' | 'particular'
  weightTop1: 1 | 2 | 3
  weightAlt: 1 | 2 | 3
  modalityTop1?: { pairId: string; value: 'agg' | 'amel' }
  modalityAlt?: { pairId: string; value: 'agg' | 'amel' }
  sourceLens: string            // какая линза различает
  confidence: number            // 0..1 — насколько уверены что это различит
}

// Предопределённые discriminators для частых ДД пар
// Ключ = sorted pair "remedy1_remedy2"
const KNOWN_DISCRIMINATORS: Record<string, Discriminator[]> = {
  // Ign vs Nat-m
  'ign_nat-m': [
    { type: 'symptom', description: 'Характер горя: острое/свежее vs давнее/подавленное',
      top1Supports: 'Ignatia: острое горе, парадоксальные реакции', altSupports: 'Nat-m: давнее горе, замкнутость',
      rubricTop1: 'grief recent acute', rubricAlt: 'grief suppressed old silent',
      categoryTop1: 'mental', categoryAlt: 'mental', weightTop1: 3, weightAlt: 3,
      sourceLens: 'Constellation', confidence: 0.9 },
    { type: 'symptom', description: 'Реакция на утешение',
      top1Supports: 'Ignatia: может принять утешение', altSupports: 'Nat-m: утешение раздражает',
      rubricTop1: 'consolation ameliorates', rubricAlt: 'consolation aggravates',
      categoryTop1: 'mental', categoryAlt: 'mental', weightTop1: 2, weightAlt: 3,
      modalityTop1: { pairId: 'consolation', value: 'amel' }, modalityAlt: { pairId: 'consolation', value: 'agg' },
      sourceLens: 'Polarity', confidence: 0.95 },
  ],
  // Ars vs Apis
  'apis_ars': [
    { type: 'thermal', description: 'Реакция на тепло',
      top1Supports: 'Apis: хуже от тепла', altSupports: 'Ars: лучше от тепла',
      rubricTop1: 'hot patient worse heat', rubricAlt: 'chilly better warmth',
      categoryTop1: 'general', categoryAlt: 'general', weightTop1: 2, weightAlt: 2,
      modalityTop1: { pairId: 'heat_cold', value: 'agg' }, modalityAlt: { pairId: 'heat_cold', value: 'amel' },
      sourceLens: 'Polarity', confidence: 0.95 },
    { type: 'thirst', description: 'Жажда',
      top1Supports: 'Apis: нет жажды', altSupports: 'Ars: пьёт часто мелкими глотками',
      rubricTop1: 'thirstless', rubricAlt: 'thirst small sips frequently',
      categoryTop1: 'general', categoryAlt: 'general', weightTop1: 2, weightAlt: 3,
      sourceLens: 'Kent', confidence: 0.9 },
  ],
  // Coloc vs Mag-p
  'coloc_mag-p': [
    { type: 'symptom', description: 'Причина боли',
      top1Supports: 'Coloc: боль после гнева/обиды', altSupports: 'Mag-p: боль без эмоциональной причины',
      rubricTop1: 'ailments from anger indignation', rubricAlt: 'pain cramping spasmodic',
      categoryTop1: 'mental', categoryAlt: 'particular', weightTop1: 3, weightAlt: 2,
      sourceLens: 'Constellation', confidence: 0.85 },
  ],
  // Graph vs Petr
  'graph_petr': [
    { type: 'symptom', description: 'Характер кожных выделений',
      top1Supports: 'Graph: густые медовые выделения', altSupports: 'Petr: глубокие трещины без выделений',
      rubricTop1: 'eruptions oozing honey-like', rubricAlt: 'cracks fissures deep bleeding',
      categoryTop1: 'particular', categoryAlt: 'particular', weightTop1: 3, weightAlt: 3,
      sourceLens: 'Constellation', confidence: 0.9 },
  ],
  // Spong vs Hep
  'hep_spong': [
    { type: 'sensitivity', description: 'Чувствительность к холоду',
      top1Supports: 'Hep: крайняя чувствительность к холоду и сквознякам', altSupports: 'Spong: кашель хуже до полуночи',
      rubricTop1: 'chilly extreme sensitive cold draft', rubricAlt: 'cough worse before midnight dry barking',
      categoryTop1: 'general', categoryAlt: 'particular', weightTop1: 3, weightAlt: 3,
      sourceLens: 'Polarity', confidence: 0.85 },
  ],
  // Spong vs Dros
  'dros_spong': [
    { type: 'time', description: 'Время кашля',
      top1Supports: 'Dros: хуже ПОСЛЕ полуночи', altSupports: 'Spong: хуже ДО полуночи',
      rubricTop1: 'cough worse after midnight lying', rubricAlt: 'cough worse before midnight',
      categoryTop1: 'particular', categoryAlt: 'particular', weightTop1: 3, weightAlt: 3,
      sourceLens: 'Kent', confidence: 0.9 },
  ],
  // Lyc vs Arg-n
  'arg-n_lyc': [
    { type: 'thermal', description: 'Термика',
      top1Supports: 'Arg-n: жаркий, хуже от тепла', altSupports: 'Lyc: зябкий, хуже от холода',
      rubricTop1: 'hot patient', rubricAlt: 'chilly',
      categoryTop1: 'general', categoryAlt: 'general', weightTop1: 2, weightAlt: 2,
      modalityTop1: { pairId: 'heat_cold', value: 'agg' }, modalityAlt: { pairId: 'heat_cold', value: 'amel' },
      sourceLens: 'Polarity', confidence: 0.9 },
  ],
  // Phos vs Carc
  'carc_phos': [
    { type: 'symptom', description: 'Характер сочувствия',
      top1Supports: 'Phos: открытое сочувствие, экстраверт', altSupports: 'Carc: подавляет эмоции, угождает',
      rubricTop1: 'sympathetic compassionate open', rubricAlt: 'emotions suppressed pleasing others',
      categoryTop1: 'mental', categoryAlt: 'mental', weightTop1: 2, weightAlt: 3,
      sourceLens: 'Constellation', confidence: 0.8 },
  ],
  // Calc vs Carc
  'calc_carc': [
    { type: 'symptom', description: 'Особенности пота',
      top1Supports: 'Calc: кислый пот головы ночью', altSupports: 'Carc: перфекционизм, угождение',
      rubricTop1: 'perspiration head night sour', rubricAlt: 'fastidious pleasing others',
      categoryTop1: 'general', categoryAlt: 'mental', weightTop1: 3, weightAlt: 2,
      sourceLens: 'Constellation', confidence: 0.85 },
  ],
}

function pairKey(r1: string, r2: string): string {
  const n = (s: string) => s.toLowerCase().replace(/\.$/, '')
  return [n(r1), n(r2)].sort().join('_')
}

// =====================================================================
// 4. selectBestDiscriminator — выбрать самый информативный
// =====================================================================

export function selectBestDiscriminator(
  matrix: DifferentialMatrix,
  existingSymptoms: MDRISymptom[],
  existingModalities: MDRIModality[],
): Discriminator | null {
  const key = pairKey(matrix.pair.top1.remedy, matrix.pair.alt.remedy)
  const known = KNOWN_DISCRIMINATORS[key]

  if (!known || known.length === 0) return null

  // Фильтруем: не спрашивать то что уже известно
  const available = known.filter(d => {
    // Если модальность уже есть — не спрашивать
    if (d.modalityTop1 && existingModalities.some(m => m.pairId === d.modalityTop1!.pairId)) return false
    if (d.modalityAlt && existingModalities.some(m => m.pairId === d.modalityAlt!.pairId)) return false

    // Если rubric уже есть в симптомах — не спрашивать
    const rubLower1 = d.rubricTop1.toLowerCase()
    const rubLower2 = d.rubricAlt.toLowerCase()
    const alreadyHas = existingSymptoms.some(s => {
      const r = s.rubric.toLowerCase()
      return r.includes(rubLower1.split(' ')[0]) || r.includes(rubLower2.split(' ')[0])
    })
    if (alreadyHas) return false

    return true
  })

  if (available.length === 0) return null

  // Выбираем с наивысшим confidence
  available.sort((a, b) => b.confidence - a.confidence)
  return available[0]
}

// =====================================================================
// 5. discriminatorToQuestion — детерминированный вопрос от discriminator
// =====================================================================

export function discriminatorToQuestion(disc: Discriminator, pair: DifferentialPair): DifferentialQuestion {
  const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

  const options: OptionWithMapping[] = [
    {
      label: disc.top1Supports.split(': ')[1] ?? disc.top1Supports,
      rubric: disc.rubricTop1,
      category: disc.categoryTop1,
      weight: disc.weightTop1,
      ...(disc.modalityTop1 ? { modality: disc.modalityTop1 } : {}),
    },
    {
      label: disc.altSupports.split(': ')[1] ?? disc.altSupports,
      rubric: disc.rubricAlt,
      category: disc.categoryAlt,
      weight: disc.weightAlt,
      ...(disc.modalityAlt ? { modality: disc.modalityAlt } : {}),
    },
    {
      label: 'Не могу определить / неприменимо',
      rubric: '',
      category: 'general',
      weight: 1,
    },
  ]

  return {
    question: disc.description,
    why_it_matters: `Различает ${pair.top1.remedy} и ${pair.alt.remedy}`,
    supports: [norm(pair.top1.remedy)],
    weakens: [norm(pair.alt.remedy)],
    options,
    key: 'disc-0',
  }
}

// =====================================================================
// 6. buildAIDiscriminatorPrompt — AI формулирует вопрос от discriminator
//    (только если нет known discriminator)
// =====================================================================

export function buildAIDiscriminatorPrompt(
  matrix: DifferentialMatrix,
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
): string {
  const pair = matrix.pair
  const lensStr = (lenses: MDRIResult['lenses']) => lenses.map(l => `${l.name}:${l.score}%`).join(' ')
  const sympStr = symptoms.filter(s => s.present).map(s => `${s.rubric} (${s.category}, w=${s.weight})`).join('\n  ')

  const diffs = [
    ...matrix.top1Strengths.map(s => `${pair.top1.remedy} сильнее по ${s.lens}: ${s.top1Score}% vs ${s.altScore}%`),
    ...matrix.altStrengths.map(s => `${pair.alt.remedy} сильнее по ${s.lens}: ${s.top1Score}% vs ${s.altScore + s.delta}%`),
  ].join('\n')

  return `Ты формулируешь ОДИН конкретный вопрос для различения двух гомеопатических препаратов.

ПАРА: ${pair.top1.remedy} vs ${pair.alt.remedy}

РАЗЛИЧИЯ:
${diffs}

СИМПТОМЫ:
  ${sympStr}

Найди ОДНО конкретное различие между ${pair.top1.remedy} и ${pair.alt.remedy} (модальность, peculiar, термика, жажда, время ухудшения).

Сформулируй 1 вопрос:
- Конкретный, не абстрактный
- С 2-3 вариантами ответа
- Каждый вариант содержит rubric
- Один вариант supports ${pair.top1.remedy}, другой ${pair.alt.remedy}

ЗАПРЕЩЕНО: абстрактные вопросы про настроение, эмоции, "как вы себя чувствуете"

JSON (1 объект, НЕ массив):
{
  "question": "...",
  "why_it_matters": "...",
  "supports": ["${pair.top1.remedy.toLowerCase().replace(/\.$/, '')}"],
  "weakens": ["${pair.alt.remedy.toLowerCase().replace(/\.$/, '')}"],
  "options": [
    { "label": "...", "rubric": "...", "category": "...", "weight": 2 },
    { "label": "...", "rubric": "...", "category": "...", "weight": 2 }
  ]
}

ТОЛЬКО JSON.`
}

// =====================================================================
// 7. Полный flow: selectPair → matrix → discriminator → question
// =====================================================================

export type ClarifyEngineResult = {
  pair: DifferentialPair | null
  matrix: DifferentialMatrix | null
  discriminator: Discriminator | null
  question: DifferentialQuestion | null
  source: 'known' | 'ai' | 'none'
  reason: string
}

export function runClarifyEngine(
  results: MDRIResult[],
  conflict: ConflictCheckResult,
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
  aiQuestion?: DifferentialQuestion | null,
): ClarifyEngineResult {
  const pair = selectDifferentialPair(results, conflict)
  if (!pair) return { pair: null, matrix: null, discriminator: null, question: null, source: 'none', reason: 'no pair' }

  const matrix = buildDifferentialMatrix(results, pair)

  // 1. Known discriminator (детерминированный, без AI)
  const disc = selectBestDiscriminator(matrix, symptoms, modalities)
  if (disc) {
    const question = discriminatorToQuestion(disc, pair)
    return { pair, matrix, discriminator: disc, question, source: 'known', reason: `known: ${disc.type} — ${disc.description}` }
  }

  // 2. AI discriminator (если нет known)
  if (aiQuestion) {
    return { pair, matrix, discriminator: null, question: aiQuestion, source: 'ai', reason: 'AI generated' }
  }

  return { pair, matrix, discriminator: null, question: null, source: 'none', reason: `no discriminator for ${pairKey(pair.top1.remedy, pair.alt.remedy)}` }
}

// buildClarifyPrompt теперь = buildAIDiscriminatorPrompt (для обратной совместимости)
export const buildClarifyPrompt = buildAIDiscriminatorPrompt
