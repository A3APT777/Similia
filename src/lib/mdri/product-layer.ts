/**
 * MDRI Product Safety Layer
 *
 * Отдельный слой ПОВЕРХ engine core (не меняет scoring/ranking/matching).
 * Три задачи:
 * 1. Confidence — независимая оценка уверенности (не равна score)
 * 2. Soft validation — предупреждения о неполноте данных
 * 3. Keyword fallback — safety net из исходного русского текста
 */

import type { MDRISymptom, MDRIModality, MDRIResult } from './types'

// =====================================================================
// 1. CONFIDENCE LAYER
//
// Score = "насколько хорошо совпадает".
// Confidence = "насколько мы можем доверять этому score".
//
// Высокий score при 2 симптомах = ложная уверенность.
// Низкий score при 8 симптомах с модальностями = надёжный результат.
// =====================================================================

export type ConfidenceLevel = 'high' | 'good' | 'clarify' | 'insufficient'

export type ConfidenceResult = {
  level: ConfidenceLevel
  label: string                    // "Высокая уверенность" и т.д.
  color: 'green' | 'blue' | 'yellow' | 'gray'
  showDiff: boolean                // Показывать quick diff?
  showAsEqual: boolean             // Показывать top-1 и top-2 как равных?
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
  const symptomCount = present.length

  const top1 = results[0]?.totalScore ?? 0
  const top2 = results[1]?.totalScore ?? 0
  const gap = top1 - top2

  const hasUncertainParse = warnings.some(w => w.type === 'uncertain_parse')

  // Подсчёт "полноты" ввода: 0..5
  let inputQuality = 0
  if (symptomCount >= 3) inputQuality++
  if (symptomCount >= 5) inputQuality++
  if (hasMental) inputQuality++
  if (hasGeneral) inputQuality++
  if (hasModalities) inputQuality++

  // === Правила ===

  // Недостаточно данных: <3 симптомов ИЛИ только 1 категория
  if (symptomCount < 3 || inputQuality <= 1) {
    return {
      level: 'insufficient',
      label: 'Недостаточно данных',
      color: 'gray',
      showDiff: false,
      showAsEqual: false,
    }
  }

  // Неопределённо: gap < 3% ИЛИ uncertain parse + gap < 10%
  if (gap < 3 || (hasUncertainParse && gap < 10)) {
    return {
      level: 'clarify',
      label: 'Требует уточнения',
      color: 'yellow',
      showDiff: true,
      showAsEqual: true, // Не выделять top-1 как "ответ"
    }
  }

  // Требует уточнения: gap < 10% ИЛИ inputQuality < 3
  if (gap < 10 || inputQuality < 3) {
    return {
      level: 'clarify',
      label: 'Уточните для точности',
      color: 'yellow',
      showDiff: true,
      showAsEqual: false,
    }
  }

  // Высокая: gap >= 15% И inputQuality >= 4 И нет uncertain
  if (gap >= 15 && inputQuality >= 4 && !hasUncertainParse) {
    return {
      level: 'high',
      label: 'Высокая уверенность',
      color: 'green',
      showDiff: false,
      showAsEqual: false,
    }
  }

  // По умолчанию: хорошее совпадение
  return {
    level: 'good',
    label: 'Хорошее совпадение',
    color: 'blue',
    showDiff: gap < 12,
    showAsEqual: false,
  }
}

// =====================================================================
// 2. SOFT VALIDATION
//
// Предупреждения после парсинга, до показа результатов.
// НЕ блокируют анализ. Показываются inline.
// =====================================================================

