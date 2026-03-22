// MDRI Engine v3 — Multi-Dimensional Remedy Intelligence (TypeScript port)

import { symMatch, SYNONYM_MAP, SYNONYM_WORD_INDEX } from './synonyms'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile, MDRIResult,
  MDRILensResult, MDRIPotencyRecommendation, MDRIDifferentialNote,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIRemedyRelationships, MDRIClinicalData,
  ConsistencyCondition, ConsistencyGroup,
} from './types'
import { DEFAULT_PROFILE } from './types'

// Миазматические данные
const FAMILY_HISTORY_MIASM: Record<string, string[]> = {
  'papillomas': ['sycosis'], 'warts': ['sycosis'], 'condylomata': ['sycosis'],
  'gonorrhea': ['sycosis'], 'polyps': ['sycosis'],
  'tuberculosis': ['tubercular'], 'asthma': ['tubercular', 'psora'],
  'allergies': ['tubercular', 'psora'],
  'psoriasis': ['psora'], 'eczema': ['psora'], 'scabies': ['psora'],
  'cancer': ['cancer'], 'diabetes': ['sycosis'],
  'heart disease': ['syphilitic'], 'syphilis': ['syphilitic'],
  'ulcers': ['syphilitic'], 'alcoholism': ['syphilitic'],
  'depression': ['syphilitic'], 'bone disease': ['syphilitic'],
}

const MIASM_REMEDIES: Record<string, { nosode: string; keys: string[] }> = {
  'psora': { nosode: 'psor', keys: ['sulph', 'calc', 'lyc', 'graph', 'hep', 'petr', 'sil'] },
  'sycosis': { nosode: 'med', keys: ['thuj', 'nat-s', 'nit-ac', 'staph', 'arg-n'] },
  'syphilitic': { nosode: 'syph', keys: ['aur', 'merc', 'lach', 'plb', 'kali-i'] },
  'tubercular': { nosode: 'tub', keys: ['phos', 'calc-p', 'dros', 'iod', 'bac'] },
  'cancer': { nosode: 'carc', keys: ['con', 'ars', 'phyt', 'calc-f'] },
}

const NOSODES = new Set(['med', 'psor', 'tub', 'syph', 'carc', 'bac'])
const ACUTE_REMEDIES = new Set(['acon', 'bell', 'bry', 'cham', 'gels', 'ip', 'ferr-p', 'arn', 'apis', 'canth', 'verat', 'dros', 'spong'])
const CHRONIC_REMEDIES = new Set(['sulph', 'calc', 'lyc', 'nat-m', 'sep', 'sil', 'phos', 'graph', 'carc', 'med', 'psor', 'tub', 'bar-c', 'con'])

const REMEDY_AFFINITY: Record<string, string[]> = {
  'med': ['mind', 'generalities', 'sleep'], 'sulph': ['skin', 'generalities', 'stomach'],
  'nat-m': ['mind', 'head', 'generalities'], 'ign': ['mind', 'throat', 'head'],
  'sep': ['mind', 'female', 'generalities'], 'phos': ['mind', 'chest', 'generalities'],
  'acon': ['mind', 'fever', 'generalities'], 'bell': ['head', 'fever', 'throat'],
  'ars': ['generalities', 'stomach', 'mind'], 'lyc': ['stomach', 'generalities', 'mind'],
  'lach': ['throat', 'generalities', 'mind'], 'calc': ['generalities', 'head', 'extremities'],
  'puls': ['mind', 'generalities', 'stomach'], 'lac-c': ['throat', 'generalities', 'mind'],
  'petr': ['skin', 'generalities', 'stomach'], 'graph': ['skin', 'generalities', 'female'],
  'rhus-t': ['extremities', 'skin', 'generalities'], 'bry': ['chest', 'generalities', 'stomach'],
  'nux-v': ['stomach', 'mind', 'generalities'], 'cham': ['mind', 'stomach', 'ear'],
}

// Данные, загружаемые из Supabase при инициализации
export type MDRIData = {
  repertory: MDRIRepertoryRubric[]
  constellations: Record<string, MDRIConstellationData>
  polarities: Record<string, MDRIPolarityData>
  relationships: Record<string, MDRIRemedyRelationships>
  wordIndex: Map<string, number[]>
  constellationWordIndex: Map<string, [string, number, number][]>
  remedyRubricCount: Map<string, number>
  clinicalData?: MDRIClinicalData
}

/**
 * Построить индексы из загруженных данных
 */
export function buildIndices(
  repertory: MDRIRepertoryRubric[],
  constellations: Record<string, MDRIConstellationData>,
): { wordIndex: Map<string, number[]>; constellationWordIndex: Map<string, [string, number, number][]>; remedyRubricCount: Map<string, number> } {
  // Word index для реперториума
  const wordIndex = new Map<string, number[]>()
  const remedyRubricCount = new Map<string, number>()

  for (let i = 0; i < repertory.length; i++) {
    const r = repertory[i]
    const words = new Set(
      r.rubric.replace(/,/g, ' ').replace(/;/g, ' ')
        .split(' ')
        .map(w => w.toLowerCase().replace(/[.,;()]/g, ''))
        .filter(w => w.length > 2)
    )
    for (const w of words) {
      if (!wordIndex.has(w)) wordIndex.set(w, [])
      wordIndex.get(w)!.push(i)
    }
    for (const rem of r.remedies) {
      remedyRubricCount.set(rem.abbrev, (remedyRubricCount.get(rem.abbrev) ?? 0) + 1)
    }
  }

  // Constellation word index
  const constellationWordIndex = new Map<string, [string, number, number][]>()
  for (const [remedy, con] of Object.entries(constellations)) {
    if (!con.clusters) continue
    for (let ci = 0; ci < con.clusters.length; ci++) {
      const cluster = con.clusters[ci]
      for (let si = 0; si < (cluster.symptoms?.length ?? 0); si++) {
        const sym = cluster.symptoms[si]
        const words = new Set(sym.rubric.split(' ').map(w => w.toLowerCase()).filter(w => w.length > 2))
        for (const w of words) {
          if (!constellationWordIndex.has(w)) constellationWordIndex.set(w, [])
          constellationWordIndex.get(w)!.push([remedy, ci, si])
        }
      }
    }
  }

  return { wordIndex, constellationWordIndex, remedyRubricCount }
}

// === Consistency: boolean-логика вместо symMatch ===

// Извлечь структурированные данные из кейса (симптомы + модальности)
type CaseData = {
  thermal: 'chilly' | 'hot' | null
  modalities: Set<string>   // 'motion_agg', 'rest_agg', 'open_air_amel' и т.д.
  mentals: Set<string>      // 'grief', 'anxiety', 'irritability' и т.д.
  desires: Set<string>      // 'salt', 'sweets', 'sour' и т.д.
  aversions: Set<string>    // 'fat', 'milk' и т.д.
  thirst: string | null     // 'large', 'small_sips', 'thirstless'
  time: Set<string>         // 'worse_morning', 'worse_2_4am' и т.д.
  side: string | null       // 'right', 'left'
  sleep: Set<string>        // 'on_abdomen', 'after_sleep_worse'
  consolation: string | null // 'agg', 'amel'
  company: string | null     // 'desire', 'aversion'
  onset: string | null       // 'sudden', 'gradual'
  perspiration: Set<string>  // 'profuse', 'absent', 'feet', 'head'
  allRubrics: Set<string>    // все рубрики в lowercase для keynote matching
}

