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
      matchedRubrics: [],
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
  // STAGE 2.5: CONSTELLATION OVERRIDE
  // Если препарат имеет strong constellation match (>=3 full matches)
  // но не прошёл Selection — принудительно добавляем в candidates.
  // Это решает разрыв: constellation знает что Gels подходит,
  // но findRubrics не находит рубрики → Selection не пропускает.
  // ===================================================================
  const preConScores = constellationScore(data, symptoms)
  for (const [remedy, cs] of Object.entries(preConScores)) {
    if (cs < 0.3) continue // Только сильные совпадения
    // remedy = lowercase (из constellations), нужно найти формат из реперториума
    // Ищем среди allRemedies
    for (const rem of allRemedies) {
      const remNorm = rem.toLowerCase().replace(/\.$/, '')
      if (remNorm === remedy && !candidates.has(rem) && !excluded.has(rem)) {
        candidates.add(rem)
      }
    }
    // Также добавляем прямо в lowercase формате — Stage 3 нормализует ключи
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
  const conScores = preConScores // Уже посчитаны в Stage 2.5

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

  // ===================================================================
  // STAGE 3.5: RARITY-WEIGHTED SCORING
  // Для каждого симптома считаем rarity — насколько он сужает выбор.
  // Совпадение на редком симптоме ценнее чем на общем.
  // ===================================================================
  const symptomRarity = new Map<number, number>() // symptom index → rarity 0..1
  for (let i = 0; i < presentSymptoms.length; i++) {
    const matches = findRubrics(data, presentSymptoms[i].rubric, rubricCache)
    if (matches.length === 0) {
      symptomRarity.set(i, 1.0) // Не нашли рубрик → считаем редким
      continue
    }
    // Rarity = среднее log(totalRemedies / rubricSize) нормализованное на 0..1
    // Маленькая рубрика (5 rems) → rarity ~1.0
    // Большая рубрика (200 rems) → rarity ~0.3
    const totalRemedies = 2432
    const avgLogRarity = matches.reduce((sum, m) => {
      return sum + Math.log2(totalRemedies / Math.max(m.remedies.length, 1))
    }, 0) / matches.length
    // Нормализуем: log2(2432/1)=11.2 → 1.0, log2(2432/2432)=0 → 0
    symptomRarity.set(i, Math.min(1.0, avgLogRarity / 11.2))
  }

  const results: MDRIResult[] = []
  for (const rem of candidates) {
    const kf = kentFull[rem] ?? 0
    const hs = hierarchyScores[rem] ?? 0
    // Нормализация ключа: constellations/polarities = lowercase без точки, repertory = Capitalized.
    const remNorm = rem.toLowerCase().replace(/\.$/, '')
    const cs = conScores[remNorm] ?? conScores[rem] ?? 0
    const pol = polScores[remNorm] ?? polScores[rem] ?? 0.35
    const mi = mScores[remNorm] ?? mScores[rem] ?? 0
    const cov = coverage.get(rem)

    // === Ranking v5: constellation усиливает, не перераспределяет ===
    //
    // finalScore = baseScore * (1 + k * cs) * polarityMult
    //
    // Constellation УСИЛИВАЕТ базовый score, а не забирает его вес.
    // cs=0 → множитель 1.0 (без усиления)
    // cs=0.5 → множитель 1.3 (k=0.6)
    // cs=1.0 → множитель 1.6
    //
    // Kent soft cap: sqrt нормализация — убирает доминацию частых препаратов
    // kent=1.0 → 1.0, kent=0.5 → 0.71, kent=0.25 → 0.50

    // Soft cap: pow(0.8) сжимает разрыв мягче чем sqrt
    // kent=1.0→1.0, kent=0.5→0.57, kent=0.25→0.32 (vs sqrt: 0.71, 0.50)
    const kfSoft = Math.pow(kf, 0.8)
    const hsSoft = Math.pow(hs, 0.8)
    const baseScore = 0.5 * kfSoft + 0.5 * hsSoft

    // Constellation boost: усиливающий множитель
    const k = 0.6
    const constellationMult = 1.0 + k * cs

    // Polarity (Кент: противоречие общих модальностей = серьёзный аргумент против)
    let polarityMult: number
    if (pol < 0) {
      // Прямое противоречие (chilly patient + hot remedy, или наоборот)
      polarityMult = 0.70 + pol * 0.20  // range 0.50..0.70
    } else {
      polarityMult = 0.94 + pol * 0.12  // range 0.94..1.06 (без изменений)
    }

    let total = baseScore * constellationMult * polarityMult

    // Miasm (Ганеман "Хронические болезни": семейный анамнез → нозод)
    if (isChronic && mi > 0) {
      if (NOSODES.has(rem) && mi >= 0.7) {
        // Нозод + сильный семейный анамнез: при ТБ в семье — Tuberculinum первый кандидат
        total += 0.15 * mi
      } else {
        total += 0.05 * mi
      }
    }

    // Etiology Boost (Organon §5: causa — иерархически выше отдельных симптомов)
    // Если пациент имеет "ailments from X" и средство имеет X в constellation — boost
    const etiologySymptoms = symptoms.filter(s =>
      s.present && s.weight >= 2 && s.rubric.toLowerCase().includes('ailments from')
    )
    if (etiologySymptoms.length > 0) {
      const constellation = data.constellations[rem]
      if (constellation) {
        const hasCausaMatch = etiologySymptoms.some(es => {
          const causa = es.rubric.toLowerCase().replace(/ailments from\s*/, '')
          return constellation.clusters.some(cl =>
            cl.symptoms.some(s => symMatch(causa, s.rubric))
          )
        })
        if (hasCausaMatch) {
          total *= 1.15  // +15% за совпадение этиологии с портретом средства
        }
      }
    }

    // Acute/Chronic
    if (isAcute && CHRONIC_REMEDIES.has(rem)) total *= 0.92
    if (isChronic && ACUTE_REMEDIES.has(rem)) total *= 0.92

    // Clamp
    total = Math.max(0, Math.min(1, total))

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

    // Deduplicate и ограничить рубрики (для UI — max 10)
    const uniqueRubrics = [...new Set(cov?.rubrics ?? [])].slice(0, 10)

    results.push({
      remedy: rem,
      remedyName: name,
      totalScore: Math.round(total * 100),
      confidence,
      lenses: [
        { name: 'Kent', score: Math.round(kf * 100), details: `${Math.round(kf * 100)}%` },
        { name: 'Coverage', score: Math.round((cov ? cov.covered / Math.max(cov.total, 1) : 0) * 100), details: `${cov?.covered ?? 0}/${cov?.total ?? 0}` },
        { name: 'Hierarchy', score: Math.round(hs * 100), details: `${Math.round(hs * 100)}%` },
        { name: 'Constellation', score: Math.round(cs * 100), details: `${Math.round(cs * 100)}%` },
        { name: 'Polarity', score: Math.round(pol * 100), details: `${Math.round(pol * 100)}%` },
        { name: 'Miasm', score: Math.round(mi * 100), details: mi > 0 ? `${Math.round(mi * 100)}% (${dominantMiasm})` : '-' },
      ],
      potency,
      miasm: dominantMiasm || null,
      relationships: data.relationships[rem] ?? null,
      differential: null,
      matchedRubrics: uniqueRubrics,
    })
  }

  // Constellation confidence penalty:
  // Если есть кандидат с сильным constellation (cs>40%),
  // препараты с слабым cs получают penalty.
  // Порог 30 (вместо 15) — ловит Carc (cs=20-23) и другие слабые совпадения.
  const maxCs = Math.max(...results.map(r => r.lenses.find(l => l.name === 'Constellation')?.score ?? 0))
  if (maxCs > 40) {
    for (const r of results) {
      const rCs = r.lenses.find(l => l.name === 'Constellation')?.score ?? 0
      if (rCs < 60) {
        // cs=0 → penalty 0.55, cs=30 → penalty 0.78, cs=50 → penalty 0.93, cs=55 → penalty 0.96
        const penaltyFactor = 0.55 + (rCs / 60) * 0.45
        r.totalScore = Math.round(r.totalScore * penaltyFactor)
      }
    }
  }

  // Сортировка: по totalScore, при равном — по constellation (выше cs = лучше)
  results.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    const aCs = a.lenses.find(l => l.name === 'Constellation')?.score ?? 0
    const bCs = b.lenses.find(l => l.name === 'Constellation')?.score ?? 0
    return bCs - aCs
  })

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

