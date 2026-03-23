/**
 * MDRI Product Safety Layer v2
 *
 * Слой ПОВЕРХ engine core. Engine НЕ изменён.
 * 1. Keyword fallback — safety net параллельно Sonnet
 * 2. Merge — keyword побеждает при конфликте на простых паттернах
 * 3. Soft validation — warnings
 * 4. Confidence — реальная уверенность, не формальная
 */

import type { MDRISymptom, MDRIModality, MDRIResult } from './types'

// =====================================================================
// 1. KEYWORD FALLBACK
// Сканирует ОРИГИНАЛЬНЫЙ русский текст.
// Не зависит от Sonnet. Работает по фиксированным паттернам.
// =====================================================================

type KeywordRule = {
  patterns: string[]
  symptom?: { rubric: string; category: 'mental' | 'general' | 'particular'; weight: 1 | 2 | 3 }
  modality?: { pairId: string; value: 'agg' | 'amel' }
  // Уровень уверенности в keyword match: high = "зябкий" точно chilly
  certainty: 'high' | 'medium'
}

const KEYWORD_RULES: KeywordRule[] = [
  // Термика (high certainty — однозначные паттерны)
  { patterns: ['зябк', 'мёрзн', 'мерзн', 'зябкий', 'зябкая', 'постоянно мёрзн'],
    symptom: { rubric: 'chilly', category: 'general', weight: 2 },
    modality: { pairId: 'heat_cold', value: 'amel' },
    certainty: 'high' },
  { patterns: ['жарк', 'жаркий', 'жаркая', 'не переносит тепл', 'тепло хуже', 'жар хуже'],
    symptom: { rubric: 'hot patient', category: 'general', weight: 2 },
    modality: { pairId: 'heat_cold', value: 'agg' },
    certainty: 'high' },

  // Жажда (high — чёткие конструкции)
  { patterns: ['нет жажды', 'без жажды', 'не хочет пить', 'пить не хочет'],
    symptom: { rubric: 'thirstless', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['жажда сильн', 'пьёт много', 'жажда больш', 'много пьёт'],
    symptom: { rubric: 'thirst large quantities', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['мелкими глотк', 'глотками часто', 'часто понемногу', 'пьёт по глотку'],
    symptom: { rubric: 'thirst small sips frequently', category: 'general', weight: 2 },
    certainty: 'high' },

  // Consolation (high — специфичные конструкции)
  { patterns: ['утешение хуже', 'не хочет утешен', 'не переносит утешен', 'утешение раздраж'],
    symptom: { rubric: 'consolation aggravates', category: 'mental', weight: 3 },
    modality: { pairId: 'consolation', value: 'agg' },
    certainty: 'high' },
  { patterns: ['утешение помогает', 'утешение лучше', 'хочет чтоб жалели', 'жалеть лучше'],
    symptom: { rubric: 'consolation ameliorates', category: 'mental', weight: 2 },
    modality: { pairId: 'consolation', value: 'amel' },
    certainty: 'high' },

  // Движение (high)
  { patterns: ['движение хуже', 'хуже от движен', 'покой лучше', 'лежит не шевелясь'],
    modality: { pairId: 'motion_rest', value: 'agg' },
    certainty: 'high' },
  { patterns: ['движение лучше', 'лучше от движен', 'не может сидеть на месте', 'расхаживает'],
    modality: { pairId: 'motion_rest', value: 'amel' },
    certainty: 'high' },

  // Mental (medium — могут быть контекстно-зависимы)
  { patterns: ['плач', 'рыдает', 'слёзы легко', 'плаксив'],
    symptom: { rubric: 'weeping easily', category: 'mental', weight: 2 },
    certainty: 'medium' },
  { patterns: ['раздражител', 'нетерпелив', 'вспыльчив'],
    symptom: { rubric: 'irritability', category: 'mental', weight: 2 },
    certainty: 'medium' },
  { patterns: ['тревог', 'тревожн'],
    symptom: { rubric: 'anxiety', category: 'mental', weight: 2 },
    certainty: 'medium' },
  { patterns: ['страх смерт', 'боится умер'],
    symptom: { rubric: 'fear death', category: 'mental', weight: 3 },
    certainty: 'high' },
  { patterns: ['страх темнот', 'боится темнот'],
    symptom: { rubric: 'fear dark', category: 'mental', weight: 2 },
    certainty: 'high' },
  { patterns: ['страх одиноч', 'боится остаться одн'],
    symptom: { rubric: 'fear alone', category: 'mental', weight: 2 },
    certainty: 'high' },
  { patterns: ['ревнив', 'ревность'],
    symptom: { rubric: 'jealousy suspicious', category: 'mental', weight: 2 },
    certainty: 'high' },
  { patterns: ['безразличи', 'апати', 'ничего не интерес', 'всё равно'],
    symptom: { rubric: 'indifference', category: 'mental', weight: 2 },
    certainty: 'medium' },
  { patterns: ['горе давн', 'потеря близ', 'утрата', 'не может пережить'],
    symptom: { rubric: 'grief', category: 'mental', weight: 2 },
    certainty: 'medium' },

  // General (high — однозначные)
  { patterns: ['хуже ночью', 'ночью хуже', 'ночью усилен'],
    symptom: { rubric: 'worse night', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['хуже утром', 'утром хуже'],
    symptom: { rubric: 'worse morning', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['хуже после сна', 'после сна хуже', 'просыпается хуже'],
    symptom: { rubric: 'worse after sleep', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['любит солён', 'тянет на солён', 'солёное любит'],
    symptom: { rubric: 'desire salt', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['любит сладк', 'тянет на сладк', 'сладкое любит'],
    symptom: { rubric: 'desire sweets', category: 'general', weight: 1 },
    certainty: 'high' },
  { patterns: ['хуже на солнце', 'солнце хуже', 'не переносит солнц'],
    symptom: { rubric: 'worse sun', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['на море лучше', 'у моря лучше', 'морской воздух лучше'],
    symptom: { rubric: 'better at sea seashore', category: 'general', weight: 3 },
    certainty: 'high' },
  { patterns: ['потеет голова', 'голова потеет', 'подушка мокрая'],
    symptom: { rubric: 'perspiration head night', category: 'particular', weight: 3 },
    certainty: 'high' },
]

export type FallbackResult = {
  addedSymptoms: MDRISymptom[]
  addedModalities: MDRIModality[]
  conflicts: string[]
}

export function keywordFallback(
  originalText: string,
  sonnetSymptoms: MDRISymptom[],
  sonnetModalities: MDRIModality[],
): FallbackResult {
  const text = originalText.toLowerCase()
  const added: { symptoms: MDRISymptom[]; modalities: MDRIModality[] } = { symptoms: [], modalities: [] }
  const conflicts: string[] = []

  for (const rule of KEYWORD_RULES) {
    const matched = rule.patterns.some(p => text.includes(p))
    if (!matched) continue

    // Симптом: добавить если Sonnet не нашёл
    if (rule.symptom) {
      const rubricFirst = rule.symptom.rubric.split(' ')[0]
      const alreadyHas = sonnetSymptoms.some(s =>
        s.rubric.toLowerCase().includes(rubricFirst) ||
        rubricFirst.includes(s.rubric.toLowerCase().split(' ')[0])
      )
      if (!alreadyHas) {
        added.symptoms.push({ ...rule.symptom, present: true })
      }
    }

    // Модальность: при конфликте — НЕ выбираем сторону, помечаем uncertainty
    if (rule.modality) {
      const existing = sonnetModalities.find(m => m.pairId === rule.modality!.pairId)
      if (!existing) {
        added.modalities.push(rule.modality)
      } else if (existing.value !== rule.modality.value) {
        // Конфликт: НЕ перезаписываем. Оставляем Sonnet, помечаем конфликт.
        // Confidence layer снизит уверенность. UI покажет предупреждение.
        conflicts.push(`${rule.modality.pairId}: текст→${rule.modality.value}, AI→${existing.value}`)
      }
    }
  }

  return { addedSymptoms: added.symptoms, addedModalities: added.modalities, conflicts }
}

// =====================================================================
// 2. MERGE
// =====================================================================

export function mergeWithFallback(
  originalText: string,
  sonnetSymptoms: MDRISymptom[],
  sonnetModalities: MDRIModality[],
): {
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  warnings: ValidationWarning[]
  conflicts: string[]
} {
  // keywordFallback мутирует sonnetModalities при high-certainty конфликте
  const fallback = keywordFallback(originalText, sonnetSymptoms, sonnetModalities)

  const symptoms = [...sonnetSymptoms, ...fallback.addedSymptoms]
  const modalities = [...sonnetModalities, ...fallback.addedModalities]
  const warnings = validateInput(symptoms, modalities)

  if (fallback.conflicts.length > 0) {
    warnings.push({
      type: 'uncertain_parse',
      message: 'Проверьте модальности — обнаружена неточность распознавания',
      hint: fallback.conflicts.map(c => c.split(':')[0]).join(', '),
    })
  }

  return { symptoms, modalities, warnings, conflicts: fallback.conflicts }
}

// =====================================================================
// 3. SOFT VALIDATION
// =====================================================================

export type ValidationWarning = {
  type: 'few_symptoms' | 'no_modalities' | 'no_mental' | 'no_general' | 'uncertain_parse' | 'only_particulars'
  message: string
  hint: string
}

export function validateInput(
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const present = symptoms.filter(s => s.present)

  if (present.length < 3) {
    warnings.push({
      type: 'few_symptoms',
      message: 'Мало симптомов для точного анализа',
      hint: 'Опишите подробнее: что беспокоит, когда хуже/лучше, эмоциональное состояние',
    })
  }

  if (modalities.length === 0) {
    warnings.push({
      type: 'no_modalities',
      message: 'Не указаны модальности',
      hint: 'Добавьте: от чего хуже (тепло, холод, движение) и от чего лучше',
    })
  }

  const hasMental = present.some(s => s.category === 'mental')
  const hasGeneral = present.some(s => s.category === 'general')
  const hasParticular = present.some(s => s.category === 'particular')

  if (!hasMental && present.length >= 3) {
    warnings.push({
      type: 'no_mental',
      message: 'Нет психических симптомов',
      hint: 'Опишите: настроение, страхи, реакция на утешение, раздражительность',
    })
  }

  if (!hasGeneral && present.length >= 3) {
    warnings.push({
      type: 'no_general',
      message: 'Нет общих симптомов',
      hint: 'Укажите: зябкость/жар, жажда, аппетит, сон, потливость',
    })
  }

  if (hasParticular && !hasMental && !hasGeneral) {
    warnings.push({
      type: 'only_particulars',
      message: 'Только частные симптомы — точность снижена',
      hint: 'Добавьте хотя бы 1 общий и 1 психический симптом',
    })
  }

  return warnings
}

// =====================================================================
// 4. CONFIDENCE LAYER
//
// Реальная уверенность, не формальная.
// Проверяет наличие CHARACTERISTIC симптомов,
// а не просто количество.
// Warnings ВЛИЯЮТ на confidence.
// =====================================================================

export type ConfidenceLevel = 'high' | 'good' | 'clarify' | 'insufficient'

export type ConfidenceResult = {
  level: ConfidenceLevel
  label: string
  color: 'green' | 'blue' | 'yellow' | 'gray'
  showDiff: boolean
  showAsEqual: boolean
}

export function computeConfidence(
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
  results: MDRIResult[],
  warnings: ValidationWarning[],
): ConfidenceResult {
  const present = symptoms.filter(s => s.present)
  const hasMental = present.some(s => s.category === 'mental')
  const hasGeneral = present.some(s => s.category === 'general')
  const hasModalities = modalities.length > 0

  // Сила characteristic: 0 = нет, 1 = слабый, 2 = сильный
  // 0: только банальные particular (головная боль, кашель)
  // 1: есть modalities ИЛИ mental weight=1 ИЛИ general weight>=2
  // 2: есть mental weight>=2 ИЛИ peculiar weight=3 ИЛИ modalities + mental
  let charStrength = 0
  const hasMentalW2 = present.some(s => s.category === 'mental' && s.weight >= 2)
  const hasPeculiar = present.some(s => s.weight >= 3)
  const hasAnyMental = present.some(s => s.category === 'mental')
  if (hasMentalW2 || hasPeculiar) charStrength = 2
  else if (hasModalities || hasAnyMental || hasGeneral) charStrength = 1

  const top1 = results[0]?.totalScore ?? 0
  const top2 = results[1]?.totalScore ?? 0
  const gap = top1 - top2

  const warningPenalty = warnings.length
  const hasConflict = warnings.some(w => w.type === 'uncertain_parse')
  // Количество категорий покрытых: mental + general + particular + modalities
  const categoryCoverage = [hasMental, hasGeneral, present.some(s => s.category === 'particular'), hasModalities].filter(Boolean).length

  // === INSUFFICIENT ===
  if (present.length < 3 || (!hasMental && !hasGeneral) || results.length === 0) {
    return { level: 'insufficient', label: 'Недостаточно данных', color: 'gray', showDiff: false, showAsEqual: false }
  }

  // === CLARIFY (showAsEqual) ===
  // Фактический tie ИЛИ конфликт парсинга при близких scores
  if (gap < 3 || (hasConflict && gap < 10)) {
    return { level: 'clarify', label: 'Требует уточнения', color: 'yellow', showDiff: true, showAsEqual: true }
  }

  // === CLARIFY ===
  // Gap маленький ИЛИ нет characteristic (charStrength=0) ИЛИ слишком много warnings
  if (gap < 10 || charStrength === 0 || warningPenalty >= 3) {
    return { level: 'clarify', label: 'Уточните для точности', color: 'yellow', showDiff: true, showAsEqual: false }
  }

  // === КОНФЛИКТ ПАРСИНГА → потолок GOOD ===
  // При конфликте Sonnet vs keyword модальности не можем быть уверены.
  // HIGH невозможен. Максимум GOOD.
  if (hasConflict) {
    return { level: 'good', label: 'Хорошее совпадение', color: 'blue', showDiff: true, showAsEqual: false }
  }

  // === CONFLICT CHECK (ДО HIGH — может понизить любой уровень) ===
  const conflict = checkHypothesisConflict(results)

  // Hard contradiction → CLARIFY (независимо от gap/charStrength)
  if (conflict.level === 'hard') {
    return { level: 'clarify', label: 'Есть противоречия — уточните', color: 'yellow', showDiff: true, showAsEqual: false }
  }

  // Differential → max GOOD (HIGH невозможен при наличии сильных альтернатив)
  if (conflict.level === 'differential') {
    return { level: 'good', label: 'Требует проверки альтернатив', color: 'blue', showDiff: true, showAsEqual: false }
  }

  // === HIGH ===
  // Все условия одновременно:
  // 1) gap >= 15%
  // 2) strong characteristic (charStrength=2)
  // 3) modalities есть
  // 4) >=3 категории покрыты
  // 5) <=1 warning
  // 6) нет конфликтов (проверено выше)
  if (gap >= 15 && charStrength >= 2 && hasModalities && categoryCoverage >= 3 && warningPenalty <= 1) {
    return { level: 'high', label: 'Высокая уверенность', color: 'green', showDiff: false, showAsEqual: false }
  }

  // === GOOD ===
  return { level: 'good', label: 'Хорошее совпадение', color: 'blue', showDiff: gap < 12 || charStrength < 2, showAsEqual: false }
}

// =====================================================================
// 5. CONFLICT CHECK — опровержение гипотезы
//
// После выбора top-1 проверяем: есть ли у альтернатив
// преимущества, которые top-1 НЕ имеет?
// Если да — confidence понижается, clarifying questions
// должны различать препараты, а не подтверждать один.
// =====================================================================

// Уровень конфликта
export type ConflictLevel = 'hard' | 'differential' | 'none'

export type ConflictCheckResult = {
  level: ConflictLevel
  hasConflict: boolean
  reason?: string
  // Какие линзы у альтернативы сильнее
  altAdvantages: { remedy: string; lens: string; altScore: number; topScore: number }[]
  // Explainable: что поддерживает top-1, что поддерживает альтернативу
  topStrengths: string[]
  altStrengths: { remedy: string; strengths: string[] }[]
  // Differential signals: ключевые линзы различения
  differentialLenses: string[]
}

const LENS_RU: Record<string, string> = {
  Kent: 'реперторий', Constellation: 'характерный паттерн',
  Hierarchy: 'иерархия', Polarity: 'модальности',
  Negative: 'исключения', Coverage: 'покрытие',
}

export function checkHypothesisConflict(results: MDRIResult[]): ConflictCheckResult {
  const empty: ConflictCheckResult = {
    level: 'none', hasConflict: false, altAdvantages: [],
    topStrengths: [], altStrengths: [], differentialLenses: [],
  }
  if (results.length < 2) return empty

  const top = results[0]
  const altAdvantages: ConflictCheckResult['altAdvantages'] = []
  const topStrengths: string[] = []
  const altStrengths: ConflictCheckResult['altStrengths'] = []
  const differentialLenses: string[] = []

  // === Собираем сильные стороны top-1 ===
  for (const lens of top.lenses) {
    if (lens.score >= 60) topStrengths.push(`${LENS_RU[lens.name] ?? lens.name}: сильное соответствие`)
    else if (lens.score >= 40) topStrengths.push(`${LENS_RU[lens.name] ?? lens.name}: среднее соответствие`)
  }

  // === Проверяем top 2-3 альтернативы ===
  for (const alt of results.slice(1, 4)) {
    const strengths: string[] = []

    for (const altLens of alt.lenses) {
      const topLens = top.lenses.find(l => l.name === altLens.name)
      if (!topLens) continue

      const gap = altLens.score - topLens.score

      // Альтернатива СИЛЬНЕЕ по этой линзе
      if (gap >= 15) {
        altAdvantages.push({
          remedy: alt.remedy, lens: altLens.name,
          altScore: altLens.score, topScore: topLens.score,
        })
        strengths.push(`${LENS_RU[altLens.name] ?? altLens.name}: превосходит`)
      }

      // Significant difference в любую сторону → differential lens
      if (Math.abs(gap) >= 20 && !differentialLenses.includes(altLens.name)) {
        differentialLenses.push(altLens.name)
      }
    }

    if (strengths.length > 0) {
      altStrengths.push({ remedy: alt.remedy, strengths })
    }
  }

  // === HARD CONTRADICTION ===
  // Альтернатива имеет сильный constellation (≥50%) при top-1 constellation слабый (<20%)
  // ИЛИ top-1 имеет Negative score < 30% (есть противоречащие данные)
  const topCs = top.lenses.find(l => l.name === 'Constellation')?.score ?? 0
  const topNeg = top.lenses.find(l => l.name === 'Negative')?.score ?? 100

  const hardContradiction = altAdvantages.some(a =>
    a.lens === 'Constellation' && a.altScore >= 50 && topCs < 20
  ) || topNeg < 30

  if (hardContradiction) {
    const csConflict = altAdvantages.find(a => a.lens === 'Constellation' && a.altScore >= 50)
    return {
      level: 'hard',
      hasConflict: true,
      reason: topNeg < 30
        ? `у ${top.remedy} выявлены противоречащие клинические данные`
        : `${csConflict!.remedy} значительно превосходит по характерному паттерну`,
      altAdvantages, topStrengths, altStrengths, differentialLenses,
    }
  }

  // === DIFFERENTIAL ===
  // Альтернатива имеет ≥2 линзы сильнее top-1 на ≥15 пунктов
  // ИЛИ constellation альтернативы ≥40% при top-1 <30%
  const remedyAdvCount = new Map<string, number>()
  for (const a of altAdvantages) {
    remedyAdvCount.set(a.remedy, (remedyAdvCount.get(a.remedy) ?? 0) + 1)
  }
  const multiLens = [...remedyAdvCount.values()].some(count => count >= 2)
  const csDifferential = altAdvantages.some(a =>
    a.lens === 'Constellation' && a.altScore >= 40 && topCs < 30
  )

  if (multiLens || csDifferential) {
    return {
      level: 'differential',
      hasConflict: true,
      reason: 'альтернатива имеет значимые преимущества по нескольким параметрам',
      altAdvantages, topStrengths, altStrengths, differentialLenses,
    }
  }

  // === NONE ===
  return {
    level: 'none', hasConflict: false,
    altAdvantages, topStrengths, altStrengths, differentialLenses,
  }
}