function extractCaseData(symptoms: MDRISymptom[], modalities: MDRIModality[]): CaseData {
  const rubrics = new Set<string>()
  const mentals = new Set<string>()
  const desires = new Set<string>()
  const aversions = new Set<string>()
  const mods = new Set<string>()
  const timeAgg = new Set<string>()
  const sleepData = new Set<string>()
  const perspData = new Set<string>()
  let thermal: 'chilly' | 'hot' | null = null
  let thirst: string | null = null
  let consolation: string | null = null
  let company: string | null = null
  let onset: string | null = null
  let side: string | null = null

  for (const s of symptoms) {
    if (!s.present) continue
    const r = s.rubric.toLowerCase()
    rubrics.add(r)

    // Thermal
    if (r.includes('chill') || r.includes('cold') || r.includes('froz')) thermal = 'chilly'
    if (r.includes('hot patient') || r.includes('hot ') || r.includes('warm agg')) thermal = 'hot'
    // Thirst
    if (r.includes('thirst') && r.includes('large')) thirst = 'large'
    if (r.includes('small sip') || r.includes('sip')) thirst = 'small_sips'
    if (r.includes('thirstless') || r.includes('no thirst')) thirst = 'thirstless'
    // Mental
    if (r.includes('grief')) mentals.add('grief')
    if (r.includes('anxiety')) mentals.add('anxiety')
    if (r.includes('irritab')) mentals.add('irritability')
    if (r.includes('jealous')) mentals.add('jealousy')
    if (r.includes('indifferen')) mentals.add('indifference')
    if (r.includes('restless')) mentals.add('restlessness')
    if (r.includes('weep') || r.includes('cry')) mentals.add('weeping')
    if (r.includes('fear') && r.includes('death')) mentals.add('fear_death')
    if (r.includes('fear') && r.includes('alone')) mentals.add('fear_alone')
    if (r.includes('fear') && r.includes('dark')) mentals.add('fear_dark')
    if (r.includes('fear') && r.includes('thunder')) mentals.add('fear_thunderstorm')
    if (r.includes('fear') && r.includes('height')) mentals.add('fear_heights')
    if (r.includes('anticipat')) mentals.add('anticipation')
    if (r.includes('sighing')) mentals.add('sighing')
    if (r.includes('suicid')) mentals.add('suicidal')
    if (r.includes('haughty') || r.includes('contempt')) mentals.add('haughtiness')
    if (r.includes('hurry') || r.includes('impatien')) mentals.add('hurry')
    if (r.includes('mood') && (r.includes('alter') || r.includes('chang'))) mentals.add('mood_alternating')
    if (r.includes('suppress') && (r.includes('anger') || r.includes('indignat'))) mentals.add('suppressed_anger')
    if (r.includes('humiliat')) mentals.add('humiliation')
    if (r.includes('secretiv')) mentals.add('secretive')
    if (r.includes('violen')) mentals.add('violence')
    if (r.includes('stammer')) mentals.add('stammering')
    // Desires
    if (r.includes('desire') && r.includes('salt')) desires.add('salt')
    if (r.includes('desire') && r.includes('sweet')) desires.add('sweets')
    if (r.includes('desire') && r.includes('sour')) desires.add('sour')
    if (r.includes('desire') && r.includes('fat')) desires.add('fat')
    if (r.includes('desire') && r.includes('egg')) desires.add('eggs')
    if (r.includes('desire') && r.includes('stimul')) desires.add('stimulants')
    if (r.includes('desire') && (r.includes('cold') && r.includes('drink'))) desires.add('cold_drinks')
    if (r.includes('desire') && (r.includes('warm') && r.includes('drink'))) desires.add('warm_drinks')
    if (r.includes('desire') && r.includes('vinegar')) desires.add('vinegar')
    if (r.includes('desire') && r.includes('juicy')) desires.add('juicy')
    // Aversions
    if (r.includes('aversion') && r.includes('fat')) aversions.add('fat')
    if (r.includes('aversion') && r.includes('milk')) aversions.add('milk')
    if (r.includes('aversion') && r.includes('fish')) aversions.add('fish')
    if (r.includes('aversion') && r.includes('bath')) aversions.add('bathing')
    // Modalities
    if (r.includes('motion') && r.includes('agg')) mods.add('motion_agg')
    if (r.includes('motion') && r.includes('amel')) mods.add('motion_amel')
    if (r.includes('rest') && r.includes('agg')) mods.add('rest_agg')
    if (r.includes('first motion') && r.includes('agg')) mods.add('first_motion_agg')
    if (r.includes('open air') && r.includes('amel')) mods.add('open_air_amel')
    if (r.includes('cold') && r.includes('amel')) mods.add('cold_amel')
    if (r.includes('cold') && r.includes('damp')) mods.add('cold_damp_agg')
    if (r.includes('pressure') && r.includes('amel')) mods.add('pressure_amel')
    if (r.includes('sea') && r.includes('amel')) mods.add('sea_amel')
    // Consolation
    if (r.includes('consolat') && r.includes('agg')) consolation = 'agg'
    if (r.includes('consolat') && r.includes('amel')) consolation = 'amel'
    // Company
    if (r.includes('company') && r.includes('desire')) company = 'desire'
    if (r.includes('company') && r.includes('aversion')) company = 'aversion'
    if (r.includes('alone') && !r.includes('fear')) company = 'aversion'
    // Onset
    if (r.includes('sudden')) onset = 'sudden'
    // Time
    if (r.includes('morning') && r.includes('agg')) timeAgg.add('worse_morning')
    if (r.includes('evening') && r.includes('agg')) timeAgg.add('worse_evening')
    if (r.includes('night') && r.includes('agg')) timeAgg.add('worse_night')
    if (r.includes('2') && r.includes('4') && (r.includes('am') || r.includes('night'))) timeAgg.add('worse_2_4am')
    if (r.includes('4') && r.includes('8') && r.includes('pm')) timeAgg.add('worse_4_8pm')
    if (r.includes('after sleep') && r.includes('worse')) timeAgg.add('after_sleep_worse')
    // Side
    if (r.includes('right') && r.includes('side')) side = 'right'
    if (r.includes('left') && r.includes('side')) side = 'left'
    // Sleep
    if (r.includes('abdomen') && r.includes('sleep')) sleepData.add('on_abdomen')
    if (r.includes('after sleep') && r.includes('worse')) sleepData.add('after_sleep_worse')
    // Perspiration
    if (r.includes('perspir') && r.includes('profuse')) perspData.add('profuse')
    if (r.includes('perspir') && r.includes('feet')) perspData.add('feet')
    if (r.includes('perspir') && r.includes('head')) perspData.add('head')
  }

  // Модальности из отдельного массива
  for (const m of modalities) {
    if (m.pairId === 'heat_cold') {
      if (m.value === 'agg') thermal = thermal ?? 'hot'
      else thermal = thermal ?? 'chilly'
    }
    if (m.pairId === 'motion_rest') {
      mods.add(m.value === 'agg' ? 'motion_agg' : 'motion_amel')
    }
    if (m.pairId === 'open_air') mods.add(m.value === 'amel' ? 'open_air_amel' : 'open_air_agg')
    if (m.pairId === 'sea') mods.add('sea_amel')
    if (m.pairId === 'consolation') consolation = m.value === 'agg' ? 'agg' : 'amel'
    if (m.pairId === 'company_alone') company = m.value === 'agg' ? 'aversion' : 'desire'
  }

  return { thermal, modalities: mods, mentals, desires, aversions, thirst, time: timeAgg, side, sleep: sleepData, consolation, company, onset, perspiration: perspData, allRubrics: rubrics }
}

// Проверить одно условие по данным кейса
function checkCondition(cond: ConsistencyCondition, caseData: CaseData): boolean {
  switch (cond.type) {
    case 'thermal': return caseData.thermal === cond.value
    case 'modality': return caseData.modalities.has(cond.value)
    case 'mental': return caseData.mentals.has(cond.value)
    case 'desire': return caseData.desires.has(cond.value)
    case 'aversion': return caseData.aversions.has(cond.value)
    case 'thirst': return caseData.thirst === cond.value
    case 'time': return caseData.time.has(cond.value)
    case 'side': return caseData.side === cond.value
    case 'sleep': return caseData.sleep.has(cond.value)
    case 'consolation': return caseData.consolation === cond.value
    case 'company': return caseData.company === cond.value
    case 'onset': return caseData.onset === cond.value
    case 'perspiration': return caseData.perspiration.has(cond.value)
    case 'keynote': return caseData.allRubrics.has(cond.value.toLowerCase())
    default: return false
  }
}

// Категория условия: modality > physical > mental/desire > keynote
// Сбалансировано: max/min ratio = 1.5x (не 3x)
const CONDITION_WEIGHT: Record<string, number> = {
  modality: 1.5,    // модальности — самый надёжный дифференциатор
  thermal: 1.2,     // physical/объективный
  thirst: 1.2,      // physical
  perspiration: 1.2, // physical
  sleep: 1.2,       // physical
  onset: 1.2,       // physical
  side: 1.2,        // physical
  desire: 1.0,      // general
  aversion: 1.0,    // general
  consolation: 1.0, // mental/behavioral
  company: 1.0,     // mental/behavioral
  mental: 1.0,      // mental
  time: 1.0,        // time
  keynote: 0.8,     // fallback — менее надёжно
}

function getConditionWeight(cond: ConsistencyCondition): number {
  return CONDITION_WEIGHT[cond.type] ?? 1
}