// =============================================================================
// SEMANTIC LAYER: Taxonomy Parser + Fallback Mapping
//
// Слой 1: Taxonomy Parser
//   симптом → parse(subject, qualifier, modality) → resolve(category) → rubric paths
//   Сохраняет связи: "burning pain stomach" → Stomach, pain, burning (не отдельно)
//
// Слой 2: Fallback Mapping (edge cases, peculiar symptoms)
//   Для симптомов которые не парсятся — прямой маппинг
// =============================================================================

// --- Taxonomy: 20 категорий → chapter + rubric pattern ---

type ParsedSymptom = {
  subject: string | null     // что: pain, eruption, perspiration, cough...
  location: string | null    // где: head, stomach, chest, extremities...
  qualifier: string | null   // какой: burning, stitching, throbbing, profuse...
  modality: string | null    // когда/от чего: agg, amel, morning, night, motion...
  category: 'mental' | 'modality' | 'thermal' | 'thirst' | 'desire' | 'aversion'
    | 'sensation' | 'discharge' | 'sleep' | 'perspiration' | 'consolation'
    | 'company' | 'time' | 'side' | 'onset' | 'general' | 'particular' | 'unknown'
}

// Маппинг ключевых слов → category
const CATEGORY_KEYWORDS: Record<string, ParsedSymptom['category']> = {
  // Mental
  'grief': 'mental', 'anxiety': 'mental', 'fear': 'mental', 'anger': 'mental',
  'irritab': 'mental', 'jealous': 'mental', 'weep': 'mental', 'restless': 'mental',
  'indifferen': 'mental', 'suicid': 'mental', 'loquac': 'mental', 'sighing': 'mental',
  'mood': 'mental', 'haughti': 'mental', 'contempt': 'mental', 'hurry': 'mental',
  'timid': 'mental', 'bashful': 'mental', 'suppress': 'mental', 'humiliat': 'mental',
  'secret': 'mental', 'violen': 'mental', 'stammer': 'mental', 'sympathy': 'mental',
  'perfect': 'mental', 'fastidious': 'mental', 'globus': 'mental',
  // Thermal
  'chill': 'thermal', 'hot patient': 'thermal', 'froz': 'thermal', 'warm': 'thermal',
  // Thirst
  'thirst': 'thirst', 'thirstless': 'thirst',
  // Desire/Aversion
  'desire': 'desire', 'aversion': 'aversion', 'craving': 'desire',
  // Modality
  'agg': 'modality', 'amel': 'modality', 'worse': 'modality', 'better': 'modality',
  'motion': 'modality', 'rest': 'modality',
  // Consolation/Company
  'consolat': 'consolation', 'company': 'company',
  // Time
  'morning': 'time', 'evening': 'time', 'night': 'time', 'afternoon': 'time',
  'after sleep': 'time', '2-4': 'time', '4-8': 'time',
  // Side
  'right side': 'side', 'left side': 'side', 'right': 'side', 'left': 'side',
  // Sleep
  'sleep': 'sleep', 'insomnia': 'sleep', 'dream': 'sleep',
  // Onset
  'sudden': 'onset', 'gradual': 'onset',
  // Perspiration
  'perspir': 'perspiration', 'sweat': 'perspiration',
}

// Маппинг location keywords → chapter
const LOCATION_TO_CHAPTER: Record<string, string> = {
  'head': 'Head', 'headache': 'Head',
  'eye': 'Eye', 'pupil': 'Eye', 'vision': 'Vision',
  'ear': 'Ear', 'nose': 'Nose',
  'face': 'Face', 'cheek': 'Face',
  'mouth': 'Mouth', 'tongue': 'Mouth', 'teeth': 'Teeth',
  'throat': 'Throat', 'larynx': 'Larynx',
  'stomach': 'Stomach', 'abdomen': 'Abdomen',
  'rectum': 'Rectum', 'stool': 'Stool',
  'bladder': 'Bladder', 'urethra': 'Urethra', 'urin': 'Bladder',
  'chest': 'Chest', 'heart': 'Chest', 'lung': 'Chest',
  'back': 'Back', 'spine': 'Back',
  'extremit': 'Extremities', 'joint': 'Extremities', 'knee': 'Extremities',
  'feet': 'Extremities', 'sole': 'Extremities', 'hand': 'Extremities',
  'skin': 'Skin', 'erupt': 'Skin', 'eczema': 'Skin', 'wart': 'Skin',
  'cough': 'Cough', 'respir': 'Respiration',
  'fever': 'Fever', 'chill': 'Chill', 'perspir': 'Perspiration',
}

