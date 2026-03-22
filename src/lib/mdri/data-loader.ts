// Загрузка данных MDRI из Supabase с кешированием в памяти
// Реперториум берётся из таблицы repertory_rubrics (уже в Supabase)
// Кластеры и полярности — из mdri_constellations / mdri_polarities

import { createServiceClient } from '@/lib/supabase/service'
import { buildIndices } from './engine'
import type { MDRIData } from './engine'
import type {
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIRemedyRelationships, MDRIClinicalData,
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
    consistency_groups: {},
  }
  for (const row of clinicalRes.data ?? []) {
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
    if (row.type === 'thermal_contradiction') {
      // d = { chilly: [...remedies] } или { hot_patient: [...remedies] }
      for (const [key, remedies] of Object.entries(d)) {
        const thermal = key === 'chilly' ? 'hot' as const : 'chilly' as const
        for (const rem of remedies as string[]) {
          clinicalData.thermal_contradictions[rem] = thermal
        }
      }
    } else if (row.type === 'consistency_group') {
      // d = { name, symptoms, remedy }
      const remedy = d.remedy as string
      if (!clinicalData.consistency_groups[remedy]) {
        clinicalData.consistency_groups[remedy] = []
      }
      clinicalData.consistency_groups[remedy].push({
        name: d.name as string,
        symptoms: d.symptoms as string[],
      })
    }
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