// Оценить consistency группу — additive scoring (сбалансированный)
// Core: +2 x category_weight за каждое совпадение
// Optional: +1 x category_weight за каждое
// Contradiction: -3 (mutual_exclusive) или -1.5 (weak)
function evaluateConsistency(
  caseData: CaseData,
  group: ConsistencyGroup,
  contradictions: Array<{ symptom_a: string; symptom_b: string; type: string }>,
): { score: number; coreScore: number; coreMatch: boolean } {

  // === Core scoring ===
  let corePoints = 0
  let coreMaxPoints = 0
  let coreMatchCount = 0
  const coreTotal = group.core.length

  for (const cond of group.core) {
    const w = getConditionWeight(cond)
    coreMaxPoints += 2 * w
    if (checkCondition(cond, caseData)) {
      corePoints += 2 * w
      coreMatchCount++
    }
  }

  const coreScore = coreTotal > 0 ? coreMatchCount / coreTotal : 0
  const coreMatch = coreTotal > 0 && coreMatchCount === coreTotal

  // === Optional scoring ===
  let optPoints = 0
  for (const cond of group.optional) {
    const w = getConditionWeight(cond)
    if (checkCondition(cond, caseData)) {
      optPoints += 1 * w
    }
  }

  // === Negative scoring — проверить contradictions ===
  let contradictionPenalty = 0
  // Собрать все значения из кейса для проверки
  const caseValues = new Set<string>()
  if (caseData.thermal) caseValues.add(caseData.thermal === 'chilly' ? 'chilly' : 'hot patient')
  if (caseData.consolation) caseValues.add(`consolation ${caseData.consolation}`)
  if (caseData.company) caseValues.add(`company ${caseData.company}`)
  if (caseData.thirst) caseValues.add(caseData.thirst === 'thirstless' ? 'thirstless' : `thirst ${caseData.thirst}`)
  for (const m of caseData.modalities) caseValues.add(m.replace('_', ' '))
  for (const m of caseData.mentals) caseValues.add(m.replace('_', ' '))

  // Собрать все значения из группы
  const groupValues = new Set<string>()
  for (const c of [...group.core, ...group.optional]) {
    groupValues.add(`${c.type}:${c.value}`)
  }

  // Проверить каждую contradiction pair
  for (const contr of contradictions) {
    const a = contr.symptom_a.toLowerCase()
    const b = contr.symptom_b.toLowerCase()
    // Если кейс имеет A, а группа ожидает B (или наоборот) → штраф
    const caseHasA = [...caseValues].some(v => v.includes(a))
    const caseHasB = [...caseValues].some(v => v.includes(b))
    const groupExpectsA = [...groupValues].some(v => v.includes(a))
    const groupExpectsB = [...groupValues].some(v => v.includes(b))

    if ((caseHasA && groupExpectsB) || (caseHasB && groupExpectsA)) {
      const penalty = contr.type === 'mutual_exclusive' ? 3 : 1.5
      contradictionPenalty += penalty
    }
  }

  // === Итоговый score ===
  const totalScore = corePoints + optPoints - contradictionPenalty

  return { score: totalScore, coreScore, coreMatch }
}

/**
 * Базовый Kent score — чистый grade × weight, без IDF и anti-domination
 */
function kentScoreBase(data: MDRIData, symptoms: MDRISymptom[], cache: Map<string, MDRIRepertoryRubric[]>): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const sym of symptoms) {
    if (!sym.present) continue
    const matches = findRubrics(data, sym.rubric, cache)
    for (const match of matches) {
      for (const rem of match.remedies) {
        scores[rem.abbrev] = (scores[rem.abbrev] ?? 0) + rem.grade * sym.weight
      }
    }
  }
  if (Object.keys(scores).length === 0) return scores

  // Нормализация
  const maxS = Math.max(...Object.values(scores))
  if (maxS === 0) return scores
  for (const k of Object.keys(scores)) {
    scores[k] /= maxS
  }
  return scores
}

/**
 * Основная функция анализа — динамическая система с приоритетами, 6 этапов
 */
export function analyze(
  data: MDRIData,
  symptoms: MDRISymptom[],
  modalities: MDRIModality[] = [],
  familyHistory: string[] = [],
  profile: MDRIPatientProfile = DEFAULT_PROFILE,
): MDRIResult[] {
  const rubricCache = new Map<string, MDRIRepertoryRubric[]>()

  // === Этап 0: Предварительный анализ ===
  const hasMentalSymptoms = symptoms.some(s => s.present && s.category === 'mental')
  const hasGeneralSymptoms = symptoms.some(s => s.present && s.category === 'general')
  const isAcute = symptoms.some(s => s.present && ['sudden onset', 'sudden'].includes(s.rubric.toLowerCase()))
  const isChronic = familyHistory.length > 0
  const presentSymptoms = symptoms.filter(s => s.present)
  const insufficientData = presentSymptoms.length < 3

  // === Этап 1: Глобальный фильтр противоречий ===
  const excluded = new Set<string>()       // полностью исключены
  const ceilingMap = new Map<string, number>() // максимальный score
  const penaltyMap = new Map<string, number>() // множитель

  // Critical: проверить sine_qua_non — если отсутствует → исключить препарат
  const absentRubrics = symptoms.filter(s => !s.present).map(s => s.rubric.toLowerCase())
  for (const [remedy, con] of Object.entries(data.constellations)) {
    if (!con.sine_qua_non?.length) continue
    for (const sqn of con.sine_qua_non) {
      if (absentRubrics.some(a => symMatch(a, sqn))) {
        excluded.add(remedy)
      }
    }
  }

  // Strong: excluders — если присутствует → ограничить потолок до 0.60
  const presentRubrics = presentSymptoms.map(s => s.rubric.toLowerCase())
  for (const [remedy, con] of Object.entries(data.constellations)) {
    if (excluded.has(remedy)) continue
    if (!con.excluders?.length) continue
    for (const excl of con.excluders) {
      if (presentRubrics.some(p => symMatch(p, excl))) {
        ceilingMap.set(remedy, 0.60)
      }
    }
  }

  // Weak: термические противоречия
  const isChilly = presentSymptoms.some(s => s.rubric.toLowerCase().includes('chill'))
  const isHot = presentSymptoms.some(s => ['hot patient', 'hot'].some(h => s.rubric.toLowerCase().includes(h)))
  const thermalData = data.clinicalData?.thermal_contradictions ?? {}
  if (isChilly || isHot) {
    for (const [remedy, thermal] of Object.entries(thermalData)) {
      if (excluded.has(remedy)) continue
      // Зябкий пациент + жаркий препарат → штраф
      if (isChilly && thermal === 'hot') {
        penaltyMap.set(remedy, (penaltyMap.get(remedy) ?? 1) * 0.85)
      }
      // Жаркий пациент + зябкий препарат → штраф
      if (isHot && thermal === 'chilly') {
        penaltyMap.set(remedy, (penaltyMap.get(remedy) ?? 1) * 0.85)
      }
    }
  }

  // === Этап 2: Базовый Kent (без усилений) ===
  const baseKent = kentScoreBase(data, symptoms, rubricCache)
  // Убрать исключённые
  for (const rem of excluded) delete baseKent[rem]
  // Отсечь слабых — score < 10% от max
  const maxBase = Math.max(...Object.values(baseKent), 0)
  if (maxBase > 0) {
    for (const [rem, score] of Object.entries(baseKent)) {
      if (score < maxBase * 0.10) delete baseKent[rem]
    }
  }

  // === Этап 3: Доминирование — Иерархия ===
  // Пересчёт Kent с IDF + anti-domination
  const kentFull = kentScore(data, symptoms, rubricCache)
  const hierarchyScores = hierarchyScore(data, symptoms, rubricCache)
  // Комбинация: 0.4 × kentFull + 0.6 × hierarchy — только для кандидатов из этапа 2
  const kentHierarchy: Record<string, number> = {}
  for (const rem of Object.keys(baseKent)) {
    if (excluded.has(rem)) continue
    const kf = kentFull[rem] ?? 0
    const hs = hierarchyScores[rem] ?? 0
    kentHierarchy[rem] = 0.4 * kf + 0.6 * hs
  }

  // === Этап 4: Constellation + Consistency (additive boolean-логика) ===
  const conScores = constellationScore(data, symptoms)
  const consistencyGroupsList = data.clinicalData?.consistency_groups ?? []

  // Извлечь структурированные данные из кейса (один раз)
  const caseData = extractCaseData(symptoms, modalities)

  // Загрузить contradictions для negative scoring
  // (из clinicalData — загружены в data-loader, но формат старый, парсим здесь)
  const contradictionPairs: Array<{ symptom_a: string; symptom_b: string; type: string }> = []
  // contradictions хранятся в Supabase, но для consistency достаточно thermal_contradictions
  // Для полных — нужно загружать отдельно. Пока используем thermal + inline
  if (caseData.thermal) {
    const thermalContr = data.clinicalData?.thermal_contradictions ?? {}
    // Не добавляем как contradictions — thermal уже обработан в Этапе 1
  }

  // Рассчитать consistency (additive, без symMatch)
  const conAdjusted: Record<string, number> = {}
  // Найти max consistency для нормализации
  let maxConsistencyScore = 0

  for (const rem of Object.keys(baseKent)) {
    if (excluded.has(rem)) continue
    const rawCon = conScores[rem] ?? 0

    const group = consistencyGroupsList.find(g => g.remedy === rem)
    let consistencyAdd = 0

    if (group) {
      const { score, coreScore, coreMatch } = evaluateConsistency(caseData, group, contradictionPairs)

      if (score > 0) {
        // Нормализуем позже — пока абсолютные баллы
        consistencyAdd = score
        maxConsistencyScore = Math.max(maxConsistencyScore, score)
      }
    }

    conAdjusted[rem] = rawCon + (consistencyAdd > 0 ? consistencyAdd : 0)
  }

  // Нормализовать consistency к диапазону 0-0.15 (additive к rawCon 0-1)
  if (maxConsistencyScore > 0) {
    for (const rem of Object.keys(conAdjusted)) {
      const rawCon = conScores[rem] ?? 0
      const conAdd = conAdjusted[rem] - rawCon
      if (conAdd > 0) {
        conAdjusted[rem] = rawCon + (conAdd / maxConsistencyScore) * 0.15
      }
    }
  }

  // === Этап 5: Polarity (только при близких top-2) ===
  // Предварительный score для определения, нужна ли polarity
  const prelimScores: [string, number][] = []
  for (const rem of Object.keys(baseKent)) {
    if (excluded.has(rem)) continue
    const kh = kentHierarchy[rem] ?? 0
    const ca = conAdjusted[rem] ?? 0
    prelimScores.push([rem, 0.35 * kh + 0.45 * ca])
  }
  prelimScores.sort((a, b) => b[1] - a[1])

  let polarityApplied = false
  let polScores: Record<string, number> = {}
  if (prelimScores.length >= 2) {
    const top1Score = prelimScores[0][1]
    const top2Score = prelimScores[1][1]
    // Если разница < 10% → применить polarity
    if (top1Score > 0 && (top1Score - top2Score) / top1Score < 0.10) {
      polScores = polarityScore(data, modalities)
      polarityApplied = true
    }
  }

  // === Этап 6: Miasm (только chronic) ===
  let miasmApplied = false
  let mScores: Record<string, number> = {}
  let dominantMiasm = ''
  if (isChronic && familyHistory.length > 0) {
    const [ms, dm] = miasmScore(familyHistory)
    mScores = ms
    dominantMiasm = dm
    miasmApplied = Object.keys(mScores).length > 0
  }

  // === Финальный scoring ===
  // Динамические веса в зависимости от того, какие этапы применились
  let wKentHierarchy = 0.35
  let wConstellation = 0.45
  let wPolarity = polarityApplied ? 0.10 : 0
  let wMiasm = miasmApplied ? 0.10 : 0

  // Если polarity/miasm не применяются — перераспределить веса
  const unusedWeight = (polarityApplied ? 0 : 0.10) + (miasmApplied ? 0 : 0.10)
  wKentHierarchy += unusedWeight * 0.40
  wConstellation += unusedWeight * 0.60

  const results: MDRIResult[] = []
  for (const rem of Object.keys(baseKent)) {
    if (excluded.has(rem)) continue

    const kh = kentHierarchy[rem] ?? 0
    const ca = conAdjusted[rem] ?? 0
    const pol = polScores[rem] ?? 0.35
    const mi = mScores[rem] ?? 0

    let total = wKentHierarchy * kh + wConstellation * ca

    if (polarityApplied) {
      total += wPolarity * pol
    }
    if (miasmApplied) {
      // Miasm НЕ МОЖЕТ сделать top-1 из ничего — только усилить нозод в top-5
      if (NOSODES.has(rem) && mi > 0) {
        total += wMiasm * mi * 1.2
      } else {
        total += wMiasm * mi
      }
    }

    // Acute/Chronic контекст
    if (isAcute && CHRONIC_REMEDIES.has(rem)) {
      total *= 0.85
    } else if (isChronic && ACUTE_REMEDIES.has(rem)) {
      total *= 0.85
    }

    // Remedy Affinity
    if (REMEDY_AFFINITY[rem]) {
      const patientChapters = getPatientChapters(symptoms)
      const affinityChapters = new Set(REMEDY_AFFINITY[rem])
      let overlap = 0
      for (const ch of patientChapters) {
        if (affinityChapters.has(ch)) overlap++
      }
      if (overlap >= 2) total *= 1.05
      else if (overlap >= 1) total *= 1.02
    }

    // Применить ceiling и penalty из Этапа 1
    const ceil = ceilingMap.get(rem)
    if (ceil !== undefined) {
      total = Math.min(total, ceil)
    }
    const pen = penaltyMap.get(rem)
    if (pen !== undefined) {
      total *= pen
    }

    // Уверенность
    let confidence: MDRIResult['confidence']
    if (insufficientData) {
      confidence = total < 0.50 ? 'insufficient' : 'low'
    } else {
      confidence = total >= 0.80 ? 'high' : total >= 0.60 ? 'medium' : total >= 0.40 ? 'low' : 'insufficient'
    }

    const name = data.constellations[rem]?.name ?? rem
    const isNosode = NOSODES.has(rem)
    const potency = selectPotency(profile, total * 100, isNosode)

    // Линзы для отображения
    const s1 = kentFull[rem] ?? 0
    const s3 = hierarchyScores[rem] ?? 0
    const s4 = conScores[rem] ?? 0
    const s2 = polScores[rem] ?? 0
    const s7 = mScores[rem] ?? 0

    results.push({
      remedy: rem,
      remedyName: name,
      totalScore: Math.round(total * 100),
      confidence,
      lenses: [
        { name: 'Kent', score: Math.round(s1 * 100), details: `${Math.round(s1 * 100)}%` },
        { name: 'Polarity', score: Math.round(s2 * 100), details: polarityApplied ? `${Math.round(s2 * 100)}%` : 'н/п' },
        { name: 'Hierarchy', score: Math.round(s3 * 100), details: `${Math.round(s3 * 100)}%` },
        { name: 'Constellation', score: Math.round(s4 * 100), details: `${Math.round(s4 * 100)}%` },
        { name: 'Consistency', score: Math.round((conAdjusted[rem] ?? 0) * 100), details: `${Math.round((conAdjusted[rem] ?? 0) * 100)}%` },
        { name: 'Miasm', score: Math.round(s7 * 100), details: miasmApplied ? `${Math.round(s7 * 100)}% (${dominantMiasm})` : '-' },
      ],
      potency,
      miasm: dominantMiasm || null,
      relationships: data.relationships[rem] ?? null,
      differential: null,
    })
  }

  results.sort((a, b) => b.totalScore - a.totalScore)

  // Differential — если разница между 1-м и 2-м < 8%
  if (results.length >= 2) {
    const diff = results[0].totalScore - results[1].totalScore
    if (diff < 8 && results[0].totalScore > 30) {
      const r1 = results[0].remedy
      const r2 = results[1].remedy
      const c1 = data.constellations[r1]
      const c2 = data.constellations[r2]

      let q = ''
      if (c1?.sine_qua_non?.length) {
        q = `Есть ли: ${c1.sine_qua_non[0]}? → подтвердит ${results[0].remedyName}`
      } else if (c2?.excluders?.length) {
        q = `Есть ли: ${c2.excluders[0]}? → исключит ${results[1].remedyName}`
      }

      results[0].differential = {
        rivalRemedy: results[1].remedy,
        rivalScore: results[1].totalScore,
        differentiatingQuestion: q || `Уточните симптомы для различения ${r1} и ${r2}`,
      }
    }
  }

  return results.slice(0, 10)
}

