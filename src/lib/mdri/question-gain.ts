/**
 * QuestionGain v2 — финальная логика выбора 1 уточняющего вопроса.
 *
 * Логика:
 * 1. Проверить KILLER feature (time_night) — если разделяет top-3 → задать
 * 2. Если нет → выбрать лучший BASE по question_gain = impact × coverage × currentGap
 * 3. Если нет подходящего → null (не задавать)
 *
 * NOISE features (desire_salt, anger_type, consolation, sleep_after, sweat_head)
 * полностью игнорируются.
 *
 * НЕ меняет engine/scoring. Только adjust score + re-sort.
 */

import type { MDRIResult, MDRISymptom, MDRIConstellationData } from './types'

// === Типы ===

export type ClarifyOption = {
  label: string
  supports?: string[]
  weakens?: string[]
  boost?: number
  penalty?: number
  neutral?: boolean
}

export type ClarifyQuestion = {
  question: string
  feature: string
  gain: number
  options: ClarifyOption[]
  fallbackComparison: { remedy: string; keyFeature: string }[]
}

// === Дифференциальные оси (проверены на 40 парах) ===

type AxisType = 'KILLER' | 'BASE'

type DiffAxis = {
  name: string
  type: AxisType
  impact: number      // доля top-1 changes (0..1)
  coverage: number    // доля кейсов где применима (0..1)
  question: string    // вопрос на русском
  values: {
    label: string
    supports: string[]
    weakens: string[]
  }[]
}

