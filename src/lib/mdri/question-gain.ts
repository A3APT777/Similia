/**
 * QuestionGain — выбор лучшего уточняющего вопроса.
 *
 * Вместо generic вопросов от AI, выбираем 1 feature
 * с максимальным gain и строим вопрос из constellation данных.
 *
 * НЕ меняет engine/scoring. Только adjust score + re-sort.
 */

import type { MDRIResult, MDRISymptom, MDRIModality, MDRIConstellationData } from './types'

// === Типы ===

export type ClarifyOption = {
  label: string
  supports?: string[]  // remedies которым помогает
  weakens?: string[]   // remedies которым вредит
  boost?: number       // +score
  penalty?: number     // -score
  neutral?: boolean    // "Не знаю"
}

export type ClarifyQuestion = {
  question: string
  feature: string      // internal feature key
  gain: number
  options: ClarifyOption[]
  fallbackComparison: { remedy: string; keyFeature: string }[]
}

type MDRIData = {
  constellations: Record<string, MDRIConstellationData>
}

// === Вспомогательные ===

function symMatchSimple(a: string, b: string): boolean {
  const aw = a.toLowerCase().split(/\s+/)
  const bw = b.toLowerCase().split(/\s+/)
  const matches = aw.filter(w => bw.some(bWord => bWord.includes(w) || w.includes(bWord)))
  return matches.length >= Math.min(2, aw.length)
}

function getConstellationScore(feature: string, remedy: string, constellations: Record<string, MDRIConstellationData>): number {
  const con = constellations[remedy]
  if (!con?.clusters) return 0
  for (const cluster of con.clusters) {
    for (const sym of cluster.symptoms) {
      if (symMatchSimple(sym.rubric, feature)) {
        return sym.weight * (cluster.importance ?? 1)
      }
    }
  }
  return 0
}

// === QuestionGain компоненты ===

function separationPower(feature: string, top3: MDRIResult[], constellations: Record<string, MDRIConstellationData>): number {
  const scores = top3.map(r => getConstellationScore(feature, r.remedy, constellations))
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  return max > 0 ? (max - min) / max : 0
}

// Категория feature по первому слову
function featureCategory(feature: string): 'mental' | 'general' | 'modality' | 'particular' {
  const f = feature.toLowerCase()
  const mentalWords = ['anger', 'fear', 'anxiety', 'grief', 'jealousy', 'irritab', 'weeping', 'indifferen', 'restless', 'dictator', 'obstinate', 'fastidious', 'sympathet', 'loquaci', 'timid', 'suppressed', 'sensitive', 'hurried', 'impatien', 'capricious', 'haughti', 'violent', 'secretive', 'consolat', 'company']
  const modalityWords = ['worse', 'better', 'agg', 'amel', 'cold', 'heat', 'motion', 'rest', 'morning', 'evening', 'night', 'sleep']
  const generalWords = ['chilly', 'hot', 'thirst', 'desire', 'aversion', 'perspiration', 'emaciation', 'weakness']

  if (mentalWords.some(w => f.includes(w))) return 'mental'
  if (modalityWords.some(w => f.includes(w))) return 'modality'
  if (generalWords.some(w => f.includes(w))) return 'general'
  return 'particular'
}

function clinicalImportance(feature: string): number {
  const cat = featureCategory(feature)
  if (cat === 'mental') return 0.9
  if (cat === 'general') return 0.7
  if (cat === 'modality') return 0.6
  return 0.4
}

function answerability(feature: string): number {
  const f = feature.toLowerCase()
  // Наблюдаемое поведение
  if (['anger', 'irritab', 'weeping', 'fear', 'restless', 'dictator', 'obstinate', 'capricious', 'violent', 'loquaci', 'timid', 'hurried', 'impatien'].some(w => f.includes(w))) return 0.9
  // Термика / еда
  if (['chilly', 'hot', 'desire', 'aversion', 'thirst'].some(w => f.includes(w))) return 0.85
  // Общие модальности
  if (['worse', 'better', 'morning', 'evening'].some(w => f.includes(w))) return 0.7
  // Специфичное время
  if (/\d+\s*(am|pm|утра|вечера|ночи)/.test(f)) return 0.4
  // Редкие физические
  if (['protrud', 'prolapses', 'exophthalm'].some(w => f.includes(w))) return 0.3
  return 0.5
}

function featureConfidence(feature: string, top1: string, top2: string, constellations: Record<string, MDRIConstellationData>): number {
  const fc1 = getConstellationScore(feature, top1, constellations)
  const fc2 = getConstellationScore(feature, top2, constellations)
  return Math.min(fc1, fc2)
}

// === Перевод features → русские вопросы ===