// =============================================================================
// PIPELINE v1: Filter → Selection → Ranking
// Новая архитектура. analyze() сохранена для сравнения.
// =============================================================================

/**
 * Подсчитать coverage: в скольких симптомах пациента найден каждый препарат
 */
function computeCoverage(
  data: MDRIData,
  symptoms: MDRISymptom[],
  cache: Map<string, MDRIRepertoryRubric[]>,
): Map<string, { covered: number; total: number; rubrics: string[] }> {
  const present = symptoms.filter(s => s.present)
  const total = present.length
  // Для каждого препарата — в скольких симптомах он найден
  const remedyCoverage = new Map<string, Set<number>>() // remedy → set of symptom indices
  const remedyRubrics = new Map<string, string[]>()

  for (let i = 0; i < present.length; i++) {
    const matches = findRubrics(data, present[i].rubric, cache)
    for (const match of matches) {
      for (const rem of match.remedies) {
        if (!remedyCoverage.has(rem.abbrev)) {
          remedyCoverage.set(rem.abbrev, new Set())
          remedyRubrics.set(rem.abbrev, [])
        }
        remedyCoverage.get(rem.abbrev)!.add(i)
        remedyRubrics.get(rem.abbrev)!.push(match.rubric)
      }
    }
  }

  const result = new Map<string, { covered: number; total: number; rubrics: string[] }>()
  for (const [rem, indices] of remedyCoverage) {
    result.set(rem, {
      covered: indices.size,
      total,
      rubrics: remedyRubrics.get(rem) ?? [],
    })
  }
  return result
}

/**
 * Pipeline v1: Filter → Selection → Ranking
 *
 * Filter:    бинарное отсечение по модальностям/термике (3096 → ~500)
 * Selection: кто покрывает ≥ 40% симптомов (500 → 20-50)
 * Ranking:   текущий scoring среди кандидатов
 */