const AXES: DiffAxis[] = [
  // KILLER
  {
    name: 'time_night', type: 'KILLER', impact: 1.0, coverage: 0.25,
    question: 'В какое время суток жалобы усиливаются больше всего?',
    values: [
      { label: 'После полуночи (0-2 ночи)', supports: ['Ars.','Dros.'], weakens: ['Kali-c.','Lyc.','Nux-v.'] },
      { label: 'Под утро (2-4 ночи)', supports: ['Kali-c.','Nux-v.'], weakens: ['Ars.','Lyc.'] },
      { label: 'Вечером (16-20 часов)', supports: ['Lyc.','Hell.'], weakens: ['Ars.','Kali-c.'] },
    ],
  },
  // BASE — отсортированы по impact × coverage
  {
    name: 'motion', type: 'BASE', impact: 0.53, coverage: 0.38,
    question: 'Как влияет движение на самочувствие?',
    values: [
      { label: 'Хуже от движения, хочется лежать неподвижно', supports: ['Bry.','Bell.','Coloc.','Kali-c.'], weakens: ['Rhus-t.','Sep.','Ars.','Ferr.'] },
      { label: 'Лучше от движения, не может сидеть на месте', supports: ['Rhus-t.','Sep.','Ars.','Ferr.'], weakens: ['Bry.','Bell.','Coloc.'] },
    ],
  },
  {
    name: 'thirst', type: 'BASE', impact: 0.50, coverage: 0.50,
    question: 'Как пациент пьёт воду?',
    values: [
      { label: 'Пьёт много, большими глотками', supports: ['Bry.','Phos.','Nat-m.','Verat.'], weakens: ['Ars.','Puls.','Apis.','Gels.'] },
      { label: 'Пьёт часто, но мелкими глотками', supports: ['Ars.','Lyc.'], weakens: ['Bry.','Phos.','Puls.'] },
      { label: 'Почти не пьёт, жажды нет', supports: ['Puls.','Apis.','Gels.','Ip.'], weakens: ['Bry.','Ars.','Phos.','Nat-m.'] },
    ],
  },
  {
    name: 'side', type: 'BASE', impact: 0.50, coverage: 0.45,
    question: 'Жалобы больше с какой стороны?',
    values: [
      { label: 'Преимущественно слева', supports: ['Lach.','Sep.','Phos.','Arg-n.'], weakens: ['Lyc.','Apis.','Mag-p.','Chel.'] },
      { label: 'Преимущественно справа', supports: ['Lyc.','Apis.','Mag-p.','Chel.','Bell.'], weakens: ['Lach.','Sep.'] },
    ],
  },
  {
    name: 'company', type: 'BASE', impact: 0.39, coverage: 0.57,
    question: 'Когда плохо себя чувствует — хочет быть один или с кем-то?',
    values: [
      { label: 'Хочет побыть один, компания раздражает', supports: ['Nat-m.','Sep.','Nux-v.','Ign.','Gels.'], weakens: ['Puls.','Phos.','Ars.'] },
      { label: 'Ищет поддержку, хочет чтобы кто-то был рядом', supports: ['Puls.','Phos.','Ars.','Stram.'], weakens: ['Nat-m.','Sep.'] },
    ],
  },
  {
    name: 'thermal', type: 'BASE', impact: 0.39, coverage: 0.57,
    question: 'Пациент скорее зябкий или жаркий?',
    values: [
      { label: 'Зябкий, постоянно мёрзнет, любит тепло', supports: ['Ars.','Nux-v.','Calc.','Sil.','Hep.','Psor.','Kali-c.','Bar-c.'], weakens: ['Sulph.','Puls.','Lach.','Apis.','Iod.','Med.'] },
      { label: 'Жаркий, предпочитает прохладу, духота хуже', supports: ['Sulph.','Puls.','Lach.','Apis.','Iod.','Med.','Lyc.'], weakens: ['Ars.','Nux-v.','Calc.','Sil.','Hep.'] },
    ],
  },
  // Новые оси — Фаза 3 аудита
  {
    name: 'consolation', type: 'BASE', impact: 0.60, coverage: 0.35,
    question: 'Как пациент реагирует на утешение, сочувствие?',
    values: [
      { label: 'Хуже от утешения, не хочет чтобы жалели', supports: ['Nat-m.','Sep.','Sil.','Ign.'], weakens: ['Puls.','Phos.','Ars.'] },
      { label: 'Лучше от утешения, ищет сочувствие', supports: ['Puls.','Phos.','Ars.','Stram.'], weakens: ['Nat-m.','Sep.','Sil.'] },
    ],
  },
  {
    name: 'desire_food', type: 'BASE', impact: 0.45, coverage: 0.40,
    question: 'Есть ли выраженные пищевые пристрастия?',
    values: [
      { label: 'Любит солёное', supports: ['Nat-m.','Phos.','Verat.','Arg-n.'], weakens: ['Puls.','Sep.'] },
      { label: 'Любит сладкое', supports: ['Lyc.','Arg-n.','Sulph.','Chin.'], weakens: ['Nat-m.','Calc.'] },
      { label: 'Отвращение к жирному', supports: ['Puls.','Sep.','Nat-m.'], weakens: ['Nux-v.','Calc.'] },
      { label: 'Любит яйца', supports: ['Calc.'], weakens: ['Ferr.'] },
    ],
  },
  {
    name: 'perspiration', type: 'BASE', impact: 0.42, coverage: 0.30,
    question: 'Есть ли особенности потоотделения?',
    values: [
      { label: 'Потеет голова ночью (подушка мокрая)', supports: ['Calc.','Sil.','Merc.'], weakens: ['Sulph.','Bell.'] },
      { label: 'Потеют и пахнут стопы', supports: ['Sil.','Bar-c.','Graph.'], weakens: ['Calc.','Lyc.'] },
      { label: 'Обильный пот, но не облегчает', supports: ['Merc.','Hep.'], weakens: ['Nat-m.','Bry.'] },
      { label: 'Холодный пот', supports: ['Verat.','Carb-v.','Ars.'], weakens: ['Bell.','Sulph.'] },
    ],
  },
  {
    name: 'sleep_position', type: 'BASE', impact: 0.55, coverage: 0.20,
    question: 'В каком положении спит пациент?',
    values: [
      { label: 'На животе', supports: ['Med.','Calc-p.','Stram.'], weakens: ['Ars.','Puls.'] },
      { label: 'На спине, раскинув руки', supports: ['Puls.','Nux-v.'], weakens: ['Med.'] },
      { label: 'В позе эмбриона, на боку', supports: ['Bry.','Calc.'], weakens: ['Med.','Puls.'] },
    ],
  },
  {
    name: 'onset', type: 'BASE', impact: 0.48, coverage: 0.35,
    question: 'Как начались жалобы?',
    values: [
      { label: 'Внезапно, остро', supports: ['Acon.','Bell.','Apis.','Stram.'], weakens: ['Calc.','Sil.','Lyc.'] },
      { label: 'Постепенно, нарастали со временем', supports: ['Calc.','Sil.','Lyc.','Sulph.','Nat-m.'], weakens: ['Acon.','Bell.'] },
      { label: 'После конкретного события (горе, стресс, болезнь)', supports: ['Nat-m.','Ign.','Staph.','Sep.'], weakens: ['Sulph.','Calc.'] },
    ],
  },
]