// Qualifier → rubric fragment
const QUALIFIER_MAP: Record<string, string> = {
  'burning': 'burning', 'stitching': 'stitching', 'stinging': 'stinging',
  'throbbing': 'pulsating', 'pressing': 'pressing', 'tearing': 'tearing',
  'cramping': 'cramping', 'splinter': 'splinter', 'sore': 'sore',
  'sharp': 'sharp', 'dull': 'dull', 'intolerable': 'intolerable',
  'profuse': 'profuse', 'offensive': 'offensive', 'acrid': 'acrid',
  'sticky': 'sticky', 'oozing': 'oozing', 'dry': 'dry',
  'sudden': 'sudden', 'gradual': 'gradual', 'paroxysm': 'paroxysmal',
  'alternating': 'alternating',
}

function parseSymptom(raw: string): ParsedSymptom {
  const s = raw.toLowerCase().trim()

  // Определить category
  let category: ParsedSymptom['category'] = 'unknown'
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (s.includes(kw)) { category = cat; break }
  }

  // Определить location
  let location: string | null = null
  for (const [kw, chapter] of Object.entries(LOCATION_TO_CHAPTER)) {
    if (s.includes(kw)) { location = chapter; break }
  }

  // Определить qualifier
  let qualifier: string | null = null
  for (const [kw, qf] of Object.entries(QUALIFIER_MAP)) {
    if (s.includes(kw)) { qualifier = qf; break }
  }

  // Определить modality
  let modality: string | null = null
  if (s.includes('agg')) modality = 'agg'
  else if (s.includes('amel')) modality = 'amel'
  else if (s.includes('worse')) modality = 'agg'
  else if (s.includes('better')) modality = 'amel'

  // Subject — основное существительное
  let subject: string | null = null
  if (s.includes('pain')) subject = 'pain'
  else if (s.includes('cough')) subject = 'cough'
  else if (s.includes('erupt')) subject = 'eruptions'
  else if (s.includes('discharg')) subject = 'discharge'
  else if (s.includes('hemorrhage') || s.includes('bleed')) subject = 'hemorrhage'
  else if (s.includes('swell') || s.includes('edema')) subject = 'swelling'
  else if (s.includes('nausea')) subject = 'nausea'
  else if (s.includes('vertigo') || s.includes('dizzin')) subject = 'vertigo'
  else if (s.includes('paralys')) subject = 'paralysis'
  else if (s.includes('suppurat')) subject = 'suppuration'
  else if (s.includes('indurat')) subject = 'induration'
  else if (s.includes('crack')) subject = 'cracks'
  else if (s.includes('itch')) subject = 'itching'
  else if (s.includes('salivat')) subject = 'salivation'
  else if (s.includes('bruis')) subject = 'sore, bruised'

  // Если нет location — по category определить chapter
  if (!location) {
    if (category === 'mental') location = 'Mind'
    else if (category === 'thermal' || category === 'modality' || category === 'onset') location = 'Generalities'
    else if (category === 'thirst' || category === 'desire' || category === 'aversion') location = 'Stomach'
    else if (category === 'perspiration') location = 'Perspiration'
    else if (category === 'sleep') location = 'Sleep'
  }

  return { subject, location, qualifier, modality, category }
}

// Построить rubric paths из parsed компонентов (сохраняя связи)
function buildRubricPaths(parsed: ParsedSymptom): string[] {
  const paths: string[] = []
  const chapter = parsed.location ?? 'Generalities'

  if (parsed.category === 'mental') {
    // Mental: Mind, [keyword]
    // Связь: grief + suppressed → Mind, grief, silent
    paths.push(`mind`)
  }

  if (parsed.category === 'modality' || parsed.modality) {
    // Modality: Generalities, [factor], [agg/amel]
    paths.push(`generalities`)
    if (parsed.modality === 'agg') paths.push('agg')
    if (parsed.modality === 'amel') paths.push('amel')
  }

  if (parsed.category === 'thermal') {
    paths.push('generalities')
  }

  if (parsed.category === 'thirst') {
    paths.push('stomach', 'thirst')
  }

  if (parsed.category === 'desire') {
    paths.push('stomach', 'desire')
  }

  if (parsed.category === 'aversion') {
    paths.push('stomach', 'aversion')
  }

  if (parsed.subject) {
    // Subject + location → конкретная рубрика
    // "burning pain stomach" → Stomach, pain, burning
    if (parsed.location && parsed.qualifier) {
      paths.push(`${chapter.toLowerCase()}, ${parsed.subject}, ${parsed.qualifier}`)
    } else if (parsed.location) {
      paths.push(`${chapter.toLowerCase()}, ${parsed.subject}`)
    }
    // Generalities fallback
    if (chapter !== 'Generalities') {
      paths.push(`generalities, ${parsed.subject}`)
    }
  }

  if (parsed.qualifier && !parsed.subject) {
    // Qualifier without subject → pain with qualifier
    paths.push(`generalities, pain, ${parsed.qualifier}`)
  }

  return paths.length > 0 ? paths : [chapter.toLowerCase()]
}

