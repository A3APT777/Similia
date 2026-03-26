/**
 * MDRI Product Safety Layer v2
 *
 * Слой ПОВЕРХ engine core. Engine НЕ изменён.
 * 1. Keyword fallback — safety net параллельно Sonnet
 * 2. Merge — keyword побеждает при конфликте на простых паттернах
 * 3. Soft validation — warnings
 * 4. Confidence — реальная уверенность, не формальная
 */

import type { MDRISymptom, MDRIModality, MDRIResult, MDRIRepertoryRubric, MDRIPatientProfile } from './types'
import { analyzePipeline } from './engine'

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

  // Этиология — "после X" (Organon §5: causa иерархически выше симптомов)
  { patterns: ['после прививки', 'после вакцин'],
    symptom: { rubric: 'ailments from vaccination', category: 'general', weight: 3 },
    certainty: 'high' },
  { patterns: ['после горя', 'после утраты', 'после потери близ'],
    symptom: { rubric: 'ailments from grief', category: 'mental', weight: 3 },
    certainty: 'high' },
  { patterns: ['после гнева', 'после ссоры', 'после обиды', 'после унижен'],
    symptom: { rubric: 'ailments from anger indignation', category: 'mental', weight: 3 },
    certainty: 'high' },
  { patterns: ['после травмы голов', 'после сотрясен', 'после чмт'],
    symptom: { rubric: 'ailments from head injury concussion', category: 'general', weight: 3 },
    certainty: 'high' },
  { patterns: ['после испуга', 'после шока', 'с испугу'],
    symptom: { rubric: 'ailments from fright shock', category: 'mental', weight: 3 },
    certainty: 'high' },

  // Сон/поза — keynotes нозодов (Nash: Med #1 = sleep on abdomen)
  { patterns: ['спит на животе', 'сон на животе', 'на животе спит'],
    symptom: { rubric: 'sleep position on abdomen', category: 'general', weight: 3 },
    certainty: 'high' },

  // Peculiar keynotes малых средств
  { patterns: ['периодическ', 'через день', 'каждый второй день', 'с периодичн'],
    symptom: { rubric: 'periodicity intermittent complaints', category: 'general', weight: 3 },
    certainty: 'high' },
  { patterns: ['не может откашл', 'не откашлив', 'мокрота не отход', 'хрипит но не откашл'],
    symptom: { rubric: 'rattling mucus inability to expectorate', category: 'particular', weight: 3 },
    certainty: 'high' },
  { patterns: ['тяжесть век', 'веки тяжёл', 'глаза не открыть'],
    symptom: { rubric: 'eyelids heaviness drooping', category: 'particular', weight: 3 },
    certainty: 'high' },
  { patterns: ['отстаёт в развитии', 'поздно пошёл', 'поздно заговорил'],
    symptom: { rubric: 'slow development late walking talking', category: 'general', weight: 3 },
    certainty: 'high' },
  { patterns: ['укачивает', 'тошнит в транспорт', 'морская болезнь'],
    symptom: { rubric: 'motion sickness nausea travel', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['ослаб после понос', 'слабость после понос', 'после длительн.*понос'],
    symptom: { rubric: 'debility from loss of fluids diarrhea', category: 'general', weight: 3 },
    certainty: 'high' },

  // Сторонность
  { patterns: ['всё слева', 'жалобы слева', 'левосторонн'],
    symptom: { rubric: 'left side complaints', category: 'general', weight: 2 },
    certainty: 'high' },
  { patterns: ['всё справа', 'жалобы справа', 'правосторонн'],
    symptom: { rubric: 'right side complaints', category: 'general', weight: 2 },
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
  sonnetFamilyHistory?: string[],
): {
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  warnings: ValidationWarning[]
  conflicts: string[]
  familyHistory: string[]
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

  // Post-processing 1: нормализация rubrics (canonical mapping)
  normalizeSymptoms(symptoms, originalText)

  // Post-processing 2: коррекция весов по known peculiar patterns
  correctWeights(symptoms, originalText)

  // Post-processing 3: гарантия модальностей из текста
  ensureModalities(modalities, originalText)

  // Post-processing 4: гарантия семейного анамнеза из текста
  const familyHistory = ensureFamilyHistory(sonnetFamilyHistory ?? [], originalText)

  return { symptoms, modalities, warnings, conflicts: fallback.conflicts, familyHistory }
}

// =====================================================================
// 2.5a NORMALIZE — canonical mapping для стабильности
//
// Sonnet может формулировать один и тот же симптом по-разному:
// "anxiety anticipatory" vs "anxiety anticipation" vs "anxiety before events"
// Нормализуем в единый canonical rubric.
// =====================================================================

type CanonicalRule = {
  // Паттерны в rubric Sonnet (любой match → заменяем)
  rubricPatterns: string[]
  // Canonical rubric
  canonical: string
  category: 'mental' | 'general' | 'particular'
  minWeight: 1 | 2 | 3  // минимальный вес (поднимаем если ниже)
}

const CANONICAL_RULES: CanonicalRule[] = [
  // Термика
  { rubricPatterns: ['chilly', 'chilliness', 'sensitive cold'], canonical: 'chilly', category: 'general', minWeight: 2 },
  { rubricPatterns: ['hot patient', 'warm blooded', 'overheated'], canonical: 'hot patient', category: 'general', minWeight: 2 },
  // Жажда
  { rubricPatterns: ['thirstless', 'thirst absent', 'no thirst', 'without thirst'], canonical: 'thirstless', category: 'general', minWeight: 2 },
  { rubricPatterns: ['thirst large', 'thirst copious', 'drinks large'], canonical: 'thirst large quantities', category: 'general', minWeight: 2 },
  { rubricPatterns: ['thirst small sips', 'sips frequent', 'drinks often small'], canonical: 'thirst small sips frequently', category: 'general', minWeight: 3 },
  // Consolation
  { rubricPatterns: ['consolation agg', 'consolation worse', 'aversion consolation'], canonical: 'consolation aggravates', category: 'mental', minWeight: 3 },
  { rubricPatterns: ['consolation amel', 'consolation better', 'desires sympathy'], canonical: 'consolation ameliorates', category: 'mental', minWeight: 2 },
  // Time
  { rubricPatterns: ['worse 2am', 'worse 2-4', 'worse 3am', 'waking 2', 'waking 3', '2am 3am', '2-4am'], canonical: 'worse after midnight 2-4am', category: 'general', minWeight: 3 },
  { rubricPatterns: ['worse 4pm', 'worse 4-8', 'worse 16', 'afternoon evening'], canonical: 'worse 4-8pm afternoon evening', category: 'general', minWeight: 3 },
  { rubricPatterns: ['worse after sleep', 'waking worse', 'after sleep agg'], canonical: 'worse after sleep', category: 'general', minWeight: 3 },
  // Motion
  { rubricPatterns: ['first motion worse', 'first motion agg', 'stiffness first motion', 'limbers up'], canonical: 'stiffness joints worse first motion better continued', category: 'general', minWeight: 3 },
  // Peculiar physical
  { rubricPatterns: ['perspiration head night', 'perspiration head profuse', 'head sweat night'], canonical: 'perspiration head night profuse', category: 'general', minWeight: 3 },
  { rubricPatterns: ['burning feet night', 'feet burning uncovers', 'soles burning night'], canonical: 'burning feet at night uncovers', category: 'particular', minWeight: 3 },
  { rubricPatterns: ['burning better warm', 'burning better heat', 'burning pains amel warm'], canonical: 'burning pains better warm applications', category: 'general', minWeight: 3 },
  { rubricPatterns: ['one cheek red other pale', 'cheek red pale'], canonical: 'one cheek red other pale', category: 'particular', minWeight: 3 },
  { rubricPatterns: ['better at sea', 'better seashore', 'better ocean', 'sea ameliorates'], canonical: 'better at sea seashore', category: 'general', minWeight: 3 },
  { rubricPatterns: ['tight clothing neck', 'intolerance collar', 'cannot bear tight'], canonical: 'intolerance tight clothing around neck', category: 'general', minWeight: 3 },
  // Mental peculiar
  { rubricPatterns: ['indifference family', 'indifference husband', 'indifference children'], canonical: 'indifference family husband children', category: 'mental', minWeight: 3 },
  { rubricPatterns: ['grief suppressed', 'grief silent', 'grief old'], canonical: 'grief suppressed old silent', category: 'mental', minWeight: 3 },
  { rubricPatterns: ['fastidious', 'orderly pedantic', 'neat tidy'], canonical: 'fastidious orderly pedantic', category: 'mental', minWeight: 3 },
  // Sleep
  { rubricPatterns: ['sleep abdomen', 'sleep position abdomen', 'sleeps on abdomen'], canonical: 'sleep position on abdomen', category: 'general', minWeight: 2 },
  // Fear combinations
  { rubricPatterns: ['fear dark thunderstorm', 'fear dark thunder alone', 'fear darkness storm'], canonical: 'fear dark thunderstorm alone', category: 'mental', minWeight: 3 },
]

function normalizeSymptoms(symptoms: MDRISymptom[], _originalText: string) {
  for (const sym of symptoms) {
    const rubricLower = sym.rubric.toLowerCase()

    for (const rule of CANONICAL_RULES) {
      const matched = rule.rubricPatterns.some(p => rubricLower.includes(p))
      if (matched) {
        sym.rubric = rule.canonical
        sym.category = rule.category
        if (sym.weight < rule.minWeight) sym.weight = rule.minWeight
        break // первый match побеждает
      }
    }
  }

  // Дедупликация: если после нормализации есть дубли rubric → оставить с max weight
  const seen = new Map<string, number>() // rubric → index
  const toRemove: number[] = []
  for (let i = 0; i < symptoms.length; i++) {
    const key = symptoms[i].rubric.toLowerCase()
    if (seen.has(key)) {
      const prevIdx = seen.get(key)!
      if (symptoms[i].weight > symptoms[prevIdx].weight) {
        toRemove.push(prevIdx)
        seen.set(key, i)
      } else {
        toRemove.push(i)
      }
    } else {
      seen.set(key, i)
    }
  }
  // Удаляем дубли (с конца чтобы не сбить индексы)
  for (const idx of toRemove.sort((a, b) => b - a)) {
    symptoms.splice(idx, 1)
  }
}

// Гарантия модальностей из русского текста
// Если Sonnet не извлёк модальность, но текст явно указывает → добавляем
function ensureModalities(modalities: MDRIModality[], originalText: string) {
  const text = originalText.toLowerCase()
  const has = (pairId: string) => modalities.some(m => m.pairId === pairId)

  // heat_cold
  if (!has('heat_cold')) {
    if (/зябк|мёрзн|мерзн|очень зябк|постоянно мёрзн/.test(text)) {
      modalities.push({ pairId: 'heat_cold', value: 'amel' })
    } else if (/жарк|тепло хуже|не переносит тепл|хуже от тепл/.test(text)) {
      modalities.push({ pairId: 'heat_cold', value: 'agg' })
    }
  }

  // motion_rest
  if (!has('motion_rest')) {
    if (/движени.{0,5}хуже|хуже от движен|покой лучше|лежит не шевел/.test(text)) {
      modalities.push({ pairId: 'motion_rest', value: 'agg' })
    } else if (/движени.{0,5}лучше|лучше от движен|не может сидеть|расходится|расхаж/.test(text)) {
      modalities.push({ pairId: 'motion_rest', value: 'amel' })
    }
  }

  // consolation
  if (!has('consolation')) {
    if (/утешение хуже|не хочет утешен|утешение раздраж/.test(text)) {
      modalities.push({ pairId: 'consolation', value: 'agg' })
    } else if (/утешение лучше|хочет.*жале|утешение помогает/.test(text)) {
      modalities.push({ pairId: 'consolation', value: 'amel' })
    }
  }

  // open_air
  if (!has('open_air')) {
    if (/свежий воздух лучше|на воздухе лучше|лучше на свежем/.test(text)) {
      modalities.push({ pairId: 'open_air', value: 'amel' })
    } else if (/сквозняк хуже|хуже от сквозняк/.test(text)) {
      modalities.push({ pairId: 'open_air', value: 'agg' })
    }
  }

  // pressure
  if (!has('pressure')) {
    if (/давлени.{0,5}лучше|лучше от давлен|сгибается пополам/.test(text)) {
      modalities.push({ pairId: 'pressure', value: 'amel' })
    }
  }

  // company_alone
  if (!has('company_alone')) {
    if (/хочет быть один|хочет одиноч|уходит от люд|один лучше/.test(text)) {
      modalities.push({ pairId: 'company_alone', value: 'agg' })
    } else if (/не хочет быть один|компани.{0,5}лучше|боится одиноч|хочет чтоб.{0,10}рядом/.test(text)) {
      modalities.push({ pairId: 'company_alone', value: 'amel' })
    }
  }

  // sea
  if (!has('sea')) {
    if (/на море лучше|у моря лучше|морской воздух/.test(text)) {
      modalities.push({ pairId: 'sea', value: 'amel' })
    }
  }
}

// Гарантия семейного анамнеза из русского текста
// Sonnet часто пропускает "бабушка болела ТБ" — критично для нозодов (Ганеман, "Хронические болезни")
function ensureFamilyHistory(sonnetFH: string[], originalText: string): string[] {
  const text = originalText.toLowerCase()
  const result = [...sonnetFH]
  const has = (keyword: string) => result.some(f => f.toLowerCase().includes(keyword))

  const FAMILY_PATTERNS: { patterns: RegExp; disease: string }[] = [
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|родител|сестр|брат|в семье|семейн|наследств).*(?:туберкул|тбц|тб\b)/i, disease: 'tuberculosis' },
    { patterns: /(?:туберкул|тбц|тб\b).*(?:бабушк|дедушк|мат|отец|мам|пап|родител|сестр|брат|в семье)/i, disease: 'tuberculosis' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|родител|в семье|семейн).*(?:рак|онкол|опухол)/i, disease: 'cancer' },
    { patterns: /(?:рак|онкол|опухол).*(?:бабушк|дедушк|мат|отец|мам|пап|родител|в семье)/i, disease: 'cancer' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|в семье).*(?:астм)/i, disease: 'asthma' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|в семье).*(?:диабет|сахарн)/i, disease: 'diabetes' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|в семье).*(?:псориаз|экзем)/i, disease: 'psoriasis' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|в семье).*(?:бородавк|кондилом|папиллом)/i, disease: 'warts' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|в семье).*(?:сердц|инфаркт|инсульт)/i, disease: 'heart disease' },
    { patterns: /(?:бабушк|дедушк|мат|отец|мам|пап|в семье).*(?:алкогол)/i, disease: 'alcoholism' },
    // Обратный порядок для "страдал от кондилом отец"
    { patterns: /(?:кондилом|папиллом|бородавк).*(?:отец|мат|бабушк|дедушк|в семье)/i, disease: 'condylomata' },
  ]

  for (const rule of FAMILY_PATTERNS) {
    if (rule.patterns.test(text) && !has(rule.disease)) {
      result.push(rule.disease)
    }
  }

  return result
}

