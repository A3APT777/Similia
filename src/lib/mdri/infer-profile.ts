/**
 * Автоматическое определение профиля пациента из текста и симптомов.
 * Заменяет ручной выбор (acute/chronic, vitality, sensitivity, age).
 * НЕ меняет engine — только формирует вход для selectPotency().
 */

import type { MDRIPatientProfile, MDRISymptom } from './types'

type InferredValue<T> = {
  value: T
  confidence: number // 0..1
}

export type InferredProfile = {
  caseType: InferredValue<'acute' | 'chronic'>
  vitality: InferredValue<'high' | 'medium' | 'low'>
  sensitivity: InferredValue<'high' | 'medium' | 'low'>
  age: InferredValue<'child' | 'adult' | 'elderly'>
}

// Маркеры острого случая (внезапное начало, травма, инфекция)
const ACUTE_MARKERS = [
  'внезапн', 'резк', 'остр', 'вчера', 'сегодня', 'час назад', 'утром',
  'травм', 'удар', 'падени', 'ожог', 'укус',
  'температур', 'лихорадк', 'озноб', 'жар',
  'отравлени', 'рвот', 'понос', 'диаре',
  'приступ', 'криз', 'колик',
  'sudden', 'acute', 'fever', 'injury', 'trauma',
]

// Маркеры хронического случая
const CHRONIC_MARKERS = [
  'давно', 'годами', 'месяц', 'лет', 'хронич', 'постоянн', 'рецидив',
  'с детства', 'всегда', 'периодическ', 'регулярн',
  'конституц', 'миазм', 'наследствен',
  'chronic', 'years', 'months', 'recurrent',
]

// Маркеры возраста
const CHILD_MARKERS = ['ребён', 'ребен', 'малыш', 'младен', 'грудн', 'новорожд', 'мес', 'child', 'infant', 'baby']
const ELDERLY_MARKERS = ['пожил', 'старч', 'старик', 'бабушк', 'дедушк', 'elderly', '70 лет', '80 лет', '75 лет', '85 лет']

// Маркеры высокой чувствительности
const HIGH_SENSITIVITY_MARKERS = [
  'чувствительн', 'тонк', 'ранимы', 'впечатлительн',
  'реагирует на всё', 'непереносим', 'аллерги',
  'sensitive', 'allergic', 'intolerant',
]

// Маркеры низкой витальности
const LOW_VITALITY_MARKERS = [
  'слаб', 'истощ', 'утомля', 'уставш', 'обессилен',
  'вял', 'апати', 'анеми',
  'exhausted', 'weak', 'depleted',
]

const HIGH_VITALITY_MARKERS = [
  'сильн', 'энергичн', 'активн', 'крепк', 'здоров',
  'robust', 'strong', 'vigorous',
]

function countMarkers(text: string, markers: string[]): number {
  const lower = text.toLowerCase()
  return markers.filter(m => lower.includes(m)).length
}

/**
 * Определяет профиль пациента из текста врача и распознанных симптомов.
 * Возвращает InferredProfile с confidence для каждого параметра.
 */
export function inferPatientProfile(
  rawText: string,
  symptoms: MDRISymptom[] = [],
): InferredProfile {
  const text = rawText.toLowerCase()

  // --- Case type ---
  const acuteHits = countMarkers(text, ACUTE_MARKERS)
  const chronicHits = countMarkers(text, CHRONIC_MARKERS)
  const totalHits = acuteHits + chronicHits

  let caseType: InferredValue<'acute' | 'chronic'>
  if (totalHits === 0) {
    // Нет маркеров — смотрим на количество симптомов: много = скорее хронический
    caseType = { value: symptoms.length >= 5 ? 'chronic' : 'chronic', confidence: 0.3 }
  } else if (acuteHits > chronicHits) {
    caseType = { value: 'acute', confidence: Math.min(0.9, 0.5 + acuteHits * 0.15) }
  } else if (chronicHits > acuteHits) {
    caseType = { value: 'chronic', confidence: Math.min(0.9, 0.5 + chronicHits * 0.15) }
  } else {
    caseType = { value: 'chronic', confidence: 0.4 } // При равенстве — хронический (безопаснее)
  }

  // --- Age ---
  const childHits = countMarkers(text, CHILD_MARKERS)
  const elderlyHits = countMarkers(text, ELDERLY_MARKERS)

  // Попытка извлечь возраст из числа
  const ageMatch = text.match(/(\d{1,3})\s*(лет|год|года|г\.)/i)
  const numAge = ageMatch ? parseInt(ageMatch[1]) : null

  let age: InferredValue<'child' | 'adult' | 'elderly'>
  if (numAge !== null) {
    if (numAge < 12) age = { value: 'child', confidence: 0.95 }
    else if (numAge >= 65) age = { value: 'elderly', confidence: 0.9 }
    else age = { value: 'adult', confidence: 0.9 }
  } else if (childHits > 0) {
    age = { value: 'child', confidence: 0.7 }
  } else if (elderlyHits > 0) {
    age = { value: 'elderly', confidence: 0.7 }
  } else {
    age = { value: 'adult', confidence: 0.4 } // default
  }

  // --- Sensitivity ---
  const sensHits = countMarkers(text, HIGH_SENSITIVITY_MARKERS)
  let sensitivity: InferredValue<'high' | 'medium' | 'low'>
  if (sensHits >= 2) {
    sensitivity = { value: 'high', confidence: 0.7 }
  } else if (sensHits === 1) {
    sensitivity = { value: 'high', confidence: 0.5 }
  } else {
    sensitivity = { value: 'medium', confidence: 0.3 } // default — нет данных
  }

  // --- Vitality ---
  const lowVitHits = countMarkers(text, LOW_VITALITY_MARKERS)
  const highVitHits = countMarkers(text, HIGH_VITALITY_MARKERS)

  let vitality: InferredValue<'high' | 'medium' | 'low'>
  if (lowVitHits >= 2) {
    vitality = { value: 'low', confidence: 0.7 }
  } else if (lowVitHits === 1 && highVitHits === 0) {
    vitality = { value: 'low', confidence: 0.5 }
  } else if (highVitHits >= 2) {
    vitality = { value: 'high', confidence: 0.6 }
  } else if (highVitHits === 1 && lowVitHits === 0) {
    vitality = { value: 'high', confidence: 0.5 }
  } else {
    vitality = { value: 'medium', confidence: 0.3 } // default
  }

  return { caseType, vitality, sensitivity, age }
}

/**
 * Конвертирует InferredProfile в MDRIPatientProfile для engine.
 * При низком confidence использует безопасные defaults.
 */
export function toEngineProfile(inferred: InferredProfile): MDRIPatientProfile {
  const CONFIDENCE_THRESHOLD = 0.4

  return {
    acuteOrChronic: inferred.caseType.confidence >= CONFIDENCE_THRESHOLD
      ? inferred.caseType.value : 'chronic',
    vitality: inferred.vitality.confidence >= CONFIDENCE_THRESHOLD
      ? inferred.vitality.value : 'medium',
    sensitivity: inferred.sensitivity.confidence >= CONFIDENCE_THRESHOLD
      ? inferred.sensitivity.value : 'medium',
    age: inferred.age.confidence >= CONFIDENCE_THRESHOLD
      ? inferred.age.value : 'adult',
  }
}
