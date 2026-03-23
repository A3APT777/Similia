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

    // Модальность: при конфликте — keyword с high certainty побеждает
    if (rule.modality) {
      const existing = sonnetModalities.find(m => m.pairId === rule.modality!.pairId)
      if (!existing) {
        added.modalities.push(rule.modality)
      } else if (existing.value !== rule.modality.value) {
        conflicts.push(`${rule.modality.pairId}: текст→${rule.modality.value}, AI→${existing.value}`)
        if (rule.certainty === 'high') {
          // Keyword побеждает: заменяем Sonnet модальность
          existing.value = rule.modality.value
        }
        // certainty=medium: оставляем Sonnet, только warning
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

  // Есть ли CHARACTERISTIC симптомы? (не просто "головная боль")
  // weight >= 2 на mental, или любая модальность, или weight=3 peculiar
  const hasCharacteristic = present.some(s =>
    (s.category === 'mental' && s.weight >= 2) ||
    s.weight >= 3
  ) || hasModalities

  const top1 = results[0]?.totalScore ?? 0
  const top2 = results[1]?.totalScore ?? 0
  const gap = top1 - top2

  // Warnings как penalty: каждый warning снижает "потолок" confidence
  const warningPenalty = warnings.length // 0..5+
  const hasConflict = warnings.some(w => w.type === 'uncertain_parse')

  // === INSUFFICIENT ===
  // <3 симптомов ИЛИ нет ни mental ни general ИЛИ нет результатов
  if (present.length < 3 || (!hasMental && !hasGeneral) || results.length === 0) {
    return { level: 'insufficient', label: 'Недостаточно данных', color: 'gray', showDiff: false, showAsEqual: false }
  }

  // === CLARIFY (showAsEqual) ===
  // Gap < 3% — фактический tie
  // ИЛИ конфликт парсинга + gap < 10%
  if (gap < 3 || (hasConflict && gap < 10)) {
    return { level: 'clarify', label: 'Требует уточнения', color: 'yellow', showDiff: true, showAsEqual: true }
  }

  // === CLARIFY ===
  // Gap < 10%
  // ИЛИ нет characteristic симптомов (всё банально)
  // ИЛИ 3+ warnings
  if (gap < 10 || !hasCharacteristic || warningPenalty >= 3) {
    return { level: 'clarify', label: 'Уточните для точности', color: 'yellow', showDiff: true, showAsEqual: false }
  }

  // === HIGH ===
  // Gap >= 15% И есть characteristic И modalities И mental И general
  // И не больше 1 warning И нет конфликтов
  if (gap >= 15 && hasCharacteristic && hasModalities && hasMental && hasGeneral && warningPenalty <= 1 && !hasConflict) {
    return { level: 'high', label: 'Высокая уверенность', color: 'green', showDiff: false, showAsEqual: false }
  }

  // === GOOD (default) ===
  return { level: 'good', label: 'Хорошее совпадение', color: 'blue', showDiff: gap < 12, showAsEqual: false }
}