// Fallback mapping для edge cases и peculiar symptoms
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
  // === Дополнительные маппинги для recall ===
  // Dentition/Teeth
  'dentition': ['teeth, dentition difficult', 'clinical, convulsions, dentition'],
  'teething': ['teeth, dentition difficult'],
  'one cheek red': ['face, discoloration, red, one-sided', 'fever, remittent, redness, cheek'],
  'cheek red pale': ['face, discoloration, red, one-sided, one pale the other red'],
  'capricious': ['mind, capriciousness', 'appetite, capricious'],
  'carried desires': ['mind, carried, desires to be'],
  'wants carried': ['mind, carried, desires to be'],
  'stool green': ['stool, mucous, green', 'stool, watery, green'],
  'oversensitive': ['mind, sensitive, oversensitive', 'mind, speech, shrieking, pain'],
  'pain intolerance': ['mind, speech, shrieking, pain', 'mind, sensitive, pain, to'],
  // Injuries/Trauma
  'bruises': ['clinical, injuries', 'generalities, injuries, bruises', 'generalities, pain, sore, bruised'],
  'contusions': ['clinical, injuries', 'generalities, injuries'],
  'injury': ['clinical, injuries', 'generalities, injuries'],
  'trauma': ['clinical, injuries', 'generalities, injuries, bruises'],
  'bed hard': ['generalities, hard bed, sensation of'],
  'hard bed': ['generalities, hard bed, sensation of'],
  'refuses help': ['mind, well, says he is, when very sick'],
  'says well': ['mind, well, says he is, when very sick'],
  'fear touch': ['mind, fear, touch', 'mind, fear, approaching'],
  // Drowsiness/Eyelids
  'drowsiness': ['sleep, sleepiness', 'sleep, drowsiness', 'generalities, lassitude'],
  'heaviness eyelids': ['eye, heaviness, lids', 'eye, open, unable to'],
  'eyelids heavy': ['eye, heaviness, lids'],
  'trembling': ['generalities, trembling', 'extremities, trembling'],
  'tremor': ['generalities, trembling', 'extremities, trembling'],
  'stage fright': ['mind, anticipation', 'mind, anxiety, anticipation', 'mind, fear, stage'],
  // Vomiting/Diarrhea
  'vomiting diarrhea': ['stomach, vomiting, diarrhea', 'rectum, diarrhea'],
  'cholera': ['generalities, cholera', 'clinical, cholera', 'stool, watery, rice water'],
  'cold sweat': ['face, perspiration, cold', 'head, perspiration, forehead, cold', 'perspiration, cold'],
  'cramps calves': ['extremities, cramps, calf'],
  'cramps legs': ['extremities, cramps, calf', 'extremities, cramps, lower limbs'],
  // Dysmenorrhea
  'dysmenorrhea': ['genitalia female, pain, menses, during', 'abdomen, pain, menses, during'],
  'menstrual cramps': ['genitalia female, pain, menses, during', 'abdomen, pain, cramping, menses'],
  'menstrual spasms': ['genitalia female, pain, menses, during', 'abdomen, pain, cramping, menses'],
  'spasms': ['generalities, convulsions', 'abdomen, pain, cramping'],
  'doubling up': ['abdomen, pain, bending double, amel'],
  'bending double': ['abdomen, pain, bending double, amel'],
  // Coryza/Nasal
  'coryza': ['nose, coryza', 'nose, discharge'],
  'acrid discharge nose': ['nose, discharge, acrid', 'nose, discharge, excoriating'],
  'burning nose discharge': ['nose, discharge, acrid', 'nose, discharge, burning'],
  'lachrymation bland': ['eye, lachrymation', 'nose, discharge, acrid'],
  'lachrymation': ['eye, lachrymation'],
  'sneezing': ['nose, sneezing'],
  // Anemia/Face
  'anemia': ['generalities, anemia', 'face, pale', 'clinical, anemia'],
  'false plethora': ['face, discoloration, red, flushing easily', 'generalities, anemia'],
  'flushing': ['face, discoloration, red, flushing easily', 'face, heat, flushes'],
  'face flushes': ['face, discoloration, red, flushing easily', 'face, heat, flushes'],
  // Grinding teeth/Worms
  'grinding teeth': ['teeth, grinding', 'sleep, teeth, grinding'],
  'bruxism': ['teeth, grinding', 'sleep, teeth, grinding'],
  'picking nose': ['nose, boring, picks at', 'nose, boring'],
  'boring nose': ['nose, boring, picks at'],
  'worms': ['abdomen, worms', 'rectum, worms', 'clinical, worms'],
  'parasites': ['abdomen, worms', 'clinical, worms'],
  'pallor mouth': ['face, pale, around mouth', 'face, discoloration, pale, mouth, around'],
  // Haughtiness
  'haughty': ['mind, haughtiness', 'mind, contemptuous'],
  'arrogant': ['mind, haughtiness', 'mind, contemptuous'],
  'objects small': ['mind, delusions, diminished, everything is', 'mind, delusions, small'],
  'appear small': ['mind, delusions, diminished', 'mind, delusions, small'],
  // Motion sickness / Travel
  'motion sickness': ['stomach, nausea, riding, carriage, in a', 'generalities, riding, in a carriage, agg'],
  'car sick': ['stomach, nausea, riding, carriage', 'generalities, riding, in a carriage, agg'],
  'sea sick': ['stomach, nausea, riding, at sea', 'stomach, nausea, sailing'],
  'nausea travel': ['stomach, nausea, riding, carriage', 'generalities, riding, in a carriage, agg'],
  // Barking/Croup
  'barking cough': ['cough, barking', 'cough, hoarse'],
  'croup': ['cough, barking', 'cough, croupy', 'larynx, croup'],
  'croupy': ['cough, croupy', 'larynx, croup'],
  // Whooping/Paroxysmal cough
  'paroxysmal cough': ['cough, paroxysmal', 'cough, whooping'],
  'spasmodic cough': ['cough, spasmodic', 'cough, paroxysmal'],
  // Concussion / Head injury
  'concussion': ['head, injuries, concussion', 'clinical, concussion', 'head, pain, injuries, after'],
  'head injury': ['head, injuries', 'head, pain, injuries, after'],
  // Damp/Wet weather
  'damp weather': ['generalities, wet, agg', 'generalities, cold, wet weather, agg'],
  'wet weather': ['generalities, wet, agg', 'generalities, cold, wet weather, agg'],
  // Desire travel
  'desire travel': ['mind, travel, desire to', 'mind, restlessness, desire for change'],
  'travel desire': ['mind, travel, desire to'],
  // Loose/Tonsils/Glands
  'tonsils enlarged': ['throat, swelling, tonsils', 'throat, hypertrophy, tonsils'],
  'bashful': ['mind, timidity', 'mind, bashful'],
  'shy hides': ['mind, timidity', 'mind, bashful', 'mind, hiding'],
  // Menses/Climacteric
  'menopause': ['generalities, climacteric period', 'genitalia female, menopause'],
  'climacteric': ['generalities, climacteric period', 'genitalia female, menopause'],
  'hot flushes': ['generalities, flushes of heat', 'face, heat, flushes'],
  // Clothing intolerance
  'tight clothing': ['generalities, clothing, intolerance of', 'throat, clothing, sensitive to'],
  'clothing neck': ['throat, clothing, sensitive to', 'throat, constriction, collar, agg'],
  // After sleep
  'after sleep worse': ['sleep, after, agg', 'generalities, sleep, after, agg'],
  // Alternating sides - throat
  'throat alternating': ['throat, pain, alternating sides'],
  // Ptosis
  'ptosis': ['eye, paralysis, upper lid', 'eye, drooping, upper lid'],
  'drooping eyelid': ['eye, paralysis, upper lid'],
  // Hoarseness
  'hoarseness': ['larynx, voice, hoarseness'],
  'loss voice': ['larynx, voice, lost', 'larynx, voice, hoarseness'],
  // Emaciation specifics
  'emaciation despite': ['appetite, ravenous, emaciation, with', 'generalities, emaciation'],
  // Despair recovery
  'despair': ['mind, despair', 'mind, despair, recovery', 'mind, hopeless'],
  'hopeless': ['mind, despair', 'mind, hopeless'],
  'despair recovery': ['mind, despair, recovery'],
  // Obstinate
  'obstinate': ['mind, obstinate'],
  // Offensive smell
  'offensive smell': ['perspiration, odor, offensive', 'generalities, odor, body, offensive'],
  'offensive body': ['perspiration, odor, offensive'],
  // Moles
  'moles naevi': ['skin, moles'],
  // Perfectionism
  'perfectionism': ['mind, conscientious, about trifles', 'mind, fastidious'],
  // Styes
  'styes': ['eye, styes'],
  'stye': ['eye, styes'],
  // Cystitis coition
  'cystitis': ['bladder, inflammation', 'bladder, pain'],
  'cystitis coition': ['bladder, pain, coition, after'],
  // Tongue
  'tongue imprint': ['mouth, tongue, indented', 'mouth, teeth, imprints, tongue'],
  'tongue clean nausea': ['stomach, nausea, tongue, clean, with'],
  // Edema
  'edema': ['eye, swollen, lids, edematous', 'generalities, dropsy, edema'],
  'puffiness eyelids': ['eye, swollen, lids, edematous'],
  'upper eyelid swelling': ['eye, swollen, lids, edematous', 'eye, swollen, lids, upper'],
  // Stitching pain
  'stitching': ['generalities, pain, stitching', 'chest, pain, stitching'],
  // Startled easily
  'startled': ['mind, starting, easily', 'mind, startled'],
  // Prostration
  'prostration': ['generalities, weakness', 'generalities, lassitude', 'generalities, faintness'],
  // Better slow walking
  'slow walking better': ['generalities, walking, slowly, amel'],
  // Diarrhea morning
  'diarrhea morning': ['rectum, diarrhea, morning'],
  // Suicidal specific
  'suicidal jump': ['mind, suicidal, jumping, from height', 'mind, suicidal disposition'],
  // Vaccination
  'after vaccination': ['generalities, vaccination, after', 'skin, warts, vaccination, after'],
  // Perspiration head night
  'perspiration head': ['head, perspiration', 'head, perspiration, sleep, during'],
  'head perspiration': ['head, perspiration', 'head, perspiration, sleep, during'],
  // Feet perspiration offensive
  'feet perspiration': ['extremities, perspiration, foot', 'extremities, perspiration, foot, offensive'],
  'perspiration feet offensive': ['extremities, perspiration, foot, offensive'],
  // === NOT FOUND кейсы — дополнительные маппинги ===
  // Gelsemium: drowsiness + eyelids + trembling
  'drowsiness heaviness': ['sleep, sleepiness', 'eye, heaviness, lids', 'generalities, lassitude'],
  'eyelids heaviness': ['eye, heaviness, lids'],
  'weakness trembling': ['extremities, trembling', 'generalities, trembling, externally'],
  'anticipation exam': ['mind, anticipation', 'mind, anxiety, anticipation'],
  'thirstless fever': ['stomach, thirstless'],
  // Conium: vertigo turning head + induration glands
  'vertigo turning head': ['vertigo, turning, in bed', 'vertigo, turning'],
  'vertigo head': ['vertigo, turning', 'vertigo, motion, head'],
  'induration glands': ['external throat, induration of glands', 'generalities, induration'],
  'induration breast': ['chest, induration, mammae', 'generalities, induration'],
  'breast hard': ['chest, induration, mammae'],
  'memory weak': ['mind, memory, weakness of', 'mind, forgetful'],
  'memory forgetful': ['mind, memory, weakness of', 'mind, forgetful'],
  'watching moving': ['vertigo, looking at, moving objects'],
  // Kali-carb: 2-3am + stitching + puffiness eyelids
  'waking 2am': ['sleep, waking, 2 a.m.', 'generalities, night, 2 a.m.'],
  'waking 3am': ['sleep, waking, 3 a.m.', 'generalities, night, 3 a.m.'],
  '2am 3am': ['generalities, night, 2 a.m.', 'generalities, night, 3 a.m.', 'sleep, waking, 2 a.m.'],
  'stitching pain': ['generalities, pain, stitching', 'chest, pain, stitching'],
  'puffiness': ['eye, swollen, lids, edematous', 'face, swelling'],
  'rigid duty': ['mind, conscientious, about trifles'],
  'anxiety stomach': ['mind, anxiety, stomach, felt in'],
  // Lac caninum: throat + alternating sides + self-contempt
  'sore throat alternating': ['throat, pain, alternating sides', 'head, pain, sides, one side, alternating'],
  'headache alternating': ['head, pain, sides, one side, alternating'],
  'self contempt': ['mind, contemptuous, of self', 'mind, confidence, want of'],
  'worthlessness': ['mind, confidence, want of', 'mind, contemptuous, of self'],
  'fear snakes': ['mind, fear, snakes'],
  'constriction throat': ['throat, constriction', 'throat, narrow, sensation'],
  // Spongia: barking cough + croup + larynx
  'barking': ['cough, barking', 'cough, hoarse', 'cough, croupy'],
  'wheezing': ['respiration, wheezing', 'respiration, whistling'],
  'larynx sensitive': ['larynx, sensitive, touch', 'larynx, pain'],
  'before midnight': ['generalities, night, before midnight', 'larynx, croup, night, before midnight'],
  'warm drinks': ['stomach, warm drinks, amel', 'generalities, warm, drinks, amel'],
  // Drosera: whooping cough + paroxysmal + vomiting from cough
  'cough vomiting': ['cough, paroxysmal, ending vomiting', 'stomach, vomiting, cough, during'],
  'cough worse lying': ['cough, lying, agg', 'cough, lying down, agg'],
  'cough talking': ['cough, talking', 'cough, speaking'],
  'cough laughing': ['cough, laughing'],
  // Tabacum: motion sickness + pallor + cold sweat
  'deathly pale': ['face, discoloration, pale, deathly', 'face, pale'],
  'pallor': ['face, discoloration, pale', 'face, pale'],
  'worse opening eyes': ['vertigo, opening eyes, on', 'generalities, eyes, opening, agg'],
  'nausea deathly': ['stomach, nausea, deathly', 'stomach, nausea'],
  'riding carriage': ['stomach, nausea, riding, carriage', 'generalities, riding, in a carriage, agg'],
  // Medorrhinum: sleep abdomen + sea + worse morning
  'sleep abdomen prone': ['sleep, position, abdomen', 'sleep, position, stomach'],
  'prone sleep': ['sleep, position, abdomen', 'sleep, position, stomach'],
  'sea amel': ['generalities, sea, amel', 'generalities, seaside, amel'],
  'seashore': ['generalities, sea, amel', 'generalities, seaside, amel'],
  'better seashore': ['generalities, sea, amel', 'generalities, seaside, amel'],
  'sea amel': ['generalities, sea, amel'],
  // Motion sickness / Tab
  'motion sickness': ['stomach, nausea, riding, in a carriage or on the cars', 'generalities, riding, in a vehicle, agg'],
  'worse opening eyes': ['generalities, opening eyes, agg', 'vertigo, opening eyes, on'],
  'sinking empty feeling': ['stomach, emptiness, weak feeling', 'stomach, sinking, empty'],
  // Tub specifics
  'desire cold milk': ['stomach, desires, milk, cold', 'stomach, desires, milk'],
  'ringworm': ['skin, eruptions, ringworm', 'skin, herpes, circinatus'],
  // Mag-p specifics
  'right side worse': ['generalities, side, right', 'generalities, right'],
  'pain shooting lightning': ['generalities, pain, shooting', 'generalities, pain, lightning-like'],
  'better sea': ['generalities, sea, amel', 'generalities, seaside, amel'],
  'worse morning better evening': ['generalities, morning, agg', 'generalities, evening, amel'],
  // Tuberculinum: travel desire + emaciation + catches cold
  'desire travel change': ['mind, travel, desire to', 'mind, restlessness'],
  'catches cold easily': ['generalities, cold, taking cold, tendency', 'generalities, cold, tendency to take'],
  'emaciation appetite': ['appetite, ravenous, emaciation, with', 'generalities, emaciation'],
  'glands enlarged': ['external throat, induration of glands', 'external throat, swelling, cervical glands'],
  'glands swollen': ['external throat, swelling, cervical glands', 'generalities, swelling, glands'],
  // Mag-p: cramps spasms + warmth amel + bending double
  'cramps spasms': ['stomach, pain, cramping', 'abdomen, pain, cramping', 'extremities, cramps'],
  'cramps menstrual': ['genitalia female, pain, menses, during', 'abdomen, pain, cramping, menses'],
  'warmth amel': ['generalities, warm, amel', 'generalities, heat, amel'],
  'hot applications': ['generalities, heat, amel', 'generalities, warm, applications, amel'],
  'lightning pain': ['generalities, pain, shooting', 'extremities, pain, shooting'],
  'shooting pain': ['generalities, pain, shooting', 'extremities, pain, shooting'],
  // Ferrum: anemia + face flushing + slow walking
  'face flushing': ['face, discoloration, red, flushing easily', 'face, discoloration, red, exertion, after'],
  'face red exertion': ['face, discoloration, red, exertion, after'],
  'slow walking': ['generalities, walking, slowly, amel'],
  'anemia pale': ['head, anemia of the brain', 'face, discoloration, pale', 'clinical, anemia'],
  'vomiting after eating': ['stomach, vomiting, eating, after'],
  // Carc — нет в реперториуме, но constellation даст бонус через miasm
  'perfectionist others': ['mind, conscientious, about trifles', 'mind, fastidious'],
  'suppressed emotions': ['mind, ailments from, emotions, suppressed'],
  'always smiling': ['mind, cheerfulness, alternating with sadness'],
}

