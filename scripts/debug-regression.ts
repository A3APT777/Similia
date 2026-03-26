/**
 * Debug: проверка регрессий #20 (Con) и #29 (Hep)
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type {
  MDRISymptom, MDRIModality,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIClinicalData,
} from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

function loadData(): MDRIData {
  const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
  const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
  const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
  const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
  const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({ rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies }))
  const constellations: Record<string, MDRIConstellationData> = {}
  for (const c of constellationsRaw) { constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders } }
  const polarities: Record<string, MDRIPolarityData> = {}
  for (const p of polaritiesRaw) { polarities[p.remedy] = p.polarities }
  const indices = buildIndices(repertory, constellations)
  return { repertory, constellations, polarities, relationships: {}, clinicalData: { thermal_contradictions: {}, consistency_groups: [] } as MDRIClinicalData, ...indices }
}

const data = loadData()

// === Кейс Con (#20): одинокий старик ===
console.log('=== CON (#20): одинокий старик ===')
const conSymptoms: MDRISymptom[] = [
  { rubric: 'grief widowhood loneliness', category: 'mental', present: true, weight: 2 },
  { rubric: 'vertigo turning head lying', category: 'particular', present: true, weight: 3 },
  { rubric: 'weakness ascending progressive', category: 'general', present: true, weight: 2 },
  { rubric: 'hardening glands induration', category: 'particular', present: true, weight: 2 },
  { rubric: 'perspiration night', category: 'general', present: true, weight: 2 },
  { rubric: 'slowness thinking difficulty', category: 'mental', present: true, weight: 2 },
]
const conR = analyzePipeline(data, conSymptoms, [], [], DEFAULT_PROFILE)
conR.slice(0, 8).forEach(r => {
  const cs = r.lenses.find(l => l.name === 'Constellation')?.score ?? 0
  const pol = r.lenses.find(l => l.name === 'Polarity')?.score ?? 0
  const kent = r.lenses.find(l => l.name === 'Kent')?.score ?? 0
  console.log(`  ${r.remedy.padEnd(10)} total=${r.totalScore} kent=${kent} cs=${cs} pol=${pol}`)
})

// === Кейс Hep (#29): чувствителен к холоду ===
console.log('\n=== HEP (#29): чувствителен к холоду ===')
const hepSymptoms: MDRISymptom[] = [
  { rubric: 'suppuration discharge offensive old cheese', category: 'particular', present: true, weight: 3 },
  { rubric: 'chilly extreme sensitive cold draft', category: 'general', present: true, weight: 3 },
  { rubric: 'irritability anger oversensitive', category: 'mental', present: true, weight: 2 },
  { rubric: 'splinter sensation', category: 'particular', present: true, weight: 3 },
  { rubric: 'suppuration every wound', category: 'general', present: true, weight: 2 },
  { rubric: 'oversensitive to touch pain', category: 'mental', present: true, weight: 2 },
]
const hepMods: MDRIModality[] = [{ pairId: 'heat_cold', value: 'amel' }]
const hepR = analyzePipeline(data, hepSymptoms, hepMods, [], DEFAULT_PROFILE)
hepR.slice(0, 8).forEach(r => {
  const cs = r.lenses.find(l => l.name === 'Constellation')?.score ?? 0
  const pol = r.lenses.find(l => l.name === 'Polarity')?.score ?? 0
  const kent = r.lenses.find(l => l.name === 'Kent')?.score ?? 0
  console.log(`  ${r.remedy.padEnd(10)} total=${r.totalScore} kent=${kent} cs=${cs} pol=${pol}`)
})

// === Кейс Tub (#16): debug familyHistory ===
console.log('\n=== TUB (#16): с familyHistory ===')
const tubSymptoms: MDRISymptom[] = [
  { rubric: 'emaciation thin tall', category: 'general', present: true, weight: 2 },
  { rubric: 'weakness fatigue easy', category: 'general', present: true, weight: 2 },
  { rubric: 'lymph nodes enlarged', category: 'particular', present: true, weight: 2 },
  { rubric: 'desire travel change', category: 'mental', present: true, weight: 3 },
  { rubric: 'perspiration night', category: 'general', present: true, weight: 2 },
  { rubric: 'desire smoked meat ham', category: 'general', present: true, weight: 2 },
  { rubric: 'frequent colds susceptibility', category: 'general', present: true, weight: 1 },
  { rubric: 'restlessness cannot stay in one place', category: 'mental', present: true, weight: 2 },
]
// БЕЗ familyHistory
const tubR1 = analyzePipeline(data, tubSymptoms, [{ pairId: 'heat_cold', value: 'amel' }], [], DEFAULT_PROFILE)
console.log('Without familyHistory:')
tubR1.slice(0, 5).forEach(r => console.log(`  ${r.remedy.padEnd(10)} total=${r.totalScore}`))

// С familyHistory
const tubR2 = analyzePipeline(data, tubSymptoms, [{ pairId: 'heat_cold', value: 'amel' }], ['tuberculosis'], DEFAULT_PROFILE)
console.log('With familyHistory=tuberculosis:')
tubR2.slice(0, 5).forEach(r => {
  const mi = r.lenses.find(l => l.name === 'Miasm')?.score ?? 0
  console.log(`  ${r.remedy.padEnd(10)} total=${r.totalScore} miasm=${mi}`)
})