// =====================================================================
// 2.5b WEIGHT CORRECTION — post-processing после Sonnet
//
// Фиксирует known peculiar patterns которые Sonnet недооценивает.
// НЕ меняет scoring — только корректирует вход в engine.
// =====================================================================

// Паттерны в rubric которые ВСЕГДА должны быть w=3
const PECULIAR_RUBRIC_PATTERNS = [
  // Time-specific
  'worse after midnight', 'worse 1am', 'worse 2am', 'worse 2-4am', 'worse 3am', 'worse 4-8pm',
  'waking 2am', 'waking 3am', 'waking 2-4',
  // Peculiar combinations
  'one cheek red other pale',
  'burning feet night uncovers',
  'burning pains better warm', 'burning better heat',
  'first motion worse then better', 'first motion aggravates',
  'perspiration head night',
  'thirst small sips frequently',
  'worse after sleep',
  'intolerance tight clothing neck',
  'better at sea', 'better seashore',
  'bearing down prolapse sensation',
  'asthma worse night 2', 'asthma night',
  // Peculiar mental
  'consolation aggravates',
  'indifference family',
  'grief suppressed silent',
  'fastidious orderly pedantic',
  'jealousy suspicious',
  'fear dark thunderstorm alone',
  // Peculiar physical
  'vomiting diarrhea cold sweat',
  'edema swelling stinging',
  'skin pale waxy',
  'sleep position abdomen',
  'desire ice cream cold',
  'capricious asks then refuses',
]