function findRubrics(data: MDRIData, query: string, cache: Map<string, MDRIRepertoryRubric[]>): MDRIRepertoryRubric[] {
  const q = query.toLowerCase()
  if (cache.has(q)) return cache.get(q)!

  // Скоринг кандидатов: rubric index → score
  const scores = new Map<number, number>()

  // Стоп-слова — общие слова которые не несут диагностической информации
  const STOP_WORDS = new Set(['the', 'and', 'for', 'from', 'with', 'has', 'not', 'but', 'does', 'any', 'all', 'are', 'was', 'been', 'have', 'will', 'can', 'his', 'her', 'she', 'him', 'its', 'that', 'this', 'what', 'when', 'where', 'who', 'how', 'very', 'much', 'more', 'also', 'like', 'just', 'even', 'well', 'too', 'than', 'only', 'then', 'they', 'them', 'some', 'into', 'over', 'such', 'does', 'did', 'had', 'way'])

  // === Собрать все слова запроса ===
  const rawWords = q.replace(/[,;()]/g, ' ').split(/\s+/).map(w => w.replace(/[.,;()]/g, '')).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  // Уникальные слова
  const qWords = [...new Set(rawWords)]

  // === Слой 1: SEMANTIC_MAP — прямой маппинг (высший приоритет) ===
  // Проверяем все ключи SEMANTIC_MAP — и полное совпадение, и частичное
  for (const [key, paths] of Object.entries(SEMANTIC_MAP)) {
    // Проверяем: query содержит ключ ИЛИ ключ содержит query ИЛИ значимые слова совпадают
    const keyWords = key.split(/\s+/)
    const keyMatch = q.includes(key) || key.includes(q)
      || (keyWords.length <= 2 && keyWords.every(kw => qWords.some(qw => qw.includes(kw) || kw.includes(qw))))
    if (!keyMatch) continue

    for (const path of paths) {
      const pathWords = path.toLowerCase().split(/[,\s]+/).filter(w => w.length > 2)
      if (pathWords.length === 0) continue

      // Найти рубрики через wordIndex, ищем пересечение слов пути
      let pathCandidates: Set<number> | null = null
      for (const pw of pathWords) {
        const idx = data.wordIndex.get(pw)
        if (!idx) continue
        if (!pathCandidates) {
          pathCandidates = new Set(idx)
        } else {
          const inter = new Set<number>()
          for (const i of idx) { if (pathCandidates.has(i)) inter.add(i) }
          if (inter.size > 0) pathCandidates = inter
          // Если пересечение пустое — оставляем предыдущий набор
        }
      }
      if (pathCandidates) {
        for (const i of pathCandidates) {
          const r = data.repertory[i]
          const rl = r.rubric.toLowerCase()
          // Проверяем что все слова пути есть в рубрике
          const matched = pathWords.filter(w => rl.includes(w)).length
          if (matched >= Math.ceil(pathWords.length * 0.7)) {
            const sizeBonus = r.remedies.length >= 5 && r.remedies.length <= 100 ? 15
              : r.remedies.length > 100 ? 8 : 5
            const precision = matched === pathWords.length ? 20 : 0
            const s = 80 + sizeBonus + precision // Высокий базовый score для SEMANTIC_MAP
            scores.set(i, Math.max(scores.get(i) ?? 0, s))
          }
        }
      }
    }
  }

  // === Слой 2: Union word search — каждое слово вносит кандидатов ===
  // Собираем ВСЕ рубрики где есть хотя бы одно слово запроса, ранжируем по overlap
  const wordHits = new Map<number, number>() // rubric index → count of matched words
  for (const qw of qWords) {
    const idx = data.wordIndex.get(qw)
    if (!idx) continue
    for (const i of idx) {
      wordHits.set(i, (wordHits.get(i) ?? 0) + 1)
    }
  }

  // Ранжирование кандидатов по overlap
  for (const [i, hitCount] of wordHits) {
    // Минимум 1 слово совпало — пропускаем только если query длинный и совпало мало
    if (qWords.length > 3 && hitCount === 1) continue

    const r = data.repertory[i]
    const rl = r.rubric.toLowerCase()

    // Точный подсчёт: сколько слов запроса реально есть в тексте рубрики (не только wordIndex)
    let realMatch = 0
    for (const qw of qWords) {
      if (rl.includes(qw)) realMatch++
    }
    if (realMatch === 0) continue

    // Scoring
    const overlap = realMatch / qWords.length // 0..1
    const wordScore = realMatch * 12

    // Бонус за размер рубрики: специфичные рубрики (3-30) гораздо ценнее общих (100+)
    const remCount = r.remedies.length
    const sizeBonus = remCount >= 3 && remCount <= 15 ? 20   // Очень специфичная
      : remCount > 15 && remCount <= 50 ? 15                 // Специфичная
      : remCount > 50 && remCount <= 100 ? 10                // Средняя
      : remCount > 100 && remCount <= 200 ? 5                // Общая
      : remCount > 200 ? 2                                   // Слишком общая
      : 8                                                    // 1-2 препарата

    // Бонус за релевантный chapter
    const chapterBonus = rl.startsWith('mind') ? 8
      : rl.startsWith('generalities') ? 8
      : rl.startsWith('stomach') ? 5
      : rl.startsWith('sleep') ? 5
      : rl.startsWith('perspiration') ? 5
      : rl.startsWith('skin') ? 4
      : 0

    // Бонус за высокий overlap
    const overlapBonus = overlap >= 0.8 ? 20 : overlap >= 0.5 ? 10 : 0

    const s = wordScore + sizeBonus + chapterBonus + overlapBonus
    scores.set(i, Math.max(scores.get(i) ?? 0, s))
  }

  // === Слой 3: Synonym expansion — расширяем через SYNONYM_MAP ===
  // Находим подходящие ключи синонимов
  const matchedSynKeys = new Set<string>()
  for (const qw of qWords) {
    const keys = SYNONYM_WORD_INDEX.get(qw)
    if (keys) {
      for (const k of keys) matchedSynKeys.add(k)
    }
  }
  // Для каждого ключа синонимов — добавляем его синонимы как дополнительные поисковые запросы
  for (const synKey of matchedSynKeys) {
    // Проверяем что ключ действительно релевантен (хотя бы 1 ключевое слово из query)
    const keyWords = synKey.split(/\s+/)
    const relevance = keyWords.filter(kw => qWords.some(qw => qw.includes(kw) || kw.includes(qw))).length
    if (relevance === 0) continue

    const synonyms = SYNONYM_MAP[synKey]
    if (!synonyms) continue

    for (const syn of synonyms) {
      const synWords = syn.split(/\s+/).filter(w => w.length > 2)
      // Ищем рубрики через первое слово синонима
      for (const sw of synWords) {
        const idx = data.wordIndex.get(sw)
        if (!idx) continue
        for (const i of idx) {
          const r = data.repertory[i]
          const rl = r.rubric.toLowerCase()
          // Считаем сколько слов синонима нашлось в рубрике
          const matched = synWords.filter(w => rl.includes(w)).length
          if (matched >= Math.max(1, Math.ceil(synWords.length * 0.5))) {
            const sizeBonus = r.remedies.length >= 5 && r.remedies.length <= 100 ? 8 : 3
            const s = 40 + matched * 8 + sizeBonus // Ниже чем SEMANTIC_MAP, но добавляет кандидатов
            scores.set(i, Math.max(scores.get(i) ?? 0, s))
          }
        }
        break // Только первое слово для поиска, остальные для фильтрации
      }
    }
  }

  // === Слой 4: Taxonomy Parser — как дополнительный источник ===
  const parsed = parseSymptom(q)
  const searchTerms = buildRubricPaths(parsed)
  for (const term of searchTerms) {
    const termWords = term.split(/[,\s]+/).map(w => w.trim()).filter(w => w.length > 2)
    if (termWords.length === 0) continue

    // Union search по словам терма
    for (const tw of termWords) {
      const idx = data.wordIndex.get(tw)
      if (!idx) continue
      for (const i of idx) {
        const r = data.repertory[i]
        const rl = r.rubric.toLowerCase()
        const matched = termWords.filter(w => rl.includes(w)).length
        if (matched >= 1) {
          const sizeBonus = r.remedies.length >= 5 && r.remedies.length <= 100 ? 8 : 3
          const s = 30 + matched * 8 + sizeBonus
          scores.set(i, Math.max(scores.get(i) ?? 0, s))
        }
      }
    }
  }

  // === Сортировка, дедупликация, top-10 ===
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1])
  const seen = new Set<string>()
  const result: MDRIRepertoryRubric[] = []
  for (const [i] of sorted) {
    const r = data.repertory[i]
    if (!seen.has(r.rubric)) {
      seen.add(r.rubric)
      result.push(r)
    }
    if (result.length >= 10) break
  }

  cache.set(q, result)
  return result
}

