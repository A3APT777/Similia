// Загрузка данных MDRI
// ВРЕМЕННОЕ РЕШЕНИЕ: данные загружаются из JSON файлов (edge cache)
// При переезде на РФ сервер — вернуть загрузку из Supabase (см. memory/project_edge_cache_temp.md)

import { buildIndices } from './engine'
import type { MDRIData } from './engine'
import type {
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIRemedyRelationships, MDRIClinicalData,
  ConsistencyGroup, ConsistencyCondition,
} from './types'

// Кеш в памяти
let cachedData: MDRIData | null = null

// Связи препаратов (статичные)
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

// Конвертер consistency groups
function parseSymptomToCondition(s: string): ConsistencyCondition | null {
  if (s.includes('chilly') || s.includes('cold extreme')) return { type: 'thermal', value: 'chilly' }
  if (s.includes('hot patient') || s.includes('heat agg')) return { type: 'thermal', value: 'hot' }
  if (s.includes('consolation agg')) return { type: 'consolation', value: 'agg' }
  if (s.includes('consolation amel')) return { type: 'consolation', value: 'amel' }
  if (s.includes('company desire') || s.includes('desire company')) return { type: 'company', value: 'desire' }
  if (s.includes('company aversion') || s.includes('aversion company')) return { type: 'company', value: 'aversion' }
  if (s.includes('thirstless') || s.includes('no thirst')) return { type: 'thirst', value: 'thirstless' }
  if (s.includes('thirst large') || s.includes('thirst cold')) return { type: 'thirst', value: 'large' }
  if (s.includes('small sip')) return { type: 'thirst', value: 'small_sips' }
  if (s.includes('motion agg') || s.includes('worse motion') || s.includes('slightest motion')) return { type: 'modality', value: 'motion_agg' }
  if (s.includes('motion amel') || s.includes('motion vigorous')) return { type: 'modality', value: 'motion_amel' }
  if (s.includes('rest agg')) return { type: 'modality', value: 'rest_agg' }
  if (s.includes('first motion agg')) return { type: 'modality', value: 'first_motion_agg' }
  if (s.includes('cold damp')) return { type: 'modality', value: 'cold_damp_agg' }
  if (s.includes('cold application') || s.includes('cold amel')) return { type: 'modality', value: 'cold_amel' }
  if (s.includes('open air')) return { type: 'modality', value: 'open_air_amel' }
  if (s.includes('sea amel')) return { type: 'modality', value: 'sea_amel' }
  if (s.includes('pressure amel')) return { type: 'modality', value: 'pressure_amel' }
  if (s.includes('grief') && (s.includes('suppress') || s.includes('apathy') || s.includes('acute'))) return { type: 'mental', value: 'grief' }
  if (s.includes('anxiety') && s.includes('anticipat')) return { type: 'mental', value: 'anticipation' }
  if (s.includes('anxiety') && s.includes('midnight')) return { type: 'mental', value: 'anxiety' }
  if (s.includes('irritab')) return { type: 'mental', value: 'irritability' }
  if (s.includes('jealous')) return { type: 'mental', value: 'jealousy' }
  if (s.includes('indifferen')) return { type: 'mental', value: 'indifference' }
  if (s.includes('restless')) return { type: 'mental', value: 'restlessness' }
  if (s.includes('weep')) return { type: 'mental', value: 'weeping' }
  if (s.includes('sighing') || s.includes('globus')) return { type: 'mental', value: 'sighing' }
  if (s.includes('suicid')) return { type: 'mental', value: 'suicidal' }
  if (s.includes('fear') && s.includes('death')) return { type: 'mental', value: 'fear_death' }
  if (s.includes('fear') && s.includes('alone')) return { type: 'mental', value: 'fear_alone' }
  if (s.includes('fear') && s.includes('dark')) return { type: 'mental', value: 'fear_dark' }
  if (s.includes('fear') && s.includes('thunder')) return { type: 'mental', value: 'fear_thunderstorm' }
  if (s.includes('fear') && s.includes('height')) return { type: 'mental', value: 'fear_heights' }
  if (s.includes('haughti') || s.includes('contempt')) return { type: 'mental', value: 'haughtiness' }
  if (s.includes('hurry') || s.includes('impatien')) return { type: 'mental', value: 'hurry' }
  if (s.includes('mood') && s.includes('alter') || s.includes('paradox')) return { type: 'mental', value: 'mood_alternating' }
  if (s.includes('suppress') && (s.includes('anger') || s.includes('indignat'))) return { type: 'mental', value: 'suppressed_anger' }
  if (s.includes('humiliat')) return { type: 'mental', value: 'humiliation' }
  if (s.includes('secretiv')) return { type: 'mental', value: 'secretive' }
  if (s.includes('violen')) return { type: 'mental', value: 'violence' }
  if (s.includes('stammer')) return { type: 'mental', value: 'stammering' }
  if (s.includes('desire') && s.includes('salt')) return { type: 'desire', value: 'salt' }
  if (s.includes('desire') && s.includes('sweet')) return { type: 'desire', value: 'sweets' }
  if (s.includes('desire') && (s.includes('sour') || s.includes('vinegar'))) return { type: 'desire', value: 'sour' }
  if (s.includes('desire') && s.includes('stimul')) return { type: 'desire', value: 'stimulants' }
  if (s.includes('desire') && s.includes('egg')) return { type: 'desire', value: 'eggs' }
  if (s.includes('desire') && s.includes('cold') && s.includes('drink')) return { type: 'desire', value: 'cold_drinks' }
  if (s.includes('desire') && s.includes('fan')) return { type: 'desire', value: 'fanned' }
  if (s.includes('desire') && s.includes('juicy')) return { type: 'desire', value: 'juicy' }
  if (s.includes('aversion') && s.includes('fish')) return { type: 'aversion', value: 'fish' }
  if (s.includes('aversion') && s.includes('bath')) return { type: 'aversion', value: 'bathing' }
  if (s.includes('2-4') || (s.includes('2') && s.includes('4') && s.includes('am'))) return { type: 'time', value: 'worse_2_4am' }
  if (s.includes('4-8') || (s.includes('4') && s.includes('8') && s.includes('pm'))) return { type: 'time', value: 'worse_4_8pm' }
  if (s.includes('after sleep') && s.includes('worse')) return { type: 'time', value: 'after_sleep_worse' }
  if (s.includes('morning') && s.includes('agg')) return { type: 'time', value: 'worse_morning' }
  if (s.includes('night') && s.includes('worse')) return { type: 'time', value: 'worse_night' }
  if (s.includes('right side')) return { type: 'side', value: 'right' }
  if (s.includes('left side')) return { type: 'side', value: 'left' }
  if (s.includes('abdomen') && s.includes('sleep')) return { type: 'sleep', value: 'on_abdomen' }
  if (s.includes('after sleep') && s.includes('worse')) return { type: 'sleep', value: 'after_sleep_worse' }
  if (s.includes('perspir') && s.includes('feet')) return { type: 'perspiration', value: 'feet' }
  if (s.includes('perspir') && s.includes('head')) return { type: 'perspiration', value: 'head' }
  if (s.includes('sweat') && s.includes('forehead')) return { type: 'perspiration', value: 'forehead' }
  if (s.includes('sudden')) return { type: 'onset', value: 'sudden' }
  return { type: 'keynote', value: s }
}