// Паттерны в РУССКОМ тексте которые подтверждают w=3
const PECULIAR_TEXT_PATTERNS: { textPattern: string; rubricContains: string }[] = [
  { textPattern: 'потеет голова ночью', rubricContains: 'perspiration head' },
  { textPattern: 'высовывает из-под одеяла', rubricContains: 'burning feet' },
  { textPattern: 'маленькими глотками', rubricContains: 'small sips' },
  { textPattern: 'после полуночи', rubricContains: 'midnight' },
  { textPattern: 'после сна хуже', rubricContains: 'after sleep' },
  { textPattern: 'хуже после сна', rubricContains: 'after sleep' },
  { textPattern: 'не переносит тесн', rubricContains: 'tight clothing' },
  { textPattern: 'на море лучше', rubricContains: 'sea' },
  { textPattern: 'одна щека красная', rubricContains: 'one cheek' },
  { textPattern: 'жжение.*лучше от тепла', rubricContains: 'burning' },
  { textPattern: 'первое движение хуже', rubricContains: 'first motion' },
  { textPattern: 'расходится', rubricContains: 'first motion' },
  { textPattern: 'утешение хуже', rubricContains: 'consolation' },
  { textPattern: 'безразличие к семье', rubricContains: 'indifference family' },
  { textPattern: 'тянет вниз', rubricContains: 'bearing down' },
  { textPattern: 'в 2-4', rubricContains: '2am' },
  { textPattern: 'в 2-4', rubricContains: '2-4' },
  { textPattern: 'в 4-8', rubricContains: '4-8' },
  { textPattern: 'с 16 до 20', rubricContains: '4-8pm' },
  { textPattern: 'с 16 до 20', rubricContains: '4pm' },
  { textPattern: 'боится темноты.*грозы', rubricContains: 'fear dark' },
  { textPattern: 'страх.*темноты.*грозы', rubricContains: 'fear dark' },
  { textPattern: 'спит на животе', rubricContains: 'sleep.*abdomen' },
  { textPattern: 'нет жажды', rubricContains: 'thirstless' },
]