export function analyzePipeline(
  data: MDRIData,
  symptoms: MDRISymptom[],
  modalities: MDRIModality[] = [],
  familyHistory: string[] = [],
  profile: MDRIPatientProfile = DEFAULT_PROFILE,
): MDRIResult[] {
  const rubricCache = new Map<string, MDRIRepertoryRubric[]>()
  const presentSymptoms = symptoms.filter(s => s.present)
  const insufficientData = presentSymptoms.length < 3

  // Извлечь структурированные данные кейса
  const caseData = extractCaseData(symptoms, modalities)

  // ===================================================================
  // STAGE 1: FILTER — бинарное отсечение
  // Вход: все 3096 препаратов
  // Выход: Set<excluded> (препараты которые ТОЧНО не подходят)
  // ===================================================================
  const excluded = new Set<string>()

  // Правило: если данных мало (< 3 симптома) — НЕ фильтруем
  if (!insufficientData) {
    // 1a. Термика: зябкий пациент → убрать жаркие
    if (caseData.thermal === 'chilly') {
      const hotRemedies = data.clinicalData?.thermal_contradictions ?? {}
      for (const [rem, t] of Object.entries(hotRemedies)) {
        if (t === 'hot') excluded.add(rem)
      }
    }
    if (caseData.thermal === 'hot') {
      const chillyRemedies = data.clinicalData?.thermal_contradictions ?? {}
      for (const [rem, t] of Object.entries(chillyRemedies)) {
        if (t === 'chilly') excluded.add(rem)
      }
    }

    // 1b. Жажда: жаждущий → убрать безжаждные, и наоборот
    // (пока мягко — через sine_qua_non)

    // 1c. Consolation: agg → убрать amel-препараты, и наоборот
    // Через sine_qua_non contradictions
    if (caseData.consolation === 'agg') {
      // Препараты с sine_qua_non "consolation amel" → excluded
      for (const [rem, con] of Object.entries(data.constellations)) {
        if (con.sine_qua_non?.some(s => s.includes('consolation') && s.includes('amel'))) {
          excluded.add(rem)
        }
      }
    }
    if (caseData.consolation === 'amel') {
      for (const [rem, con] of Object.entries(data.constellations)) {
        if (con.sine_qua_non?.some(s => s.includes('consolation') && s.includes('agg'))) {
          excluded.add(rem)
        }
      }
    }

    // 1d. Motion: agg → убрать amel, и наоборот
    if (caseData.modalities.has('motion_agg')) {
      for (const [rem, con] of Object.entries(data.constellations)) {
        if (con.sine_qua_non?.some(s => s.includes('motion') && s.includes('amel'))) {
          excluded.add(rem)
        }
      }
    }
    if (caseData.modalities.has('motion_amel')) {
      for (const [rem, con] of Object.entries(data.constellations)) {
        if (con.sine_qua_non?.some(s => s.includes('motion') && s.includes('agg'))) {
          excluded.add(rem)
        }
      }
    }

    // 1e. Excluders из constellations
    const presentRubrics = presentSymptoms.map(s => s.rubric.toLowerCase())
    for (const [rem, con] of Object.entries(data.constellations)) {
      if (excluded.has(rem)) continue
      if (con.excluders?.length) {
        for (const excl of con.excluders) {
          if (presentRubrics.some(p => symMatch(p, excl))) {
            excluded.add(rem)
          }
        }
      }
    }
  }

  // ===================================================================
  // STAGE 2: SELECTION v4 — простая и устойчивая
  //
  // 2 уровня: CHARACTERISTIC (решающие) vs COMMON (подтверждающие)
  // 3 правила входа
  // ===================================================================

  // --- Классификация: CHARACTERISTIC vs COMMON ---
  //
  // CHARACTERISTIC = симптом который СУЖАЕТ выбор (дифференцирует):
  //   - модальности (agg/amel, worse/better)
  //   - термика (chilly, hot)
  //   - жажда (thirst, thirstless)
  //   - characteristic mental (weight >= 2)
  //   - peculiar / strange (weight = 3)
  //   - consolation, company (полярные)
  //   - desire/aversion
  //   - time aggravation (2-4am, 4-8pm, after sleep)
  //   - laterality (right/left)
  //   - sleep position
  //
  // COMMON = симптом который НЕ сужает (есть у многих):
  //   - headache, nausea, weakness, cough, pain, fever...

  // Внутренний вес characteristic симптома:
  //   3 = peculiar (w=3) — редкий/странный, самый ценный
  //   2 = strong mental (w>=2) — выраженный ментальный
  //   1 = модальности, термика, жажда, desire и т.д. — базовый
  //   0 = common (не characteristic)
  const charWeight = (s: MDRISymptom): number => {
    const r = s.rubric.toLowerCase()

    // Вес 3: peculiar — самый ценный (странный, редкий, необычный)
    if (s.weight >= 3) return 3
    // Вес 2: strong mental
    if (s.category === 'mental' && s.weight >= 2) return 2

    // Вес 1: модальности
    if (r.includes('agg') || r.includes('amel') || r.includes('worse') || r.includes('better')) return 1
    if (r.includes('first motion') || r.includes('rest agg') || r.includes('rest amel')) return 1
    // Термика
    if (r.includes('chill') || r.includes('hot patient') || r.includes('froz')) return 1
    // Жажда
    if (r.includes('thirst') || r.includes('thirstless')) return 1
    // Consolation, company
    if (r.includes('consolat') || r.includes('company')) return 1
    // Desire/aversion
    if (r.includes('desire') || r.includes('aversion')) return 1
    // Time
    if (r.includes('after sleep')) return 1
    if (r.includes('2') && r.includes('4') && (r.includes('am') || r.includes('night'))) return 1
    if (r.includes('4') && r.includes('8') && r.includes('pm')) return 1
    // Side
    if (r.includes('right side') || r.includes('left side')) return 1
    // Sleep position
    if (r.includes('sleep') && (r.includes('position') || r.includes('abdomen'))) return 1

    // Вес 0: common
    return 0
  }

  // --- Подсчёт hits для каждого препарата ---
  const coverage = computeCoverage(data, symptoms, rubricCache)
  const candidates = new Set<string>()

  const remedyCharHits = new Map<string, number>()
  const remedyCommonHits = new Map<string, number>()
  const remedyCommonDomains = new Map<string, Set<string>>()

  for (let i = 0; i < presentSymptoms.length; i++) {
    const sym = presentSymptoms[i]
    const cw = charWeight(sym)
    const domain = sym.category // mind / general / particular
    const matches = findRubrics(data, sym.rubric, rubricCache)

    for (const match of matches) {
      for (const rem of match.remedies) {
        if (excluded.has(rem.abbrev)) continue

        if (cw > 0) {
          // Weighted: peculiar/strong mental = 2, остальные characteristic = 1
          remedyCharHits.set(rem.abbrev, (remedyCharHits.get(rem.abbrev) ?? 0) + cw)
        } else {
          remedyCommonHits.set(rem.abbrev, (remedyCommonHits.get(rem.abbrev) ?? 0) + 1)
          if (!remedyCommonDomains.has(rem.abbrev)) remedyCommonDomains.set(rem.abbrev, new Set())
          remedyCommonDomains.get(rem.abbrev)!.add(domain)
        }
      }
    }
  }

  // --- 3 правила ---
  const allRemedies = new Set([...remedyCharHits.keys(), ...remedyCommonHits.keys()])

  for (const rem of allRemedies) {
    if (excluded.has(rem)) continue
    const charHits = remedyCharHits.get(rem) ?? 0
    const commonHits = remedyCommonHits.get(rem) ?? 0
    const commonDomains = remedyCommonDomains.get(rem)?.size ?? 0

    // Rule 1: ≥1 characteristic + ≥1 common → candidate
    // Усиление: characteristic должен быть весомым (≥2) ИЛИ подтверждён general рубрикой
    if (charHits >= 1 && commonHits >= 1) {
      if (charHits >= 2) {
        // Сильный characteristic (strong mental или peculiar, или 2+ base) — пропускаем
        candidates.add(rem)
        continue
      }
      // charHits = 1 (один base) — нужно подтверждение через general
      const cov = coverage.get(rem)
      const hasGeneral = cov?.rubrics.some(r => {
        const rl = r.toLowerCase()
        return rl.startsWith('generalities') || rl.startsWith('mind') || rl.startsWith('sleep')
      }) ?? false
      if (hasGeneral) {
        candidates.add(rem)
        continue
      }
      // Один слабый characteristic + common без general → не пропускаем
    }

    // Rule 2: ≥2 characteristic (без common) → candidate
    // Защита: если набрано одним peculiar (3) — нужно подтверждение (≥1 common или ≥1 general)
    if (charHits >= 2) {
      // Проверить: это 2+ реальных симптома или один peculiar?
      // Если commonHits > 0 — есть подтверждение, пропускаем
      // Если charHits >= 3 — точно 2+ реальных (peculiar=3 + base=1, или 3 base)
      // Единственный опасный случай: charHits = 2 или 3 от ОДНОГО peculiar (w=3) без common
      if (commonHits >= 1 || charHits >= 4) {
        candidates.add(rem)
        continue
      }
      // Один peculiar без подтверждения — проверить есть ли general category
      const cov = coverage.get(rem)
      const hasGeneral = cov?.rubrics.some(r => {
        const rl = r.toLowerCase()
        return rl.startsWith('generalities') || rl.startsWith('mind') || rl.startsWith('sleep')
      }) ?? false
      if (hasGeneral) {
        candidates.add(rem)
        continue
      }
      // Нет подтверждения — не пропускаем
    }

    // Rule 3: ≥4 common из ≥2 domains → candidate
    // Много подтверждающих из разных областей (mind + particular, или general + particular)
    if (commonHits >= 4 && commonDomains >= 2) {
      candidates.add(rem)
      continue
    }
  }

  // Гарантировать минимум 10 кандидатов
  if (candidates.size < 10) {
    const sorted = [...coverage.entries()]
      .filter(([rem]) => !excluded.has(rem))
      .sort((a, b) => b[1].covered - a[1].covered)
    for (const [rem] of sorted) {
      candidates.add(rem)
      if (candidates.size >= 20) break
    }
  }

  // ===================================================================
  // STAGE 3: RANKING — текущий scoring среди кандидатов
  // Вход: 20-50 кандидатов
  // Выход: top-10 с баллами
  // Используем СУЩЕСТВУЮЩУЮ логику scoring (kentFull + hierarchy + constellation)
  // но ТОЛЬКО для кандидатов из Stage 2
  // ===================================================================
  const isChronic = familyHistory.length > 0
  const isAcute = symptoms.some(s => s.present && ['sudden onset', 'sudden'].includes(s.rubric.toLowerCase()))

  // Kent (с IDF и anti-domination) — только для кандидатов
  const kentFull = kentScore(data, symptoms, rubricCache)
  const hierarchyScores = hierarchyScore(data, symptoms, rubricCache)
  const conScores = constellationScore(data, symptoms)

  // Coverage bonus — НОВОЕ: препарат покрывающий больше симптомов получает бонус
  const maxCoverage = Math.max(...[...coverage.values()].map(c => c.covered), 1)

  // Polarity и Miasm
  const polScores = polarityScore(data, modalities)
  let mScores: Record<string, number> = {}
  let dominantMiasm = ''
  if (isChronic && familyHistory.length > 0) {
    const [ms, dm] = miasmScore(familyHistory)
    mScores = ms
    dominantMiasm = dm
  }

  const results: MDRIResult[] = []
  for (const rem of candidates) {
    const kf = kentFull[rem] ?? 0
    const hs = hierarchyScores[rem] ?? 0
    const cs = conScores[rem] ?? 0
    const pol = polScores[rem] ?? 0.35
    const mi = mScores[rem] ?? 0
    const cov = coverage.get(rem)
    const coverageRatio = cov ? cov.covered / Math.max(cov.total, 1) : 0
    const coverageBonus = coverageRatio * 0.20 // до +0.20 за полное покрытие

    // Ranking formula (временная — текущий scoring + coverage bonus)
    let total = 0.30 * (0.4 * kf + 0.6 * hs) // kent+hierarchy
      + 0.35 * cs                              // constellation
      + 0.15 * pol                             // polarity
      + coverageBonus                          // НОВОЕ: coverage bonus

    if (isChronic && mi > 0) {
      total += 0.10 * mi
    }

    // Acute/Chronic
    if (isAcute && CHRONIC_REMEDIES.has(rem)) total *= 0.90
    if (isChronic && ACUTE_REMEDIES.has(rem)) total *= 0.90

    // Confidence
    let confidence: MDRIResult['confidence']
    if (insufficientData) {
      confidence = total < 0.50 ? 'insufficient' : 'low'
    } else {
      confidence = total >= 0.80 ? 'high' : total >= 0.60 ? 'medium' : total >= 0.40 ? 'low' : 'insufficient'
    }

    const name = data.constellations[rem]?.name ?? rem
    const isNosode = NOSODES.has(rem)
    const potency = selectPotency(profile, total * 100, isNosode)

    results.push({
      remedy: rem,
      remedyName: name,
      totalScore: Math.round(total * 100),
      confidence,
      lenses: [
        { name: 'Kent', score: Math.round(kf * 100), details: `${Math.round(kf * 100)}%` },
        { name: 'Coverage', score: Math.round(coverageRatio * 100), details: `${cov?.covered ?? 0}/${cov?.total ?? 0}` },
        { name: 'Hierarchy', score: Math.round(hs * 100), details: `${Math.round(hs * 100)}%` },
        { name: 'Constellation', score: Math.round(cs * 100), details: `${Math.round(cs * 100)}%` },
        { name: 'Polarity', score: Math.round(pol * 100), details: `${Math.round(pol * 100)}%` },
        { name: 'Miasm', score: Math.round(mi * 100), details: mi > 0 ? `${Math.round(mi * 100)}% (${dominantMiasm})` : '-' },
      ],
      potency,
      miasm: dominantMiasm || null,
      relationships: data.relationships[rem] ?? null,
      differential: null,
    })
  }

  results.sort((a, b) => b.totalScore - a.totalScore)

  // Differential
  if (results.length >= 2) {
    const diff = results[0].totalScore - results[1].totalScore
    if (diff < 8 && results[0].totalScore > 30) {
      results[0].differential = {
        rivalRemedy: results[1].remedy,
        rivalScore: results[1].totalScore,
        differentiatingQuestion: `Уточните симптомы для различения ${results[0].remedy} и ${results[1].remedy}`,
      }
    }
  }

  return results.slice(0, 10)
}