// (старый keyword matching удалён — заменён taxonomy parser выше)

function kentScore(data: MDRIData, symptoms: MDRISymptom[], cache: Map<string, MDRIRepertoryRubric[]>): Record<string, number> {
  const scores: Record<string, number> = {}
  for (const sym of symptoms) {
    if (!sym.present) continue
    const matches = findRubrics(data, sym.rubric, cache)
    for (const match of matches) {
      const rubricSize = match.remedies.length
      const totalRemedies = 2432
      const rawIdf = Math.log2(Math.max(totalRemedies, 1) / Math.max(rubricSize, 1))
      const idf = Math.pow(rawIdf, 1.8)
      for (const rem of match.remedies) {
        // Grade 1 в маленькой рубрике = слабое доказательство → cap IDF
        const effectiveIdf = rem.grade >= 2 ? idf : Math.min(idf, 30)
        scores[rem.abbrev] = (scores[rem.abbrev] ?? 0) + rem.grade * sym.weight * effectiveIdf
      }
    }
  }
  if (Object.keys(scores).length === 0) return scores

  // Динамический anti-domination: плавная функция от количества рубрик
  // Используем remedyRubricCount (общее кол-во рубрик где препарат присутствует)
  // penalty = 1 / (1 + (count/median)^exponent)
  // MEDIAN динамический: ~4% от общего количества рубрик
  const totalRubrics = data.repertory.length
  const MEDIAN_COUNT = Math.max(3000, Math.round(totalRubrics * 0.04))
  const AD_EXPONENT = 0.8
  for (const remAbbrev of Object.keys(scores)) {
    const count = data.remedyRubricCount.get(remAbbrev) ?? 0
    if (count > 100) {
      const penalty = 1 / (1 + Math.pow(count / MEDIAN_COUNT, AD_EXPONENT))
      scores[remAbbrev] *= penalty
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

  const totalRemedies = 2432
  for (const sym of present) {
    const matches = findRubrics(data, sym.rubric, cache)
    const sw = (catW[sym.category] ?? 1) * sym.weight
    for (const match of matches) {
      // IDF — специфичная рубрика важнее общей
      const rawIdf = Math.log2(Math.max(totalRemedies, 1) / Math.max(match.remedies.length, 1))
      const idf = Math.pow(rawIdf, 1.2) // Мягче чем в Kent (1.2 vs 1.8)
      for (const rem of match.remedies) {
        scores[rem.abbrev] = (scores[rem.abbrev] ?? 0) + (sw * rem.grade * idf) / totalW
      }
    }
  }

  // Anti-domination — динамический, масштабируется с размером реперториума
  const MEDIAN_COUNT_H = Math.max(3000, Math.round(data.repertory.length * 0.04))
  for (const remAbbrev of Object.keys(scores)) {
    const count = data.remedyRubricCount.get(remAbbrev) ?? 0
    if (count > 100) {
      const penalty = 1 / (1 + Math.pow(count / MEDIAN_COUNT_H, 0.5)) // Мягче чем в Kent
      scores[remAbbrev] *= penalty
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

  // Собираем кандидатов через wordIndex + синонимы
  for (const p of present) {
    const pWords = new Set(p.split(' ').filter(w => w.length > 2))
    for (const pw of pWords) {
      const idx = data.constellationWordIndex.get(pw)
      if (idx) {
        for (const [remedy] of idx) candidates.add(remedy)
      }
      const synKeys = SYNONYM_WORD_INDEX.get(pw)
      if (synKeys) {
        for (const synKey of synKeys) {
          for (const synWord of synKey.split(' ')) {
            const synIdx = data.constellationWordIndex.get(synWord)
            if (synIdx) {
              for (const [remedy] of synIdx) candidates.add(remedy)
            }
          }
        }
      }
    }
  }

  // Для каждого кандидата — rarity-weighted match score
  for (const remedy of candidates) {
    const con = data.constellations[remedy]
    if (!con?.clusters) continue

    // Rarity-weighted constellation matching:
    // Специфичный симптом ("one cheek red other pale") ценнее общего ("restlessness")
    // Rarity оценивается по длине target (больше слов = более специфичный)
    let weightedMatch = 0
    let weightedTotal = 0
    let fullMatches = 0

    for (const cluster of con.clusters) {
      for (const sym of cluster.symptoms) {
        const symWords = sym.rubric.toLowerCase().split(' ').filter(w => w.length > 2)
        // Rarity: 1-слово = 1.0, 2-слова = 1.3, 3+ = 1.6
        const rarity = 1.0 + Math.min(symWords.length - 1, 3) * 0.2
        const w = sym.weight * rarity * cluster.importance
        weightedTotal += w

        if (present.some(p => symMatch(p, sym.rubric))) {
          weightedMatch += w
          fullMatches++
        } else {
          // Partial: >=1 значимое слово, >=2 для длинных targets
          const matched = present.some(p => {
            const tWords = sym.rubric.toLowerCase().split(' ').filter(tw => tw.length > 3)
            const pWords = p.split(' ').filter(pw => pw.length > 3)
            const mc = tWords.filter(tw => pWords.some(pw => pw.includes(tw) || tw.includes(pw))).length
            return tWords.length > 0 && mc >= (tWords.length >= 3 ? 2 : 1)
          })
          if (matched) {
            weightedMatch += w * 0.3 // Partial = 30%
          }
        }
      }
    }

    let score = weightedTotal > 0 ? weightedMatch / weightedTotal : 0

    // SQN: все sine_qua_non совпали → аддитивный бонус пропорциональный
    if (con.sine_qua_non?.length) {
      const sqnMatched = con.sine_qua_non.filter(sqn =>
        present.some(p => symMatch(p, sqn))
      ).length
      score = Math.min(1.0, score + (sqnMatched / con.sine_qua_non.length) * 0.15)
    }

    scores[remedy] = score
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
