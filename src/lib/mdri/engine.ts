// MDRI Engine v3 — Multi-Dimensional Remedy Intelligence (TypeScript port)

import { symMatch, SYNONYM_MAP, SYNONYM_WORD_INDEX } from './synonyms'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile, MDRIResult,
  MDRILensResult, MDRIPotencyRecommendation, MDRIDifferentialNote,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIRemedyRelationships, MDRIClinicalData,
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

  // === Этап 4: Constellation + Consistency ===
  const conScores = constellationScore(data, symptoms)
  const consistencyGroups = data.clinicalData?.consistency_groups ?? {}

  // Рассчитать consistency bonus и fragmentation penalty для каждого кандидата
  const conAdjusted: Record<string, number> = {}
  for (const rem of Object.keys(baseKent)) {
    if (excluded.has(rem)) continue
    const rawCon = conScores[rem] ?? 0

    let consistencyBonus = 0
    let fragmentationPenalty = 0

    const groups = consistencyGroups[rem]
    if (groups && groups.length > 0) {
      // Consistency: сколько симптомов пациента совпадают с consistency_group
      let maxGroupMatch = 0
      const matchedGroupNames = new Set<string>()

      for (const group of groups) {
        let groupMatches = 0
        for (const groupSym of group.symptoms) {
          if (presentRubrics.some(p => symMatch(p, groupSym))) {
            groupMatches++
            matchedGroupNames.add(group.name)
          }
        }
        maxGroupMatch = Math.max(maxGroupMatch, groupMatches)
      }

      // Бонус пропорционально совпадениям
      if (presentSymptoms.length > 0) {
        consistencyBonus = (maxGroupMatch / presentSymptoms.length) * 0.20
      }

      // Fragmentation: если симптомы из РАЗНЫХ consistency_groups → штраф
      if (matchedGroupNames.size > 2) {
        fragmentationPenalty = (matchedGroupNames.size - 1) * 0.05
      }
    }

    conAdjusted[rem] = rawCon * (1 + consistencyBonus) * (1 - Math.min(fragmentationPenalty, 0.30))
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