// --- Вспомогательные функции ---

function getWeights(hasMiasm: boolean) {
  if (hasMiasm) {
    return { kent: 0.112, polarity: 0.094, hierarchy: 0.096, constellation: 0.26, negative: 0.096, outcome: 0.048, miasm: 0.202 }
  }
  return { kent: 0.14, polarity: 0.134, hierarchy: 0.12, constellation: 0.26, negative: 0.096, outcome: 0.048, miasm: 0.061 }
}

// Semantic mapping: клинический термин → точные рубрики реперториума
// Один симптом → несколько возможных рубрик, приоритет generals/mental/modalities
const SEMANTIC_MAP: Record<string, string[]> = {
  // Термика
  'chilly': ['generalities, cold, agg', 'generalities, warm, amel', 'generalities, cold, tendency to take'],
  'hot patient': ['generalities, heat, agg', 'generalities, warm, agg', 'generalities, cold, amel'],
  'cold agg': ['generalities, cold, agg'],
  'heat agg': ['generalities, heat, agg', 'generalities, warm, agg'],
  'cold amel': ['generalities, cold, amel'],
  'cold damp agg': ['generalities, cold, wet weather, agg', 'generalities, wet, agg'],
  // Жажда
  'thirstless': ['stomach, thirstless', 'stomach, thirst, absent'],
  'thirst large': ['stomach, thirst, large quantities', 'stomach, thirst, extreme'],
  'thirst small sips': ['stomach, thirst, small quantities', 'stomach, thirst, sip'],
  'thirst cold': ['stomach, thirst, cold drinks', 'stomach, desires, cold drinks'],
  // Модальности движения
  'motion agg': ['generalities, motion, agg', 'generalities, motion, aversion to'],
  'motion amel': ['generalities, motion, amel', 'generalities, motion, desire for'],
  'first motion agg': ['generalities, motion, beginning of, agg', 'generalities, motion, agg, beginning'],
  'rest agg': ['generalities, rest, agg'],
  // Модальности позиции
  'lies still': ['generalities, lying, amel', 'generalities, motion, agg'],
  'sleep abdomen': ['sleep, position, abdomen, on', 'sleep, position, stomach'],
  'sleep position abdomen': ['sleep, position, abdomen, on'],
  // Время
  'worse after sleep': ['sleep, after, agg', 'generalities, sleep, after, agg'],
  'worse morning': ['generalities, morning, agg'],
  'worse night': ['generalities, night, agg'],
  'worse 2-4am': ['generalities, night, 2 a.m.', 'generalities, night, 3 a.m.'],
  'worse 4-8pm': ['generalities, afternoon, 4 p.m.', 'generalities, evening'],
  // Consolation
  'consolation agg': ['mind, consolation, agg', 'mind, consolation, aversion to'],
  'consolation amel': ['mind, consolation, amel'],
  // Company
  'company desire': ['mind, company, desire for', 'mind, company, amel'],
  'company aversion': ['mind, company, aversion to', 'mind, solitude, desire for'],
  'desire company': ['mind, company, desire for'],
  // Mental
  'grief suppressed': ['mind, grief, silent', 'mind, ailments from, grief'],
  'grief acute': ['mind, grief', 'mind, ailments from, grief'],
  'anxiety': ['mind, anxiety', 'mind, anxiety, health, about'],
  'anxiety anticipation': ['mind, anticipation', 'mind, anxiety, anticipation'],
  'anxiety health': ['mind, anxiety, health, about', 'mind, hypochondria'],
  'fear death': ['mind, fear, death', 'mind, death, fear of'],
  'fear alone': ['mind, fear, alone, of being', 'mind, company, desire for'],
  'fear dark': ['mind, fear, dark', 'mind, darkness, agg'],
  'fear thunderstorm': ['mind, fear, thunderstorm', 'mind, sensitive, noise, thunder'],
  'fear heights': ['mind, fear, high places', 'mind, vertigo, high places'],
  'fear water': ['mind, fear, water', 'mind, hydrophobia'],
  'irritability': ['mind, irritability', 'mind, anger'],
  'jealousy': ['mind, jealousy', 'mind, envy'],
  'loquacity': ['mind, loquacity', 'mind, talking, excessive'],
  'restlessness': ['mind, restlessness', 'mind, restlessness, anxious'],
  'weeping easily': ['mind, weeping', 'mind, weeping, easily'],
  'weeping alone': ['mind, weeping, alone, when', 'mind, grief, silent'],
  'indifference': ['mind, indifference', 'mind, indifference, loved ones, to'],
  'indifference family': ['mind, indifference, loved ones, to', 'mind, indifference, children, to her'],
  'sighing': ['mind, sighing', 'respiration, sighing'],
  'mood alternating': ['mind, mood, alternating', 'mind, mood, changeable'],
  'suicidal': ['mind, suicidal disposition', 'mind, death, desires'],
  'suppressed anger': ['mind, ailments from, anger, suppressed', 'mind, indignation'],
  'humiliation': ['mind, ailments from, mortification', 'mind, ailments from, humiliation'],
  'haughtiness': ['mind, haughtiness', 'mind, contemptuous'],
  'secretive': ['mind, secretive', 'mind, reserved'],
  'violence': ['mind, rage', 'mind, violent'],
  'hurry': ['mind, hurry', 'mind, impatience'],
  'timidity': ['mind, timidity', 'mind, bashful'],
  'sympathy': ['mind, sympathy', 'mind, compassion'],
  // Desire/Aversion
  'desire salt': ['generalities, food, salt, desire', 'stomach, desires, salt things'],
  'desire sweets': ['generalities, food, sweets, desire', 'stomach, desires, sweets'],
  'desire sour': ['generalities, food, sour, desire', 'stomach, desires, sour, acids'],
  'desire stimulants': ['stomach, desires, stimulants', 'stomach, desires, coffee', 'stomach, desires, alcohol'],
  'desire eggs': ['stomach, desires, eggs', 'generalities, food, eggs, desire'],
  'aversion fish': ['stomach, aversion, fish'],
  'aversion bathing': ['generalities, bathing, aversion to', 'mind, washing, aversion to'],
  // Perspiration
  'perspiration feet': ['extremities, perspiration, foot', 'extremities, perspiration, foot, offensive'],
  'perspiration profuse': ['perspiration, profuse', 'generalities, perspiration, profuse'],
  'cold sweat forehead': ['face, perspiration, cold', 'face, perspiration, forehead'],
  'head sweating': ['head, perspiration', 'head, perspiration, sleep, during'],
  // Particulars (частые)
  'headache': ['head, pain'],
  'nausea': ['stomach, nausea'],
  'burning urination': ['bladder, urination, burning', 'urethra, pain, burning'],
  'splinter pain': ['generalities, pain, splinter, as from a', 'throat, pain, splinter, as from a'],
  'stinging pain': ['generalities, pain, stinging', 'skin, pain, stinging'],
  'stitching pains': ['generalities, pain, stitching', 'chest, pain, stitching'],
  'throbbing': ['generalities, pulsation', 'head, pain, pulsating'],
  'dilated pupils': ['eye, pupils, dilated'],
  'salivation': ['mouth, salivation', 'mouth, salivation, profuse'],
  'offensive breath': ['mouth, odor, offensive', 'mouth, breath, offensive'],
  'vertigo turning': ['vertigo, turning', 'vertigo, motion, head, of'],
  'dry cough': ['cough, dry'],
  'whooping cough': ['cough, whooping', 'cough, paroxysmal'],
  'hemorrhage': ['generalities, hemorrhage', 'generalities, blood, loss of'],
  'bruised feeling': ['generalities, pain, sore, bruised', 'generalities, injuries, bruises'],
  'warts': ['skin, warts', 'skin, excrescences'],
  'cracks skin': ['skin, cracks', 'skin, eruptions, cracks'],
  'eczema': ['skin, eruptions, eczema'],
  'suppuration': ['generalities, suppuration', 'skin, suppuration'],
  'collapse': ['generalities, faintness', 'generalities, weakness, sudden'],
  'paralysis': ['generalities, paralysis', 'extremities, paralysis'],
  // Onset
  'sudden onset': ['generalities, sudden, manifestation', 'fever, sudden'],
}

