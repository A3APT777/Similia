// Загрузка данных MDRI из Supabase с кешированием в памяти
// Реперториум берётся из таблицы repertory_rubrics (уже в Supabase)
// Кластеры и полярности — из mdri_constellations / mdri_polarities

import { createServiceClient } from '@/lib/supabase/service'
import { buildIndices } from './engine'
import type { MDRIData } from './engine'
import type {
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIRemedyRelationships, MDRIClinicalData,
  ConsistencyGroup, ConsistencyCondition,
} from './types'

// Кеш в памяти — живёт пока жив серверный процесс
let cachedData: MDRIData | null = null
let cacheTimestamp = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 час

// Связи препаратов (статичные, не меняются)
const RELATIONSHIPS: Record<string, MDRIRemedyRelationships> = {
  'sulph': { follows_well: ['acon', 'aloe', 'ars', 'calc', 'lyc', 'merc', 'nux-v', 'puls', 'sep', 'sil'], complementary: ['calc', 'lyc', 'puls', 'sep'], antidotes: ['acon', 'camph', 'cham', 'chin', 'merc', 'puls', 'rhus-t', 'sep', 'sil'] },
  'calc': { follows_well: ['bell', 'nit-ac', 'nux-v', 'puls', 'sulph'], complementary: ['bell', 'lyc', 'phos', 'sil', 'sulph'], antidotes: ['bry', 'camph', 'chin', 'nit-ac', 'nux-v', 'sulph'] },
  'lyc': { follows_well: ['calc', 'carb-v', 'graph', 'lach', 'puls', 'sep', 'sulph'], complementary: ['calc', 'iod', 'lach', 'sulph'], antidotes: ['acon', 'camph', 'caust', 'cham', 'graph', 'puls'] },
  'nat-m': { follows_well: ['apis', 'bry', 'calc', 'ign', 'sep'], complementary: ['apis', 'ign', 'sep'], antidotes: ['ars', 'camph', 'nit-s-d', 'phos'] },
  'sep': { follows_well: ['bell', 'calc', 'lyc', 'nat-m', 'nux-v', 'puls', 'sil', 'sulph'], complementary: ['nat-m', 'nux-v', 'sulph'], antidotes: ['acon', 'ant-c', 'ant-t'] },
  'phos': { follows_well: ['ars', 'calc', 'carb-v', 'chin', 'lyc', 'nux-v', 'sep', 'sil', 'sulph'], complementary: ['ars', 'calc', 'lyc', 'sil'], antidotes: ['coff', 'nux-v', 'ter'] },
  'ars': { follows_well: ['acon', 'bell', 'chin', 'ip', 'lach', 'nux-v', 'phos', 'sulph', 'verat'], complementary: ['carb-v', 'phos', 'thuj'], antidotes: ['camph', 'chin', 'graph', 'hep', 'ip', 'nux-v'] },
  'puls': { follows_well: ['acon', 'ant-c', 'bry', 'bell', 'ign', 'lyc', 'sep', 'sil', 'sulph'], complementary: ['kali-m', 'lyc', 'sil', 'sulph'], antidotes: ['bell', 'cham', 'coff', 'ign', 'nux-v'] },
  'lach': { follows_well: ['ars', 'bell', 'carb-v', 'hep', 'lyc', 'nit-ac', 'phos', 'sulph'], complementary: ['hep', 'lyc', 'nit-ac', 'sal-ac'], antidotes: ['ars', 'bell', 'carb-v', 'coff', 'hep', 'merc', 'nux-v'] },
  'med': { follows_well: ['sulph', 'thuj', 'puls'], complementary: ['thuj', 'sulph'], antidotes: ['ip'] },
  'psor': { follows_well: ['sulph', 'bor'], complementary: ['sulph', 'tub'], antidotes: [] },
  'tub': { follows_well: ['calc', 'phos', 'puls'], complementary: ['calc-p', 'chin'], antidotes: [] },
  'carc': { follows_well: ['phos', 'nat-m', 'sep', 'staph'], complementary: ['phos', 'nat-m'], antidotes: [] },
  'nux-v': { follows_well: ['bry', 'puls', 'sep', 'sulph'], complementary: ['sep', 'sulph'], antidotes: ['acon', 'bell', 'camph', 'cham', 'coff', 'puls'] },
  'ign': { follows_well: ['bell', 'calc', 'chin', 'lyc', 'nat-m', 'puls', 'sep', 'sil'], complementary: ['nat-m'], antidotes: ['arn', 'camph', 'cham', 'coff', 'puls'] },
  'bell': { follows_well: ['ars', 'bor', 'calc', 'chin', 'con', 'dulc', 'hep', 'lach', 'merc', 'nit-ac', 'puls', 'rhus-t', 'sep', 'sulph'], complementary: ['calc'], antidotes: ['camph', 'coff', 'hep', 'hyos', 'op', 'puls'] },
  'sil': { follows_well: ['calc', 'graph', 'hep', 'lyc', 'phos', 'puls', 'sep', 'sulph', 'thuj'], complementary: ['fl-ac', 'lyc', 'puls', 'thuj'], antidotes: ['camph', 'fl-ac', 'hep'] },
}