const FEATURE_QUESTIONS: Record<string, { question: string; yes: string; no: string }> = {
  // Mental
  'suppressed': { question: 'Как проявляется гнев/обида?', yes: 'Подавляет, молчит, копит внутри', no: 'Выражает открыто, кричит, импульсивный' },
  'anger suppressed': { question: 'Как проявляется гнев?', yes: 'Подавляет, молчит, потом взрывается', no: 'Сразу выражает, импульсивный' },
  'anger violent': { question: 'Как проявляется гнев?', yes: 'Бурные вспышки, кричит, может ударить', no: 'Скорее подавляет, держит в себе' },
  'dictatorial': { question: 'Как ведёт себя с окружающими?', yes: 'Командует, диктует, требует подчинения', no: 'Скорее подстраивается, уступает' },
  'fastidious': { question: 'Отношение к порядку?', yes: 'Педантичный, всё должно быть на своём месте', no: 'Беспорядок не беспокоит' },
  'obstinate': { question: 'Насколько упрямый?', yes: 'Очень упрямый, не переубедить', no: 'Гибкий, готов к компромиссу' },
  'jealousy': { question: 'Есть ли ревность?', yes: 'Выраженная ревность, подозрительность', no: 'Нет заметной ревности' },
  'indifferen': { question: 'Отношение к близким?', yes: 'Безразличие, не хочет видеть семью', no: 'Любит семью, но закрывается в себе' },
  'consolat': { question: 'Реакция на утешение?', yes: 'Утешение раздражает, хуже', no: 'Утешение помогает или безразлично' },
  'grief': { question: 'Есть ли подавленное горе?', yes: 'Да, держит в себе, не плачет при людях', no: 'Нет выраженного горя' },
  'weeping': { question: 'Плаксивость?', yes: 'Плачет легко, от мелочей', no: 'Не плачет или только наедине' },
  'sympathet': { question: 'Сочувствие к другим?', yes: 'Очень сочувственный, переживает за других', no: 'Скорее равнодушен к чужим проблемам' },
  'loquaci': { question: 'Разговорчивость?', yes: 'Очень разговорчивый, не остановить', no: 'Скорее молчаливый' },
  'hurried': { question: 'Торопливость?', yes: 'Всё делает в спешке, нетерпеливый', no: 'Спокойный, размеренный' },
  // General
  'chilly': { question: 'Термика?', yes: 'Зябкий, постоянно мёрзнет', no: 'Жаркий, предпочитает прохладу' },
  'hot patient': { question: 'Термика?', yes: 'Жаркий, любит холод', no: 'Зябкий, любит тепло' },
  'thirst': { question: 'Жажда?', yes: 'Выраженная жажда, пьёт много', no: 'Нет жажды или пьёт мало' },
  'desire salt': { question: 'Любит солёное?', yes: 'Да, тянет к солёному', no: 'Нет особой тяги' },
  'desire sweet': { question: 'Любит сладкое?', yes: 'Да, тянет к сладкому', no: 'Нет особой тяги' },
  'emaciation': { question: 'Худеет?', yes: 'Да, худеет при хорошем аппетите', no: 'Вес стабильный' },
  'perspiration': { question: 'Потливость?', yes: 'Повышенная потливость', no: 'Не потеет или нормально' },
  // Modalities
  'worse morning': { question: 'Время ухудшения?', yes: 'Хуже утром', no: 'Утром нормально' },
  'worse evening': { question: 'Время ухудшения?', yes: 'Хуже вечером', no: 'Вечером нормально' },
  'worse night': { question: 'Время ухудшения?', yes: 'Хуже ночью', no: 'Ночью нормально' },
  'better motion': { question: 'Движение?', yes: 'Лучше от движения', no: 'Хуже от движения' },
  'worse motion': { question: 'Движение?', yes: 'Хуже от движения, хочет лежать', no: 'Движение не влияет или помогает' },
}

function findFeatureTranslation(feature: string): { question: string; yes: string; no: string } | null {
  const f = feature.toLowerCase()
  for (const [key, val] of Object.entries(FEATURE_QUESTIONS)) {
    if (f.includes(key)) return val
  }
  return null
}

function getKeyFeatureDescription(remedy: string, constellations: Record<string, MDRIConstellationData>): string {
  const con = constellations[remedy]
  if (!con?.clusters?.length) return remedy

  // Берём самый важный cluster → самый весомый symptom
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

  // Переводим
  const trans = findFeatureTranslation(bestSym)
  if (trans) return trans.yes
  return bestSym
}

// === Feature reuse guard ===

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[.,;()\[\]]/g, '').trim()
}

/**
 * Hard skip: feature уже покрыт существующими симптомами.
 * Если ≥50% слов feature совпадают с любым symptom → skip.
 */
function isFeatureCovered(feature: string, existingSymptoms: MDRISymptom[]): boolean {
  const fWords = normalizeText(feature).split(/\s+/).filter(w => w.length > 2)
  if (fWords.length === 0) return false

  for (const s of existingSymptoms) {
    const sWords = normalizeText(s.rubric).split(/\s+/).filter(w => w.length > 2)
    const matches = fWords.filter(fw => sWords.some(sw => sw.includes(fw) || fw.includes(sw)))
    if (matches.length >= Math.ceil(fWords.length * 0.5)) return true
  }
  return false
}