// === Вспомогательные ===

function normalizeRemedyKey(key: string): string {
  return key.toLowerCase().replace(/\.$/, '')
}

function getConstellationForRemedy(remedy: string, constellations: Record<string, MDRIConstellationData>): MDRIConstellationData | null {
  return constellations[remedy] ?? constellations[normalizeRemedyKey(remedy)] ?? null
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[.,;()\[\]]/g, '').trim()
}

/**
 * Feature уже покрыт существующими симптомами?
 * Если ≥50% слов feature совпадают с любым symptom → true (skip).
 */
function isFeatureCovered(axisName: string, existingSymptoms: MDRISymptom[]): boolean {
  // Маппинг axis → ключевые слова для проверки
  const AXIS_KEYWORDS: Record<string, string[]> = {
    time_night: ['midnight', 'night', '2am', '3am', '4am', 'worse night', 'worse 2', 'worse 3', 'worse 4', 'evening', '4pm', '8pm'],
    motion: ['motion', 'movement', 'rest', 'lying', 'walking', 'stiffness first motion'],
    thirst: ['thirst', 'thirstless', 'drinks', 'sips'],
    side: ['left', 'right', 'side'],
    company: ['company', 'alone', 'solitude', 'desire company', 'aversion company'],
    thermal: ['chilly', 'hot patient', 'cold agg', 'heat agg', 'warm', 'frozen'],
    consolation: ['consolation', 'sympathy', 'pity'],
    desire_food: ['desire salt', 'desire sweets', 'desire sour', 'desire eggs', 'aversion fat', 'desire fat'],
    perspiration: ['perspiration', 'sweat', 'sweating'],
    sleep_position: ['sleep abdomen', 'sleep back', 'sleep position', 'sleep side'],
    onset: ['ailments from', 'sudden', 'acute', 'gradual'],
  }

  const keywords = AXIS_KEYWORDS[axisName] ?? []
  if (keywords.length === 0) return false

  for (const s of existingSymptoms) {
    const rubric = normalizeText(s.rubric)
    if (keywords.some(kw => rubric.includes(kw))) return true
  }
  return false
}

/**
 * Axis разделяет top-3? Значения НЕ одинаковые у всех кандидатов.
 */
function separatesTop3(axis: DiffAxis, top3: MDRIResult[]): boolean {
  // Для каждого remedy из top-3, определить какой value ему подходит
  const assignments = top3.map(r => {
    for (const val of axis.values) {
      if (val.supports.includes(r.remedy)) return val.label
    }
    return 'none'
  })

  // Разделяет если НЕ все одинаковые
  const unique = new Set(assignments)
  return unique.size > 1
}

/**
 * Описание ключевой характеристики remedy для fallback comparison.
 */
function getKeyFeatureDescription(remedy: string, constellations: Record<string, MDRIConstellationData>): string {
  const con = getConstellationForRemedy(remedy, constellations)
  if (!con?.clusters?.length) return remedy

  let bestSym = ''
  let bestWeight = 0
  for (const cluster of con.clusters) {
    for (const sym of cluster.symptoms) {
      const w = sym.weight * (cluster.importance ?? 1)
      if (w > bestWeight) {
        bestWeight = w
        bestSym = sym.rubric
      }
    }
  }
  return bestSym || remedy
}