function convertToConsistencyGroup(remedy: string, name: string, symptoms: string[]): ConsistencyGroup {
  const core: ConsistencyCondition[] = []
  const optional: ConsistencyCondition[] = []
  for (let i = 0; i < symptoms.length; i++) {
    const cond = parseSymptomToCondition(symptoms[i].toLowerCase())
    if (cond) {
      if (i < 2) core.push(cond)
      else optional.push(cond)
    }
  }
  return { remedy, name, core, optional }
}

/**
 * Загрузить данные MDRI — из edge cache (JSON при билде) или lazy load
 * ВРЕМЕННОЕ РЕШЕНИЕ для Vercel Free
 */
export async function loadMDRIData(): Promise<MDRIData> {
  if (cachedData) return cachedData

  // Попытка загрузить из edge cache (JSON файлы)
  let repertoryRaw: { fullpath: string; chapter: string; remedies: { abbrev: string; grade: number }[] }[] = []
  let constellationsRaw: { remedy: string; name: string; clusters: unknown; sine_qua_non: string[]; excluders: string[] }[] = []
  let polaritiesRaw: { remedy: string; polarities: MDRIPolarityData }[] = []
  let clinicalRaw: { type: string; data: Record<string, unknown> }[] = []

  try {
    const fs = await import('fs')
    const path = await import('path')
    const dataDir = path.join(process.cwd(), 'src', 'lib', 'mdri', 'data')
    repertoryRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'repertory.json'), 'utf-8'))
    constellationsRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'constellations.json'), 'utf-8'))
    polaritiesRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'polarities.json'), 'utf-8'))
    clinicalRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'clinical.json'), 'utf-8'))
  } catch {
    // JSON файлов нет — загрузить из Supabase (fallback)
    console.warn('[MDRI] Edge cache not found, loading from Supabase...')
    const { createServiceClient } = await import('@/lib/supabase/service')
    const supabase = createServiceClient()

    const PAGE_SIZE = 5000
    let offset = 0
    let hasMore = true
    while (hasMore) {
      const { data } = await supabase
        .from('repertory_rubrics')
        .select('fullpath, chapter, remedies')
        .in('source', ['publicum', 'kent'])
        .range(offset, offset + PAGE_SIZE - 1)
      if (data && data.length > 0) {
        repertoryRaw.push(...data)
        offset += data.length
        hasMore = data.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    const { data: c } = await supabase.from('mdri_constellations').select('*').limit(5000)
    constellationsRaw = (c ?? []) as typeof constellationsRaw
    const { data: p } = await supabase.from('mdri_polarities').select('*').limit(2000)
    polaritiesRaw = (p ?? []) as typeof polaritiesRaw
    const { data: cl } = await supabase.from('mdri_clinical_data').select('type, data').limit(500)
    clinicalRaw = (cl ?? []) as typeof clinicalRaw
  }

  // Парсинг
  const repertory: MDRIRepertoryRubric[] = repertoryRaw.map(r => ({
    rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies,
  }))

  const constellations: Record<string, MDRIConstellationData> = {}
  for (const row of constellationsRaw) {
    constellations[row.remedy] = {
      name: row.name,
      clusters: row.clusters as MDRIConstellationData['clusters'],
      sine_qua_non: row.sine_qua_non ?? [],
      excluders: row.excluders ?? [],
    }
  }

  const polarities: Record<string, MDRIPolarityData> = {}
  for (const row of polaritiesRaw) {
    polarities[row.remedy] = row.polarities
  }

  const clinical: MDRIClinicalData = { thermal_contradictions: {}, consistency_groups: [] }
  for (const row of clinicalRaw) {
    const d = row.data
    if (row.type === 'thermal_contradiction') {
      for (const [key, remedies] of Object.entries(d)) {
        const thermal = key === 'chilly' ? 'hot' as const : 'chilly' as const
        for (const rem of remedies as string[]) {
          clinical.thermal_contradictions[rem] = thermal
        }
      }
    } else if (row.type === 'consistency_group') {
      clinical.consistency_groups.push(
        convertToConsistencyGroup(d.remedy as string, d.name as string, d.symptoms as string[])
      )
    }
  }

  const { wordIndex, constellationWordIndex, remedyRubricCount } = buildIndices(repertory, constellations)

  cachedData = {
    repertory, constellations, polarities,
    relationships: RELATIONSHIPS,
    wordIndex, constellationWordIndex, remedyRubricCount,
    clinicalData: clinical,
  }

  console.log(`[MDRI] Loaded ${repertory.length} rubrics, ${Object.keys(constellations).length} constellations`)
  return cachedData
}

export function invalidateMDRICache() {
  cachedData = null
}
