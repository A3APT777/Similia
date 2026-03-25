/**
 * Тест кейса Батыя — через те же данные что test-50-cases
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type { MDRISymptom, MDRIModality, MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({
  rubric: r.fullpath || r.f,
  remedies: (r.remedies || r.r).map((rem: any) => ({ abbrev: rem.abbrev || rem.a, grade: rem.grade || rem.g })),
}))

const constellations: Record<string, MDRIConstellationData> = {}
for (const c of constellationsRaw) {
  constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
}
const polarities: Record<string, MDRIPolarityData> = {}
for (const p of polaritiesRaw) polarities[p.remedy] = p.polarities

const clinicalData: MDRIClinicalData = {
  relationships: clinicalRaw.relationships ?? {},
  affinities: clinicalRaw.affinities ?? {},
}

const { wordIndex, constellationWordIndex, remedyRubricCount } = buildIndices(repertory, constellations)
const data: MDRIData = { repertory, constellations, polarities, clinicalData, wordIndex, constellationWordIndex, remedyRubricCount }

console.log('Loaded:', repertory.length, 'rubrics')

const symptoms: MDRISymptom[] = [
  { rubric: 'stammering stuttering', category: 'particular', present: true, weight: 3 },
  { rubric: 'speech difficult', category: 'particular', present: true, weight: 2 },
  { rubric: 'convulsions breath holding', category: 'general', present: true, weight: 3 },
  { rubric: 'anger violent rage', category: 'mental', present: true, weight: 3 },
  { rubric: 'obstinate stubborn', category: 'mental', present: true, weight: 3 },
  { rubric: 'dictatorial commanding', category: 'mental', present: true, weight: 3 },
  { rubric: 'sensitive easily offended', category: 'mental', present: true, weight: 2 },
  { rubric: 'affectionate demonstrative', category: 'mental', present: true, weight: 2 },
  { rubric: 'sympathetic compassionate', category: 'mental', present: true, weight: 2 },
  { rubric: 'fastidious orderly pedantic', category: 'mental', present: true, weight: 3 },
  { rubric: 'constipation', category: 'particular', present: true, weight: 2 },
  { rubric: 'desire cold drinks', category: 'general', present: true, weight: 2 },
  { rubric: 'chilly', category: 'general', present: true, weight: 2 },
  { rubric: 'weeping easily', category: 'mental', present: true, weight: 2 },
  { rubric: 'emaciation', category: 'general', present: true, weight: 1 },
]
const modalities: MDRIModality[] = [{ pairId: 'heat_cold', value: 'amel' }]

const results = analyzePipeline(data, symptoms, modalities, [], { ...DEFAULT_PROFILE, age: 'child' })

console.log('\n=== TOP-10 ===')
results.slice(0, 10).forEach((r, i) => {
  const cs = r.lenses.find(l => l.name === 'Constellation')?.score ?? 0
  const kent = r.lenses.find(l => l.name === 'Kent')?.score ?? 0
  console.log(`  ${i+1}. ${r.remedy} (${r.totalScore}%) k:${kent} cs:${cs}`)
})

const gap = results[0].totalScore - (results[1]?.totalScore ?? 0)
console.log('\nGap:', gap)
console.log('Would clarify:', gap < 8 || results[0].confidence === 'low')

// Проверяем: есть ли Causticum в top-10?
const caust = results.findIndex(r => r.remedy.toLowerCase().includes('caust'))
console.log('Causticum position:', caust >= 0 ? caust + 1 : 'NOT IN TOP-10')
