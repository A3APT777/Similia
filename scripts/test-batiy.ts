import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type { MDRISymptom, MDRIModality, MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import { shouldClarify } from '../src/lib/mdri/differential'
import { selectDifferentialPair, buildDifferentialMatrix, selectBestDiscriminator, discriminatorToQuestion } from '../src/lib/mdri/clarify-engine'
import { checkHypothesisConflict, computeConfidence, validateInput } from '../src/lib/mdri/product-layer'

function loadData(): MDRIData {
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
  for (const p of polaritiesRaw) { polarities[p.remedy] = p.polarities }

  const clinicalData: MDRIClinicalData = { relationships: clinicalRaw.relationships ?? {}, affinities: clinicalRaw.affinities ?? {} }
  const { wordIndex, constellationWordIndex, remedyRubricCount } = buildIndices(repertory, constellations)

  return { repertory, constellations, polarities, clinicalData, wordIndex, constellationWordIndex, remedyRubricCount }
}

// Симптомы Батыя (из лога)
const symptoms: MDRISymptom[] = [
  { rubric: 'stammering stuttering periodic', category: 'particular', present: true, weight: 3 },
  { rubric: 'speech difficult beginning words', category: 'particular', present: true, weight: 2 },
  { rubric: 'protruding tongue when speaking', category: 'particular', present: true, weight: 3 },
  { rubric: 'convulsions breath holding spells', category: 'general', present: true, weight: 3 },
  { rubric: 'anger violent rage tantrums', category: 'mental', present: true, weight: 3 },
  { rubric: 'obstinate stubborn willful', category: 'mental', present: true, weight: 3 },
  { rubric: 'dictatorial commanding', category: 'mental', present: true, weight: 3 },
  { rubric: 'desire to be first leader', category: 'mental', present: true, weight: 2 },
  { rubric: 'sensitive emotional easily offended', category: 'mental', present: true, weight: 2 },
  { rubric: 'affectionate demonstrative', category: 'mental', present: true, weight: 2 },
  { rubric: 'sympathetic compassionate', category: 'mental', present: true, weight: 2 },
  { rubric: 'pain joints knees hips', category: 'particular', present: true, weight: 2 },
  { rubric: 'coryza chronic thick green', category: 'particular', present: true, weight: 2 },
  { rubric: 'worse cold weather autumn winter', category: 'general', present: true, weight: 2 },
  { rubric: 'better warm weather summer', category: 'general', present: true, weight: 2 },
  { rubric: 'fastidious orderly pedantic', category: 'mental', present: true, weight: 3 },
  { rubric: 'constipation postponing urging', category: 'particular', present: true, weight: 2 },
  { rubric: 'desire cold drinks', category: 'general', present: true, weight: 2 },
  { rubric: 'perspiration night', category: 'general', present: true, weight: 1 },
  { rubric: 'flatulence evening', category: 'particular', present: true, weight: 1 },
  { rubric: 'emaciation tall thin', category: 'general', present: true, weight: 1 },
  { rubric: 'discoloration blue circles under eyes', category: 'particular', present: true, weight: 2 },
  { rubric: 'head large', category: 'particular', present: true, weight: 1 },
  { rubric: 'chilly', category: 'general', present: true, weight: 2 },
  { rubric: 'hot patient', category: 'general', present: true, weight: 2 },
  { rubric: 'weeping easily', category: 'mental', present: true, weight: 2 },
]
const modalities: MDRIModality[] = [{ pairId: 'heat_cold', value: 'amel' }]

const data = loadData()
console.log('Загружено:', data.repertory.length, 'рубрик')

const results = analyzePipeline(data, symptoms, modalities, [], { ...DEFAULT_PROFILE, age: 'child' })

console.log('\n=== TOP-10 ===')
results.slice(0, 10).forEach((r, i) => {
  const cs = r.lenses.find(l => l.name === 'Constellation')?.score ?? 0
  const kent = r.lenses.find(l => l.name === 'Kent')?.score ?? 0
  console.log(`  ${i+1}. ${r.remedy} (${r.totalScore}%) k:${kent} cs:${cs} conf:${r.confidence}`)
})

// Проверяем clarify
const conflict = checkHypothesisConflict(results)
const confidence = computeConfidence(symptoms, modalities, results, validateInput(symptoms, modalities))
const needsClarify = shouldClarify(confidence, results, conflict, false)

console.log('\n=== CLARIFY ===')
console.log('Confidence:', confidence.level, '|', confidence.label)
console.log('Conflict level:', conflict.level)
console.log('Should clarify:', needsClarify)

if (needsClarify) {
  const pair = selectDifferentialPair(results, conflict)
  console.log('Differential pair:', pair ? `${pair.top1} vs ${pair.alternative}` : 'none')
  
  if (pair) {
    const matrix = buildDifferentialMatrix(results, pair)
    const disc = selectBestDiscriminator(matrix, symptoms, modalities)
    
    if (disc) {
      console.log('\n=== DISCRIMINATOR (из KB) ===')
      console.log('Вопрос:', disc.labelRu)
      console.log('Тип:', disc.type)
      disc.options.forEach(o => {
        console.log(`  [${o.id}] ${o.labelRu} → ${o.effect}`)
      })
    } else {
      console.log('Нет подходящего discriminator в KB → AI fallback')
      console.log('Pair:', pair.top1, 'vs', pair.alternative)
    }
  }
}