export type ValidationWarning = {
  type: 'few_symptoms' | 'no_modalities' | 'no_mental' | 'no_general' | 'uncertain_parse' | 'only_particulars'
  message: string    // На русском, для UI
  hint: string       // Подсказка что добавить
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
// 3. KEYWORD FALLBACK
//
// Сканируем ОРИГИНАЛЬНЫЙ русский текст врача на ключевые паттерны.
// Если Sonnet пропустил модальность/симптом — добавляем.
// Если конфликт с Sonnet — помечаем uncertain.
// =====================================================================

type KeywordRule = {
  // Один или несколько паттернов (хотя бы один должен совпасть)
  patterns: string[]
  // Что добавить если нашли
  symptom?: { rubric: string; category: 'mental' | 'general' | 'particular'; weight: 1 | 2 | 3 }
  modality?: { pairId: string; value: 'agg' | 'amel' }
}

const KEYWORD_RULES: KeywordRule[] = [
  // Термика
  { patterns: ['зябк', 'мёрзн', 'мерзн', 'холод хуже', 'зябкий', 'зябкая'],
    symptom: { rubric: 'chilly', category: 'general', weight: 2 },
    modality: { pairId: 'heat_cold', value: 'amel' } },
  { patterns: ['жарк', 'жаркий', 'жаркая', 'не переносит тепл', 'тепло хуже'],
    symptom: { rubric: 'hot patient', category: 'general', weight: 2 },
    modality: { pairId: 'heat_cold', value: 'agg' } },

  // Жажда
  { patterns: ['нет жажды', 'без жажды', 'пьёт мало', 'не хочет пить'],
    symptom: { rubric: 'thirstless', category: 'general', weight: 2 } },
  { patterns: ['жажда сильн', 'пьёт много', 'жажда больш'],
    symptom: { rubric: 'thirst large quantities', category: 'general', weight: 2 } },
  { patterns: ['пьёт мелкими глотк', 'глотками', 'часто понемногу'],
    symptom: { rubric: 'thirst small sips frequently', category: 'general', weight: 2 } },

  // Consolation
  { patterns: ['утешение хуже', 'не хочет утешен', 'не переносит утешен', 'утешение раздраж'],
    symptom: { rubric: 'consolation aggravates', category: 'mental', weight: 3 },
    modality: { pairId: 'consolation', value: 'agg' } },
  { patterns: ['утешение помогает', 'утешение лучше', 'хочет чтоб жалели'],
    symptom: { rubric: 'consolation ameliorates', category: 'mental', weight: 2 },
    modality: { pairId: 'consolation', value: 'amel' } },

  // Движение
  { patterns: ['движение хуже', 'хуже от движен', 'покой лучше', 'лежит не шевелясь'],
    modality: { pairId: 'motion_rest', value: 'agg' } },
  { patterns: ['движение лучше', 'лучше от движен', 'не может сидеть', 'расхаживает'],
    modality: { pairId: 'motion_rest', value: 'amel' } },

  // Mental ключевые
  { patterns: ['плач', 'рыдает', 'слёзы', 'плаксив'],
    symptom: { rubric: 'weeping easily', category: 'mental', weight: 2 } },
  { patterns: ['раздражител', 'нетерпелив', 'злится', 'вспыльчив'],
    symptom: { rubric: 'irritability', category: 'mental', weight: 2 } },
  { patterns: ['тревог', 'тревожн', 'беспокой', 'волнует'],
    symptom: { rubric: 'anxiety', category: 'mental', weight: 2 } },
  { patterns: ['страх смерт', 'боится умер'],
    symptom: { rubric: 'fear death', category: 'mental', weight: 3 } },
  { patterns: ['страх темнот', 'боится темнот'],
    symptom: { rubric: 'fear dark', category: 'mental', weight: 2 } },
  { patterns: ['страх одиноч', 'боится остаться одн'],
    symptom: { rubric: 'fear alone', category: 'mental', weight: 2 } },
  { patterns: ['ревнив', 'ревность', 'подозритель'],
    symptom: { rubric: 'jealousy suspicious', category: 'mental', weight: 2 } },
  { patterns: ['безразличи', 'апати', 'ничего не интерес'],
    symptom: { rubric: 'indifference', category: 'mental', weight: 2 } },
  { patterns: ['горе', 'потеря близ', 'утрата'],
    symptom: { rubric: 'grief', category: 'mental', weight: 2 } },

  // General ключевые
  { patterns: ['хуже ночью', 'ночью хуже', 'усиление ночью'],
    symptom: { rubric: 'worse night', category: 'general', weight: 2 } },
  { patterns: ['хуже утром', 'утром хуже', 'утром усилен'],
    symptom: { rubric: 'worse morning', category: 'general', weight: 2 } },
  { patterns: ['хуже после сна', 'после сна хуже', 'просыпается хуже'],
    symptom: { rubric: 'worse after sleep', category: 'general', weight: 2 } },
  { patterns: ['солён', 'любит солён', 'тянет на солён'],
    symptom: { rubric: 'desire salt', category: 'general', weight: 2 } },
  { patterns: ['сладк', 'любит сладк', 'тянет на сладк'],
    symptom: { rubric: 'desire sweets', category: 'general', weight: 1 } },
  { patterns: ['хуже на солнце', 'солнце хуже', 'не переносит солнц'],
    symptom: { rubric: 'worse sun', category: 'general', weight: 2 } },
  { patterns: ['на море лучше', 'у моря лучше', 'морской воздух'],
    symptom: { rubric: 'better at sea seashore', category: 'general', weight: 3 } },
  { patterns: ['потеет голова', 'голова потеет', 'подушка мокрая'],
    symptom: { rubric: 'perspiration head night', category: 'particular', weight: 3 } },
]

export type FallbackResult = {
  addedSymptoms: MDRISymptom[]       // Симптомы которые Sonnet пропустил
  addedModalities: MDRIModality[]    // Модальности которые Sonnet пропустил
  conflicts: string[]                // Конфликты Sonnet vs keyword
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
    // Проверяем совпадение хотя бы одного паттерна
    const matched = rule.patterns.some(p => text.includes(p))
    if (!matched) continue

    // Проверяем: Sonnet уже нашёл этот симптом?
    if (rule.symptom) {
      const alreadyHas = sonnetSymptoms.some(s =>
        s.rubric.toLowerCase().includes(rule.symptom!.rubric.split(' ')[0]) ||
        rule.symptom!.rubric.toLowerCase().includes(s.rubric.split(' ')[0])
      )
      if (!alreadyHas) {
        added.symptoms.push({ ...rule.symptom, present: true })
      }
    }

    // Проверяем модальность
    if (rule.modality) {
      const existingMod = sonnetModalities.find(m => m.pairId === rule.modality!.pairId)
      if (!existingMod) {
        added.modalities.push(rule.modality)
      } else if (existingMod.value !== rule.modality.value) {
        // Конфликт: Sonnet сказал agg, keyword сказал amel
        conflicts.push(`${rule.modality.pairId}: текст="${rule.patterns[0]}" → ${rule.modality.value}, Sonnet → ${existingMod.value}`)
      }
    }
  }

  return {
    addedSymptoms: added.symptoms,
    addedModalities: added.modalities,
    conflicts,
  }
}

/**
 * Merge Sonnet results с keyword fallback.
 * Возвращает merged symptoms/modalities + warnings если были конфликты.
 */
export function mergeWithFallback(
  originalText: string,
  sonnetSymptoms: MDRISymptom[],
  sonnetModalities: MDRIModality[],
): {
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  warnings: ValidationWarning[]
} {
  const fallback = keywordFallback(originalText, sonnetSymptoms, sonnetModalities)

  const mergedSymptoms = [...sonnetSymptoms, ...fallback.addedSymptoms]
  const mergedModalities = [...sonnetModalities, ...fallback.addedModalities]
  const warnings = validateInput(mergedSymptoms, mergedModalities)

  // Добавить warning если были конфликты
  if (fallback.conflicts.length > 0) {
    warnings.push({
      type: 'uncertain_parse',
      message: 'Возможна неточность в распознавании модальностей',
      hint: 'Проверьте: ' + fallback.conflicts.map(c => c.split(':')[0]).join(', '),
    })
  }

  return { symptoms: mergedSymptoms, modalities: mergedModalities, warnings }
}