function findRubrics(data: MDRIData, query: string, cache: Map<string, MDRIRepertoryRubric[]>): MDRIRepertoryRubric[] {
  const q = query.toLowerCase()
  if (cache.has(q)) return cache.get(q)!

  // === Semantic layer: проверить mapping ===
  const semanticKeys = Object.keys(SEMANTIC_MAP).filter(k => q.includes(k) || k.includes(q))
  if (semanticKeys.length > 0) {
    // Найти рубрики по точным путям из mapping
    const semanticResults: [MDRIRepertoryRubric, number][] = []
    for (const key of semanticKeys) {
      const paths = SEMANTIC_MAP[key]
      for (const path of paths) {
        const pathLower = path.toLowerCase()
        const pathWords = pathLower.split(/[,\s]+/).filter(w => w.length > 2)

        // Искать в wordIndex по первому уникальному слову пути
        for (const pw of pathWords) {
          const idx = data.wordIndex.get(pw)
          if (!idx) continue
          for (const i of idx) {
            const r = data.repertory[i]
            const rl = r.rubric.toLowerCase()
            // Проверить что рубрика содержит ВСЕ слова из пути
            if (pathWords.every(w => rl.includes(w))) {
              // Приоритет: generals/mind > particular
              const chapterBonus = rl.startsWith('generalities') ? 20
                : rl.startsWith('mind') ? 15
                : rl.startsWith('sleep') ? 10
                : rl.startsWith('stomach') ? 8
                : 0
              // Приоритет: средние рубрики (5-100 препаратов)
              const sizeBonus = r.remedies.length >= 5 && r.remedies.length <= 100 ? 10
                : r.remedies.length > 100 ? 5
                : 3
              semanticResults.push([r, 50 + chapterBonus + sizeBonus])
            }
          }
          break // Один слово достаточно для поиска
        }
      }
    }

    if (semanticResults.length > 0) {
      semanticResults.sort((a, b) => b[1] - a[1])
      // Дедупликация
      const seen = new Set<string>()
      const deduped: MDRIRepertoryRubric[] = []
      for (const [r] of semanticResults) {
        if (!seen.has(r.rubric)) {
          seen.add(r.rubric)
          deduped.push(r)
        }
        if (deduped.length >= 5) break
      }
      cache.set(q, deduped)
      return deduped
    }
  }

  // === Fallback: оригинальный keyword matching ===

  const qWords = q.replace(/,/g, ' ').replace(/;/g, ' ')
    .split(' ')
    .map(w => w.replace(/[.,;()]/g, ''))
    .filter(w => w.length > 2)
  if (qWords.length === 0) return []

  let candidates = new Set<number>()
  for (const qw of qWords) {
    const idx = data.wordIndex.get(qw)
    if (idx) {
      if (candidates.size === 0) {
        candidates = new Set(idx)
      } else {
        const intersection = new Set(idx.filter(i => candidates.has(i)))
        candidates = intersection.size > 0 ? intersection : new Set([...candidates, ...idx])
      }
    }
  }

  if (candidates.size > 500) {
    candidates = new Set<number>()
    for (const qw of qWords.slice(0, 2)) {
      const idx = data.wordIndex.get(qw)
      if (idx) {
        if (candidates.size === 0) {
          candidates = new Set(idx)
        } else {
          const inter = new Set(idx.filter(i => candidates.has(i)))
          if (inter.size > 0) {
            candidates = inter
            break
          }
        }
      }
    }
  }

  const scored: [MDRIRepertoryRubric, number][] = []
  for (const idx of candidates) {
    const r = data.repertory[idx]
    const rl = r.rubric.toLowerCase()
    const parts = rl.replace(/;/g, ',').split(',').map(p => p.trim())

    if (rl.includes(q)) {
      const posBonus = 10 - Math.min(rl.indexOf(q) / Math.max(rl.length, 1) * 10, 9)
      scored.push([r, 100 + posBonus])
      continue
    }

    let matchCount = 0
    let positionScore = 0
    for (const qw of qWords) {
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes(qw)) {
          matchCount++
          positionScore += Math.max(0, 5 - i)
          break
        }
      }
    }

    if (matchCount >= Math.max(1, qWords.length * 0.5)) {
      const precisionBonus = matchCount === qWords.length ? 20 : 0
      const remCount = r.remedies.length
      const sizeBonus = remCount >= 5 && remCount <= 100 ? 5 : remCount > 100 ? 2 : 8
      const pathPenalty = Math.max(0, parts.length - 4) * 2
      scored.push([r, matchCount * 20 + positionScore + precisionBonus + sizeBonus - pathPenalty])
    }
  }

  scored.sort((a, b) => b[1] - a[1])
  const result = scored.slice(0, 5).map(s => s[0])
  cache.set(q, result)
  return result
}

function kentScore(data: MDRIData, symptoms: MDRISymptom[], cache: Map<string, MDRIRepertoryRubric[]>): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const sym of symptoms) {
    if (!sym.present) continue
    const matches = findRubrics(data, sym.rubric, cache)
    for (const match of matches) {
      const rubricSize = match.remedies.length
      const totalRemedies = 2432
      const idf = Math.log2(Math.max(totalRemedies, 1) / Math.max(rubricSize, 1))
      for (const rem of match.remedies) {
        scores[rem.abbrev] = (scores[rem.abbrev] ?? 0) + rem.grade * sym.weight * idf
      }
    }
  }
  if (Object.keys(scores).length === 0) return scores

  // Anti-domination + Frequency Prior
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length
  for (const remAbbrev of Object.keys(scores)) {
    const count = data.remedyRubricCount.get(remAbbrev) ?? 0
    if (count > 10000) scores[remAbbrev] *= 0.75
    else if (count > 5000) scores[remAbbrev] *= 0.85
    else if (count > 3000) scores[remAbbrev] *= 0.92

    if (count < 30 && scores[remAbbrev] < avgScore) {
      scores[remAbbrev] *= 0.70
    }
  }

  const maxS = Math.max(...Object.values(scores))
  if (maxS === 0) return scores
  for (const k of Object.keys(scores)) {
    scores[k] /= maxS
  }
  return scores
}