// === Главная функция ===

export function selectBestClarifyQuestion(
  results: MDRIResult[],
  constellations: Record<string, MDRIConstellationData>,
  existingSymptoms: MDRISymptom[],
  excludeFeatures: string[] = [],
): ClarifyQuestion | null {
  if (results.length < 2) return null

  const top3 = results.slice(0, 3)
  const currentGap = top3[0].totalScore - (top3[1]?.totalScore ?? 0)

  // Не нужен clarify если gap большой (18% — зона реальной конкуренции средств)
  if (currentGap >= 18) return null

  // === Шаг 1: Убрать покрытые features и уже заданные вопросы ===
  const excluded = new Set(excludeFeatures)
  const available = AXES.filter(axis =>
    !isFeatureCovered(axis.name, existingSymptoms) && !excluded.has(axis.name),
  )

  // === Шаг 2: Проверить KILLER ===
  const killers = available.filter(a => a.type === 'KILLER' && separatesTop3(a, top3))
  if (killers.length > 0) {
    const killer = killers[0]
    const question = buildQuestion(killer, top3, constellations, 1.0)
    if (isUsefulQuestion(question, results)) return question
  }

  // === Шаг 3: Выбрать лучший BASE (или любой доступный) ===
  const candidates = available
    .filter(a => separatesTop3(a, top3))
    .map(a => ({
      axis: a,
      questionGain: a.impact * a.coverage * (1 / (currentGap + 1)),
    }))
    .sort((a, b) => b.questionGain - a.questionGain)

  for (const { axis, questionGain } of candidates) {
    const question = buildQuestion(axis, top3, constellations, questionGain)
    if (isUsefulQuestion(question, results)) return question
  }

  // === Шаг 4: Ничего не подходит ===
  return null
}

// === Построение вопроса ===

function buildQuestion(
  axis: DiffAxis,
  top3: MDRIResult[],
  constellations: Record<string, MDRIConstellationData>,
  gain: number,
): ClarifyQuestion {
  const options: ClarifyOption[] = axis.values.map(val => ({
    label: val.label,
    supports: val.supports,
    weakens: val.weakens,
    boost: 15,
    penalty: -10,
  }))

  options.push({ label: 'Не знаю / Не замечал', neutral: true })

  return {
    question: axis.question,
    feature: axis.name,
    gain,
    options,
    fallbackComparison: top3.map(r => ({
      remedy: r.remedy,
      keyFeature: getKeyFeatureDescription(r.remedy, constellations),
    })),
  }
}

// === Проверка полезности ===

function isUsefulQuestion(question: ClarifyQuestion, results: MDRIResult[]): boolean {
  const oldTop1 = results[0].remedy
  const oldGap = results[0].totalScore - (results[1]?.totalScore ?? 0)

  for (const option of question.options) {
    if (option.neutral) continue
    const adjusted = applyClarifyBonus(results, option)
    const newTop1 = adjusted[0].remedy
    const newGap = adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0)

    if (newTop1 !== oldTop1) return true
    if ((newGap - oldGap) >= 5) return true
  }
  return false
}

// === Apply bonus (единственный источник, 20% clamp) ===

export function applyClarifyBonus(
  results: MDRIResult[],
  answer: ClarifyOption,
): MDRIResult[] {
  if (answer.neutral) return results

  const adjusted = results.map(r => {
    const maxBonus = Math.round(r.totalScore * 0.2)
    let bonus = 0
    if (answer.supports?.includes(r.remedy) && answer.boost) bonus += Math.min(answer.boost, maxBonus)
    if (answer.weakens?.includes(r.remedy) && answer.penalty) bonus += Math.max(answer.penalty, -maxBonus)
    return { ...r, totalScore: Math.max(0, r.totalScore + bonus) }
  })

  adjusted.sort((a, b) => b.totalScore - a.totalScore)
  return adjusted
}