// === Главные функции ===

export function selectBestClarifyQuestion(
  results: MDRIResult[],
  constellations: Record<string, MDRIConstellationData>,
  existingSymptoms: MDRISymptom[],
): ClarifyQuestion | null {
  if (results.length < 2) return null

  const top3 = results.slice(0, 3)
  const gap = top3[0].totalScore - (top3[1]?.totalScore ?? 0)

  // Не нужен clarify если gap большой
  if (gap >= 12) return null

  // Собрать ВСЕ features из constellation top-3
  const allFeatures = new Set<string>()
  for (const r of top3) {
    const con = constellations[r.remedy]
    if (!con?.clusters) continue
    for (const cluster of con.clusters) {
      for (const sym of cluster.symptoms) {
        allFeatures.add(sym.rubric)
      }
    }
  }

  // Убрать features которые уже в симптомах
  const newFeatures = [...allFeatures].filter(f =>
    !existingSymptoms.some(s => symMatchSimple(s.rubric, f))
  )

  // Посчитать gain для каждого
  let bestFeature = ''
  let bestGain = 0

  for (const feature of newFeatures) {
    // Должен иметь русский перевод
    if (!findFeatureTranslation(feature)) continue

    // Hard skip: feature уже покрыт существующими симптомами
    if (isFeatureCovered(feature, existingSymptoms)) continue

    // Отсечка: врач не может ответить на этот вопрос
    const an = answerability(feature)
    if (an < 0.5) continue

    const sp = separationPower(feature, top3, constellations)
    const ci = clinicalImportance(feature)
    const fc = featureConfidence(feature, top3[0].remedy, top3[1].remedy, constellations)

    const gain = 0.45 * sp + 0.25 * ci + 0.20 * an + 0.10 * fc

    if (gain > bestGain) {
      bestGain = gain
      bestFeature = feature
    }
  }

  if (bestGain < 0.3 || !bestFeature) return null

  // Построить вопрос
  const question = buildClarifyQuestion(bestFeature, bestGain, top3, constellations)

  // Проверить полезность: изменит ли ответ top-1?
  if (!isUsefulQuestion(question, results)) return null

  return question
}

function buildClarifyQuestion(
  feature: string,
  gain: number,
  top3: MDRIResult[],
  constellations: Record<string, MDRIConstellationData>,
): ClarifyQuestion {
  const trans = findFeatureTranslation(feature)!

  // Найти кто поддерживается этим feature
  const supporters: string[] = []
  const opposers: string[] = []
  for (const r of top3) {
    const score = getConstellationScore(feature, r.remedy, constellations)
    if (score > 0.4) supporters.push(r.remedy)
    else opposers.push(r.remedy)
  }

  return {
    question: trans.question,
    feature,
    gain,
    options: [
      {
        label: trans.yes,
        supports: supporters,
        boost: 15,
      },
      {
        label: trans.no,
        weakens: supporters,
        supports: opposers.length > 0 ? opposers : undefined,
        penalty: -10,
        boost: opposers.length > 0 ? 10 : undefined,
      },
      {
        label: 'Не знаю / Не замечал',
        neutral: true,
      },
    ],
    fallbackComparison: top3.map(r => ({
      remedy: r.remedy,
      keyFeature: getKeyFeatureDescription(r.remedy, constellations),
    })),
  }
}

function isUsefulQuestion(question: ClarifyQuestion, results: MDRIResult[]): boolean {
  const oldTop1 = results[0].remedy
  const oldGap = results[0].totalScore - (results[1]?.totalScore ?? 0)

  for (const option of question.options) {
    if (option.neutral) continue
    const adjusted = applyClarifyBonus(results, option)
    const newTop1 = adjusted[0].remedy
    const newGap = adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0)

    if (newTop1 !== oldTop1) return true           // сменил top-1
    if ((newGap - oldGap) >= 5) return true         // увеличил gap на 5+
  }

  return false
}

export function applyClarifyBonus(
  results: MDRIResult[],
  answer: ClarifyOption,
): MDRIResult[] {
  if (answer.neutral) return results

  const adjusted = results.map(r => {
    const maxBonus = Math.round(r.totalScore * 0.2) // макс 20% от score
    let bonus = 0
    if (answer.supports?.includes(r.remedy) && answer.boost) bonus += Math.min(answer.boost, maxBonus)
    if (answer.weakens?.includes(r.remedy) && answer.penalty) bonus += Math.max(answer.penalty, -maxBonus)
    return { ...r, totalScore: Math.max(0, r.totalScore + bonus) }
  })

  adjusted.sort((a, b) => b.totalScore - a.totalScore)
  return adjusted
}