function polarityScore(data: MDRIData, modalities: MDRIModality[]): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const [remedy, pol] of Object.entries(data.polarities)) {
    let matches = 0, conflicts = 0, total = 0
    for (const mod of modalities) {
      const val = pol[mod.pairId]
      if (!val) continue
      total++
      if (mod.pairId === 'heat_cold') {
        if (mod.value === 'amel') {
          if (val.includes('agg_heat') || val === 'agg') matches++
          else if (val.includes('agg_cold')) conflicts++
        } else {
          if (val.includes('agg_heat') || val === 'agg') matches++
          else if (val === 'amel') conflicts++
        }
      } else {
        if (mod.value === 'agg') {
          if (val.includes('agg')) matches++
          else if (val.includes('amel')) conflicts++
        } else {
          if (val.includes('amel')) matches++
          else if (val.includes('agg')) conflicts++
        }
      }
    }
    if (total === 0) {
      scores[remedy] = modalities.length > 0 ? 0.35 : 0.5
    } else {
      const pd = (matches - conflicts) / total
      scores[remedy] = (pd + 1) / 2
    }
  }
  return scores
}

function hierarchyScore(data: MDRIData, symptoms: MDRISymptom[], cache: Map<string, MDRIRepertoryRubric[]>): Record<string, number> {
  const catW: Record<string, number> = { mental: 3, general: 2, particular: 1 }
  const scores: Record<string, number> = {}
  const present = symptoms.filter(s => s.present)
  const totalW = present.reduce((sum, s) => sum + (catW[s.category] ?? 1) * s.weight, 0)
  if (totalW === 0) return scores

  for (const sym of present) {
    const matches = findRubrics(data, sym.rubric, cache)
    const sw = (catW[sym.category] ?? 1) * sym.weight
    for (const match of matches) {
      for (const rem of match.remedies) {
        scores[rem.abbrev] = (scores[rem.abbrev] ?? 0) + (sw * rem.grade) / totalW
      }
    }
  }

  const maxS = Math.max(...Object.values(scores), 0)
  if (maxS === 0) return scores
  for (const k of Object.keys(scores)) {
    scores[k] /= maxS
  }
  return scores
}

function constellationScore(data: MDRIData, symptoms: MDRISymptom[]): Record<string, number> {
  const scores: Record<string, number> = {}
  const present = symptoms.filter(s => s.present).map(s => s.rubric.toLowerCase())
  const candidates = new Set<string>()

  for (const p of present) {
    const pWords = new Set(p.split(' ').filter(w => w.length > 2))
    for (const pw of pWords) {
      const idx = data.constellationWordIndex.get(pw)
      if (idx) {
        for (const [remedy] of idx) candidates.add(remedy)
      }
      // Синонимы
      for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
        if (pw.includes(key) || key.includes(pw) || syns.some(s => pw.includes(s) || s.includes(pw))) {
          for (const synWord of key.split(' ')) {
            const synIdx = data.constellationWordIndex.get(synWord)
            if (synIdx) {
              for (const [remedy] of synIdx) candidates.add(remedy)
            }
          }
        }
      }
    }
  }

  for (const remedy of candidates) {
    const con = data.constellations[remedy]
    if (!con?.clusters) continue

    let totalAct = 0, totalImp = 0
    for (const cluster of con.clusters) {
      let cAct = 0, cTotal = 0
      for (const sym of cluster.symptoms) {
        cTotal += sym.weight
        if (present.some(p => symMatch(p, sym.rubric))) {
          cAct += sym.weight
        }
      }
      const act = cTotal > 0 ? cAct / cTotal : 0
      totalAct += act * cluster.importance
      totalImp += cluster.importance
    }
    scores[remedy] = totalImp > 0 ? totalAct / totalImp : 0
  }

  return scores
}

function negativeScore(data: MDRIData, symptoms: MDRISymptom[], cache: Map<string, MDRIRepertoryRubric[]>): Record<string, number> {
  const scores: Record<string, number> = {}
  const absent = symptoms.filter(s => !s.present).map(s => s.rubric.toLowerCase())
  const present = symptoms.filter(s => s.present).map(s => s.rubric.toLowerCase())
  if (absent.length === 0) return scores

  const absenceRubrics: Record<string, string> = {
    'thirst': 'thirstless', 'fear': 'fearlessness', 'pain': 'painlessness', 'sweat': 'perspiration absent',
  }
  const absenceRemedies: Record<string, number> = {}

  for (const absentSym of absent) {
    for (const [key, rubricName] of Object.entries(absenceRubrics)) {
      if (absentSym.includes(key)) {
        const matches = findRubrics(data, rubricName, cache)
        for (const match of matches) {
          for (const rem of match.remedies) {
            absenceRemedies[rem.abbrev] = (absenceRemedies[rem.abbrev] ?? 0) + rem.grade * 0.1
          }
        }
      }
    }
  }

  for (const [remedy, con] of Object.entries(data.constellations)) {
    if (!con.sine_qua_non?.length) {
      if (absenceRemedies[remedy]) {
        scores[remedy] = absenceRemedies[remedy]
      }
      continue
    }

    let sc = 0
    for (const sqn of con.sine_qua_non) {
      if (absent.some(a => symMatch(a, sqn))) {
        sc -= 0.5
      }
    }
    for (const excl of con.excluders ?? []) {
      if (present.some(p => symMatch(p, excl))) {
        sc -= 0.3
      }
    }
    sc += absenceRemedies[remedy] ?? 0
    scores[remedy] = Math.max(-1, Math.min(1, sc))
  }

  return scores
}

function miasmScore(familyHistory: string[]): [Record<string, number>, string] {
  const counts: Record<string, number> = {}
  for (const fh of familyHistory) {
    for (const [key, miasms] of Object.entries(FAMILY_HISTORY_MIASM)) {
      if (fh.toLowerCase().includes(key)) {
        for (const m of miasms) {
          counts[m] = (counts[m] ?? 0) + 1
        }
      }
    }
  }

  if (Object.keys(counts).length === 0) return [{}, '']

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  const maxCount = counts[dominant]
  const scores: Record<string, number> = {}

  if (MIASM_REMEDIES[dominant]) {
    const mr = MIASM_REMEDIES[dominant]
    scores[mr.nosode] = 0.95
    for (const r of mr.keys) scores[r] = 0.70
  }

  for (const [miasm, count] of Object.entries(counts)) {
    if (miasm !== dominant && MIASM_REMEDIES[miasm]) {
      const mr = MIASM_REMEDIES[miasm]
      const bonus = 0.30 * (count / maxCount)
      scores[mr.nosode] = Math.max(scores[mr.nosode] ?? 0, bonus + 0.40)
      for (const r of mr.keys) {
        scores[r] = Math.max(scores[r] ?? 0, bonus + 0.20)
      }
    }
  }

  return [scores, dominant]
}

function getPatientChapters(symptoms: MDRISymptom[]): Set<string> {
  const chapters = new Set<string>()
  const chapterMap: Record<string, string> = {
    'skin': 'skin', 'throat': 'throat', 'head': 'head', 'stomach': 'stomach',
    'chest': 'chest', 'sleep': 'sleep', 'female': 'female', 'extremities': 'extremities',
    'fever': 'fever', 'nose': 'nose', 'eye': 'eye', 'ear': 'ear', 'back': 'back',
    'eczema': 'skin', 'itching': 'skin',
  }
  for (const s of symptoms) {
    if (!s.present) continue
    if (s.category === 'mental') {
      chapters.add('mind')
    } else if (s.category === 'general') {
      chapters.add('generalities')
    } else {
      const first = s.rubric.toLowerCase().split(' ')[0] ?? ''
      const ch = chapterMap[first]
      if (ch) chapters.add(ch)
    }
  }
  return chapters
}

function selectPotency(profile: MDRIPatientProfile, confidence: number, isNosode: boolean): MDRIPotencyRecommendation {
  if (profile.acuteOrChronic === 'acute') {
    return { potency: '30C', frequency: 'каждые 2-4 часа до улучшения', reasoning: 'Острый случай' }
  }
  if (isNosode) {
    return { potency: '200C', frequency: 'однократно', reasoning: 'Нозод — высокая потенция однократно' }
  }
  if (profile.sensitivity === 'high') {
    return { potency: '12C', frequency: 'ежедневно 2 недели', reasoning: 'Высокая чувствительность' }
  }
  if (profile.vitality === 'low' || profile.age === 'elderly') {
    return { potency: '30C', frequency: 'через день, 2 недели', reasoning: 'Низкая витальность' }
  }
  if (profile.age === 'child') {
    return { potency: '30C', frequency: 'однократно', reasoning: 'Ребёнок' }
  }
  if (confidence >= 80) {
    return { potency: '200C', frequency: 'однократно', reasoning: 'Высокая уверенность' }
  }
  return { potency: '30C', frequency: 'однократно, наблюдение 3-4 недели', reasoning: 'Стандартный выбор' }
}
