/**
 * Тест Clarify V1: проверяем QuestionGain на кейсах с маленьким gap
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import { selectBestClarifyQuestion, applyClarifyBonus } from '../src/lib/mdri/question-gain'
import type { MDRIData } from '../src/lib/mdri/engine'
import type { MDRISymptom, MDRIModality, MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({
  rubric: r.fullpath || r.f, remedies: (r.remedies || r.r).map((rem: any) => ({ abbrev: rem.abbrev || rem.a, grade: rem.grade || rem.g })),
}))
const constellations: Record<string, MDRIConstellationData> = {}
for (const c of constellationsRaw) constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
const polarities: Record<string, MDRIPolarityData> = {}
for (const p of polaritiesRaw) polarities[p.remedy] = p.polarities
const clinicalData: MDRIClinicalData = { relationships: clinicalRaw.relationships ?? {}, affinities: clinicalRaw.affinities ?? {} }
const { wordIndex, constellationWordIndex, remedyRubricCount } = buildIndices(repertory, constellations)
const data: MDRIData = { repertory, constellations, polarities, clinicalData, relationships: {}, wordIndex, constellationWordIndex, remedyRubricCount }

console.log('Loaded:', repertory.length, 'rubrics\n')

// Тестовые кейсы с размытым описанием (ожидаем маленький gap)
const cases = [
  {
    name: 'Размытый Sep/Nat-m/Nux-v',
    expected: 'Sep.',
    symptoms: [
      { rubric: 'fatigue tiredness', category: 'general' as const, present: true, weight: 2 as const },
      { rubric: 'irritability family', category: 'mental' as const, present: true, weight: 2 as const },
      { rubric: 'desire solitude', category: 'mental' as const, present: true, weight: 2 as const },
      { rubric: 'nausea', category: 'particular' as const, present: true, weight: 1 as const },
    ],
    modalities: [] as MDRIModality[],
  },
  {
    name: 'Размытый Staph/Nux-v/Lyc (Батый)',
    expected: 'Staph.',
    symptoms: [
      { rubric: 'anger violent rage', category: 'mental' as const, present: true, weight: 3 as const },
      { rubric: 'obstinate stubborn', category: 'mental' as const, present: true, weight: 3 as const },
      { rubric: 'dictatorial commanding', category: 'mental' as const, present: true, weight: 3 as const },
      { rubric: 'fastidious orderly pedantic', category: 'mental' as const, present: true, weight: 3 as const },
      { rubric: 'sensitive easily offended', category: 'mental' as const, present: true, weight: 2 as const },
      { rubric: 'chilly', category: 'general' as const, present: true, weight: 2 as const },
      { rubric: 'constipation', category: 'particular' as const, present: true, weight: 2 as const },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' as const }],
  },
  {
    name: 'Ign vs Nat-m (острое горе)',
    expected: 'Ign.',
    symptoms: [
      { rubric: 'grief', category: 'mental' as const, present: true, weight: 3 as const },
      { rubric: 'sighing', category: 'mental' as const, present: true, weight: 2 as const },
      { rubric: 'weeping easily', category: 'mental' as const, present: true, weight: 2 as const },
      { rubric: 'headache', category: 'particular' as const, present: true, weight: 1 as const },
    ],
    modalities: [] as MDRIModality[],
  },
]

for (const c of cases) {
  const results = analyzePipeline(data, c.symptoms, c.modalities, [], DEFAULT_PROFILE)
  const top3 = results.slice(0, 3)
  const gap = top3[0].totalScore - (top3[1]?.totalScore ?? 0)

  console.log(`=== ${c.name} ===`)
  console.log(`Top-3: ${top3.map(r => `${r.remedy}(${r.totalScore})`).join(', ')}`)
  console.log(`Gap: ${gap} | Expected: ${c.expected}`)

  // QuestionGain
  const question = selectBestClarifyQuestion(results, constellations, c.symptoms)

  if (!question) {
    console.log(`Clarify: НЕТ (${gap >= 12 ? 'gap>=12' : 'gain<0.3 или бесполезен'})`)
  } else {
    console.log(`Clarify: "${question.question}" (gain=${question.gain.toFixed(2)}, feature=${question.feature})`)
    question.options.forEach(o => {
      if (o.neutral) {
        console.log(`  [Не знаю]`)
      } else {
        console.log(`  [${o.label}] → supports: ${o.supports?.join(',')||'-'}, weakens: ${o.weakens?.join(',')||'-'}`)
      }
    })

    // Симуляция: что будет при каждом ответе?
    for (const opt of question.options) {
      if (opt.neutral) continue
      const adjusted = applyClarifyBonus(results, opt)
      const newTop1 = adjusted[0].remedy
      const newGap = adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0)
      const changed = newTop1 !== top3[0].remedy
      console.log(`  Симуляция "${opt.label}": top1=${newTop1}(${adjusted[0].totalScore}) gap=${newGap} ${changed ? '← TOP-1 CHANGED' : ''}`)
    }

    // Fallback comparison
    console.log(`  Fallback comparison:`)
    question.fallbackComparison.forEach(fc => console.log(`    ${fc.remedy}: ${fc.keyFeature}`))
  }
  console.log('')
}
