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

// Оценить consistency группу
function evaluateConsistency(caseData: CaseData, group: ConsistencyGroup): { score: number; coreMatch: boolean } {
  // Проверить core — все должны совпасть
  const coreMatches = group.core.filter(c => checkCondition(c, caseData)).length
  const coreTotal = group.core.length
  const coreMatch = coreTotal > 0 && coreMatches === coreTotal

  if (!coreMatch && coreTotal > 0) {
    return { score: 0, coreMatch: false }
  }

  // Optional — каждое совпадение добавляет бонус
  const optMatches = group.optional.filter(c => checkCondition(c, caseData)).length
  const optTotal = group.optional.length

  // Score: core совпало → базовый 0.5, + optional пропорционально
  const optBonus = optTotal > 0 ? (optMatches / optTotal) * 0.5 : 0
  const score = coreMatch ? 0.5 + optBonus : 0

  return { score, coreMatch }
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

  // === Этап 4: Constellation + Consistency (boolean-логика) ===
  const conScores = constellationScore(data, symptoms)
  const consistencyGroupsList = data.clinicalData?.consistency_groups ?? []

  // Извлечь структурированные данные из кейса (один раз)
  const caseData = extractCaseData(symptoms, modalities)

  // Рассчитать consistency через evaluateConsistency (без symMatch)
  const conAdjusted: Record<string, number> = {}
  for (const rem of Object.keys(baseKent)) {
    if (excluded.has(rem)) continue
    const rawCon = conScores[rem] ?? 0

    // Найти consistency group для этого препарата
    const group = consistencyGroupsList.find(g => g.remedy === rem)
    let consistencyBonus = 0

    if (group) {
      const { score: conScore, coreMatch } = evaluateConsistency(caseData, group)
      if (coreMatch) {
        // Core совпало → сильный бонус (0.15-0.30)
        consistencyBonus = conScore * 0.30
      } else if (conScore > 0) {
        // Частичное совпадение → слабый бонус
        consistencyBonus = conScore * 0.10
      }
    }

    conAdjusted[rem] = rawCon * (1 + consistencyBonus)
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

// --- Вспомогательные функции ---

function getWeights(hasMiasm: boolean) {
  if (hasMiasm) {
    return { kent: 0.112, polarity: 0.094, hierarchy: 0.096, constellation: 0.26, negative: 0.096, outcome: 0.048, miasm: 0.202 }
  }
  return { kent: 0.14, polarity: 0.134, hierarchy: 0.12, constellation: 0.26, negative: 0.096, outcome: 0.048, miasm: 0.061 }
}

function findRubrics(data: MDRIData, query: string, cache: Map<string, MDRIRepertoryRubric[]>): MDRIRepertoryRubric[] {
  const q = query.toLowerCase()
  if (cache.has(q)) return cache.get(q)!

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