/**
 * Загрузить данные MDRI — с кешем в памяти
 */
export async function loadMDRIData(): Promise<MDRIData> {
  const now = Date.now()
  if (cachedData && now - cacheTimestamp < CACHE_TTL) {
    return cachedData
  }

  const supabase = createServiceClient()

  // Параллельная загрузка всех данных
  const [repertoryRes, constellationsRes, polaritiesRes, clinicalRes] = await Promise.all([
    supabase
      .from('repertory_rubrics')
      .select('fullpath, chapter, remedies')
      .in('source', ['publicum', 'kent']),
    supabase
      .from('mdri_constellations')
      .select('*'),
    supabase
      .from('mdri_polarities')
      .select('*'),
    supabase
      .from('mdri_clinical_data')
      .select('type, data'),
  ])

  // Реперториум → формат MDRI
  const repertory: MDRIRepertoryRubric[] = (repertoryRes.data ?? []).map(
    (r: { fullpath: string; chapter: string; remedies: { abbrev: string; grade: number }[] }) => ({
      rubric: r.fullpath,
      chapter: r.chapter,
      remedies: r.remedies,
    })
  )

  // Кластеры → Record по remedy
  const constellations: Record<string, MDRIConstellationData> = {}
  for (const row of constellationsRes.data ?? []) {
    constellations[row.remedy] = {
      name: row.name,
      clusters: row.clusters,
      sine_qua_non: row.sine_qua_non ?? [],
      excluders: row.excluders ?? [],
    }
  }

  // Полярности → Record по remedy
  const polarities: Record<string, MDRIPolarityData> = {}
  for (const row of polaritiesRes.data ?? []) {
    polarities[row.remedy] = row.polarities
  }

  // Клинические данные → MDRIClinicalData
  const clinicalData: MDRIClinicalData = {
    thermal_contradictions: {},
    consistency_groups: [],
  }
  for (const row of clinicalRes.data ?? []) {
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
    if (row.type === 'thermal_contradiction') {
      for (const [key, remedies] of Object.entries(d)) {
        const thermal = key === 'chilly' ? 'hot' as const : 'chilly' as const
        for (const rem of remedies as string[]) {
          clinicalData.thermal_contradictions[rem] = thermal
        }
      }
    } else if (row.type === 'consistency_group') {
      // Конвертировать старый формат {symptoms: string[]} → новый {core, optional}
      const remedy = d.remedy as string
      const symptoms = d.symptoms as string[]
      const group = convertToConsistencyGroup(remedy, d.name as string, symptoms)
      clinicalData.consistency_groups.push(group)
    }
  }

  // Конвертер: старый формат симптомов → ConsistencyCondition[]
  function convertToConsistencyGroup(remedy: string, name: string, symptoms: string[]): ConsistencyGroup {
    const core: ConsistencyCondition[] = []
    const optional: ConsistencyCondition[] = []

    for (let i = 0; i < symptoms.length; i++) {
      const s = symptoms[i].toLowerCase()
      const cond = parseSymptomToCondition(s)
      if (cond) {
        // Первые 2 симптома = core, остальные = optional
        if (i < 2) core.push(cond)
        else optional.push(cond)
      }
    }

    return { remedy, name, core, optional }
  }

  function parseSymptomToCondition(s: string): ConsistencyCondition | null {
    // Thermal
    if (s.includes('chilly') || s.includes('cold extreme')) return { type: 'thermal', value: 'chilly' }
    if (s.includes('hot patient') || s.includes('heat agg')) return { type: 'thermal', value: 'hot' }
    // Consolation
    if (s.includes('consolation agg')) return { type: 'consolation', value: 'agg' }
    if (s.includes('consolation amel')) return { type: 'consolation', value: 'amel' }
    // Company
    if (s.includes('company desire') || s.includes('desire company')) return { type: 'company', value: 'desire' }
    if (s.includes('company aversion') || s.includes('aversion company')) return { type: 'company', value: 'aversion' }
    // Thirst
    if (s.includes('thirstless') || s.includes('no thirst')) return { type: 'thirst', value: 'thirstless' }
    if (s.includes('thirst large') || s.includes('thirst cold')) return { type: 'thirst', value: 'large' }
    if (s.includes('small sip')) return { type: 'thirst', value: 'small_sips' }
    // Modalities
    if (s.includes('motion agg') || s.includes('worse motion') || s.includes('slightest motion')) return { type: 'modality', value: 'motion_agg' }
    if (s.includes('motion amel') || s.includes('motion vigorous')) return { type: 'modality', value: 'motion_amel' }
    if (s.includes('rest agg')) return { type: 'modality', value: 'rest_agg' }
    if (s.includes('first motion agg')) return { type: 'modality', value: 'first_motion_agg' }
    if (s.includes('cold damp')) return { type: 'modality', value: 'cold_damp_agg' }
    if (s.includes('cold application') || s.includes('cold amel')) return { type: 'modality', value: 'cold_amel' }
    if (s.includes('open air')) return { type: 'modality', value: 'open_air_amel' }
    if (s.includes('sea amel')) return { type: 'modality', value: 'sea_amel' }
    if (s.includes('pressure amel')) return { type: 'modality', value: 'pressure_amel' }
    // Mental
    if (s.includes('grief') && s.includes('suppress')) return { type: 'mental', value: 'grief' }
    if (s.includes('grief') && s.includes('apathy')) return { type: 'mental', value: 'grief' }
    if (s.includes('grief') && s.includes('acute')) return { type: 'mental', value: 'grief' }
    if (s.includes('anxiety') && s.includes('anticipat')) return { type: 'mental', value: 'anticipation' }
    if (s.includes('anxiety') && s.includes('midnight')) return { type: 'mental', value: 'anxiety' }
    if (s.includes('irritab')) return { type: 'mental', value: 'irritability' }
    if (s.includes('jealous')) return { type: 'mental', value: 'jealousy' }
    if (s.includes('indifferen')) return { type: 'mental', value: 'indifference' }
    if (s.includes('restless')) return { type: 'mental', value: 'restlessness' }
    if (s.includes('weep')) return { type: 'mental', value: 'weeping' }
    if (s.includes('sighing')) return { type: 'mental', value: 'sighing' }
    if (s.includes('suicid')) return { type: 'mental', value: 'suicidal' }
    if (s.includes('fear') && s.includes('death')) return { type: 'mental', value: 'fear_death' }
    if (s.includes('fear') && s.includes('alone')) return { type: 'mental', value: 'fear_alone' }
    if (s.includes('fear') && s.includes('dark')) return { type: 'mental', value: 'fear_dark' }
    if (s.includes('fear') && s.includes('thunder')) return { type: 'mental', value: 'fear_thunderstorm' }
    if (s.includes('fear') && s.includes('height')) return { type: 'mental', value: 'fear_heights' }
    if (s.includes('haughti') || s.includes('contempt')) return { type: 'mental', value: 'haughtiness' }
    if (s.includes('hurry') || s.includes('impatien')) return { type: 'mental', value: 'hurry' }
    if (s.includes('mood') && s.includes('alter')) return { type: 'mental', value: 'mood_alternating' }
    if (s.includes('suppress') && (s.includes('anger') || s.includes('indignat'))) return { type: 'mental', value: 'suppressed_anger' }
    if (s.includes('humiliat')) return { type: 'mental', value: 'humiliation' }
    if (s.includes('secretiv')) return { type: 'mental', value: 'secretive' }
    if (s.includes('violen')) return { type: 'mental', value: 'violence' }
    if (s.includes('stammer')) return { type: 'mental', value: 'stammering' }
    if (s.includes('globus')) return { type: 'mental', value: 'sighing' }
    if (s.includes('paradox')) return { type: 'mental', value: 'mood_alternating' }
    // Desires
    if (s.includes('desire') && s.includes('salt')) return { type: 'desire', value: 'salt' }
    if (s.includes('desire') && s.includes('sweet')) return { type: 'desire', value: 'sweets' }
    if (s.includes('desire') && s.includes('sour') || s.includes('vinegar')) return { type: 'desire', value: 'sour' }
    if (s.includes('desire') && s.includes('stimul')) return { type: 'desire', value: 'stimulants' }
    if (s.includes('desire') && s.includes('egg')) return { type: 'desire', value: 'eggs' }
    if (s.includes('desire') && s.includes('cold') && s.includes('drink')) return { type: 'desire', value: 'cold_drinks' }
    if (s.includes('desire') && s.includes('warm') && s.includes('drink')) return { type: 'desire', value: 'warm_drinks' }
    if (s.includes('desire') && s.includes('juicy')) return { type: 'desire', value: 'juicy' }
    if (s.includes('desire') && s.includes('fan')) return { type: 'desire', value: 'fanned' }
    // Aversions
    if (s.includes('aversion') && s.includes('fish')) return { type: 'aversion', value: 'fish' }
    if (s.includes('aversion') && s.includes('bath')) return { type: 'aversion', value: 'bathing' }
    // Time
    if (s.includes('2-4') || s.includes('2') && s.includes('4') && s.includes('am')) return { type: 'time', value: 'worse_2_4am' }
    if (s.includes('4-8') || s.includes('4') && s.includes('8') && s.includes('pm')) return { type: 'time', value: 'worse_4_8pm' }
    if (s.includes('after sleep') && s.includes('worse')) return { type: 'time', value: 'after_sleep_worse' }
    if (s.includes('morning') && s.includes('agg')) return { type: 'time', value: 'worse_morning' }
    if (s.includes('night') && s.includes('worse')) return { type: 'time', value: 'worse_night' }
    // Side
    if (s.includes('right side')) return { type: 'side', value: 'right' }
    if (s.includes('left side')) return { type: 'side', value: 'left' }
    // Sleep
    if (s.includes('abdomen') && s.includes('sleep')) return { type: 'sleep', value: 'on_abdomen' }
    if (s.includes('after sleep') && s.includes('worse')) return { type: 'sleep', value: 'after_sleep_worse' }
    // Perspiration
    if (s.includes('perspir') && s.includes('feet')) return { type: 'perspiration', value: 'feet' }
    if (s.includes('perspir') && s.includes('head')) return { type: 'perspiration', value: 'head' }
    if (s.includes('sweat') && s.includes('forehead')) return { type: 'perspiration', value: 'forehead' }
    // Onset
    if (s.includes('sudden')) return { type: 'onset', value: 'sudden' }
    // Keynote fallback — если не распознано, используем как keynote
    return { type: 'keynote', value: s }
  }

  // Построить индексы
  const { wordIndex, constellationWordIndex, remedyRubricCount } = buildIndices(repertory, constellations)

  cachedData = {
    repertory,
    constellations,
    polarities,
    relationships: RELATIONSHIPS,
    wordIndex,
    constellationWordIndex,
    remedyRubricCount,
    clinicalData,
  }
  cacheTimestamp = now

  return cachedData
}

/**
 * Сбросить кеш (после обновления данных)
 */
export function invalidateMDRICache() {
  cachedData = null
  cacheTimestamp = 0
}