function correctWeights(symptoms: MDRISymptom[], originalText: string) {
  const textLower = originalText.toLowerCase()

  for (const sym of symptoms) {
    if (sym.weight >= 3) continue // уже peculiar
    const rubricLower = sym.rubric.toLowerCase()

    // 1. Проверяем rubric по known peculiar patterns
    for (const pattern of PECULIAR_RUBRIC_PATTERNS) {
      if (rubricLower.includes(pattern)) {
        sym.weight = 3
        break
      }
    }
    if (sym.weight >= 3) continue

    // 2. Проверяем русский текст → rubric подтверждение
    for (const { textPattern, rubricContains } of PECULIAR_TEXT_PATTERNS) {
      if (textLower.includes(textPattern) && new RegExp(rubricContains, 'i').test(rubricLower)) {
        sym.weight = 3
        break
      }
    }
  }
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

// =====================================================================
// 6. IDF-НОРМАЛИЗАЦИЯ ВЕСОВ СИМПТОМОВ
// Снижает влияние общих рубрик (где много препаратов),
// усиливает влияние специфичных рубрик (где мало препаратов).
// Engine core НЕ изменён — корректируем weight ДО передачи в engine.
// =====================================================================

// Кэш IDF для рубрик (считается один раз)
let idfCache: Map<string, number> | null = null
let totalRemediesInRepertory = 0

/**
 * Построить IDF-индекс из реперторных данных.
 * IDF = log(N / df), где N = кол-во уникальных препаратов, df = кол-во препаратов в рубрике.
 */
function buildIdfIndex(repertory: MDRIRepertoryRubric[]): Map<string, number> {
  if (idfCache) return idfCache

  // Считаем уникальные препараты
  const allRemedies = new Set<string>()
  for (const rubric of repertory) {
    for (const r of rubric.remedies) {
      allRemedies.add(r.abbrev.toLowerCase())
    }
  }
  totalRemediesInRepertory = allRemedies.size

  const index = new Map<string, number>()
  for (const rubric of repertory) {
    const df = rubric.remedies.length
    // IDF = log(N/df), нормализован в [0..1] через деление на max
    const idf = Math.log(totalRemediesInRepertory / Math.max(1, df))
    // Запоминаем по каждому слову рубрики (для fuzzy matching)
    index.set(rubric.rubric.toLowerCase(), idf)
  }

  // Нормализация: приводим к [0.3..1.0] чтобы не обнулять веса
  const maxIdf = Math.max(...index.values())
  for (const [key, val] of index) {
    index.set(key, 0.3 + 0.7 * (val / maxIdf))
  }

  idfCache = index
  return index
}

/**
 * Найти IDF для симптома. Ищет best match среди рубрик.
 */
function getSymptomIdf(rubric: string, idfIndex: Map<string, number>): number {
  const lower = rubric.toLowerCase()

  // Точное совпадение
  if (idfIndex.has(lower)) return idfIndex.get(lower)!

  // Поиск по вхождению (rubric может быть частью полной рубрики)
  let bestMatch = 1.0 // default = полный вес
  let bestLen = Infinity
  const words = lower.split(/\s+/)

  for (const [key, idf] of idfIndex) {
    // Все слова симптома содержатся в рубрике
    if (words.length >= 2 && words.every(w => key.includes(w))) {
      if (key.length < bestLen) {
        bestMatch = idf
        bestLen = key.length
      }
    }
  }

  return bestMatch
}

/**
 * Применить IDF-нормализацию к весам симптомов.
 * Общие симптомы (в которых много препаратов) получают пониженный вес.
 * Специфичные симптомы сохраняют или повышают вес.
 *
 * ВАЖНО: не меняет оригинальный массив, возвращает новый.
 */
export function applyIdfWeights(
  symptoms: MDRISymptom[],
  repertory: MDRIRepertoryRubric[]
): MDRISymptom[] {
  const idfIndex = buildIdfIndex(repertory)

  return symptoms.map(s => {
    // w=3 (peculiar) НИКОГДА не понижаем — это специфичные симптомы
    if (s.weight >= 3) return s

    const idf = getSymptomIdf(s.rubric, idfIndex)
    // idf ∈ [0.3..1.0]

    // w=2 → понижаем до 1 при низком IDF (рубрика слишком общая)
    // w=1 → оставляем 1 (ниже некуда)
    // Порог 0.5: рубрики с >50 препаратами (из ~500 всего)
    let adjustedWeight = s.weight
    if (s.weight === 2 && idf < 0.5) {
      adjustedWeight = 1
    }

    return adjustedWeight !== s.weight
      ? { ...s, weight: adjustedWeight as 1 | 2 | 3 }
      : s
  })
}

/**
 * Обёртка над engine.analyzePipeline с IDF-нормализацией.
 * Engine core НЕ изменён — мы корректируем вход.
 */
/**
 * Обёртка над engine с IDF + post-engine quality re-ranking.
 * Engine core НЕ изменён.
 *
 * Post-engine re-ranking:
 * 1. Для каждого remedy из top-N проверяем качество совпадений
 * 2. Peculiar match bonus: w=3 симптомы, которые match remedy, усиливают score
 * 3. Specificity bonus: совпадения с редкими рубриками (мало remedies) усиливают score
 * 4. Coverage penalty: если remedy покрывает только общие симптомы — штраф
 */
export function analyzeWithIdf(
  data: { repertory: MDRIRepertoryRubric[]; constellations: Record<string, unknown>; polarities: Record<string, unknown>; relationships: Record<string, unknown>; wordIndex: Map<string, number[]> },
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
  familyHistory: string[],
  profile: MDRIPatientProfile,
): MDRIResult[] {
  const normalizedSymptoms = applyIdfWeights(symptoms, data.repertory)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = analyzePipeline(data as any, normalizedSymptoms, modalities, familyHistory, profile)

  // Post-engine quality re-ranking (top-20)
  return reRankByQuality(results.slice(0, 20), symptoms, data.repertory)
    .concat(results.slice(20))
}

// =====================================================================
// 7. POST-ENGINE QUALITY RE-RANKING
// =====================================================================

/**
 * Проверить, содержит ли рубрика данный remedy.
 * Возвращает grade (1-3) или 0 если не найден.
 */
function findRemedyInRubric(
  rubricText: string,
  remedyAbbrev: string,
  repertory: MDRIRepertoryRubric[]
): number {
  const remedyLower = remedyAbbrev.toLowerCase().replace(/\.$/, '')
  const words = rubricText.toLowerCase().split(/\s+/)

  for (const rubric of repertory) {
    const rubricLower = rubric.rubric.toLowerCase()
    // Проверяем что все слова симптома есть в рубрике
    if (words.length >= 2 && words.every(w => rubricLower.includes(w))) {
      const found = rubric.remedies.find(r =>
        r.abbrev.toLowerCase().replace(/\.$/, '') === remedyLower
      )
      if (found) return found.grade
    }
  }
  return 0
}

/**
 * Быстрый lookup: есть ли remedy в рубриках, содержащих данные слова.
 * Использует word index для скорости.
 */
function quickRemedyMatch(
  symptomRubric: string,
  remedyAbbrev: string,
  repertory: MDRIRepertoryRubric[],
  wordIndex: Map<string, number[]>
): { found: boolean; grade: number; rubricSize: number } {
  const words = symptomRubric.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const remedyLower = remedyAbbrev.toLowerCase().replace(/\.$/, '')

  if (words.length === 0) return { found: false, grade: 0, rubricSize: 0 }

  // Найти рубрики через word index (пересечение)
  let candidateIndices: Set<number> | null = null
  for (const word of words) {
    const indices = wordIndex.get(word)
    if (!indices || indices.length === 0) return { found: false, grade: 0, rubricSize: 0 }
    const indexSet = new Set(indices)
    if (candidateIndices === null) {
      candidateIndices = indexSet
    } else {
      candidateIndices = new Set([...candidateIndices].filter(i => indexSet.has(i)))
    }
    if (candidateIndices.size === 0) return { found: false, grade: 0, rubricSize: 0 }
  }

  // Проверяем remedy в найденных рубриках
  for (const idx of candidateIndices!) {
    const rubric = repertory[idx]
    if (!rubric) continue
    const rem = rubric.remedies.find(r =>
      r.abbrev.toLowerCase().replace(/\.$/, '') === remedyLower
    )
    if (rem) {
      return { found: true, grade: rem.grade, rubricSize: rubric.remedies.length }
    }
  }

  return { found: false, grade: 0, rubricSize: 0 }
}

/**
 * Post-engine re-ranking: пересчёт score на основе качества совпадений.
 *
 * Для каждого remedy из results:
 * 1. Peculiar match: сколько w=3 симптомов реально совпало → bonus
 * 2. Specificity: средний IDF совпавших рубрик → bonus
 * 3. Coverage penalty: если remedy покрывает только w=1/2 → penalty
 */
function reRankByQuality(
  results: MDRIResult[],
  inputSymptoms: MDRISymptom[],
  repertory: MDRIRepertoryRubric[],
): MDRIResult[] {
  if (results.length < 2 || inputSymptoms.length === 0) return results

  // Собираем wordIndex для быстрого lookup
  const wordIndex = new Map<string, number[]>()
  for (let i = 0; i < repertory.length; i++) {
    const words = repertory[i].rubric.toLowerCase().split(/[\s;,]+/)
    for (const w of words) {
      if (w.length <= 2) continue
      if (!wordIndex.has(w)) wordIndex.set(w, [])
      wordIndex.get(w)!.push(i)
    }
  }

  const peculiarSymptoms = inputSymptoms.filter(s => s.weight >= 3)
  if (peculiarSymptoms.length === 0) return results // Нет peculiar → нечего ранжировать

  // Для каждого peculiar симптома: какие remedies из top-N его покрывают?
  // Если symptom покрывает ТОЛЬКО 1-2 из top-5 → это дифференцирующий сигнал
  const topN = results.slice(0, Math.min(10, results.length))
  const remedyBonuses = new Map<string, number>()
  for (const r of topN) remedyBonuses.set(r.remedy, 0)

  for (const sym of peculiarSymptoms) {
    // Кто из top-N покрывает этот peculiar?
    const coveredBy: string[] = []
    for (const r of topN) {
      const match = quickRemedyMatch(sym.rubric, r.remedy, repertory, wordIndex)
      if (match.found) coveredBy.push(r.remedy)
    }

    if (coveredBy.length === 0) continue

    // Чем МЕНЬШЕ remedies покрывают этот peculiar, тем БОЛЬШЕ bonus для тех кто покрывает
    // 1 remedy → bonus 0.08 (уникальное совпадение!)
    // 2 remedies → bonus 0.05
    // 3+ → bonus 0.02
    // 5+ → bonus 0 (общий peculiar, все его покрывают)
    const bonus = coveredBy.length === 1 ? 0.08
                : coveredBy.length === 2 ? 0.05
                : coveredBy.length <= 4 ? 0.02
                : 0

    for (const rem of coveredBy) {
      remedyBonuses.set(rem, (remedyBonuses.get(rem) ?? 0) + bonus)
    }
  }

  // Применяем бонусы
  const reranked = results.map(r => {
    const bonus = remedyBonuses.get(r.remedy) ?? 0
    if (bonus === 0) return r
    const adjustedScore = Math.round(r.totalScore * (1 + bonus))
    return { ...r, totalScore: Math.min(100, adjustedScore) }
  })

  // Пересортируем
  reranked.sort((a, b) => b.totalScore - a.totalScore)
  return reranked
}
