import { symMatch } from '../src/lib/mdri/synonyms'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import type { MDRISymptom, MDRIModality, MDRIPatientProfile } from '../src/lib/mdri/types'

// Загрузка данных
const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

const repertory = repertoryRaw.map((r: any) => ({ rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies }))
const constellations: Record<string, any> = {}
for (const c of constellationsRaw) constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
const polarities: Record<string, any> = {}
for (const p of polaritiesRaw) polarities[p.remedy] = p.polarities
const clinicalData: any = { thermal_contradictions: {}, consistency_groups: [] }
for (const cd of clinicalRaw) { if (cd.type === 'thermal_contradiction' && cd.data) Object.assign(clinicalData.thermal_contradictions, cd.data) }
const indices = buildIndices(repertory, constellations)
const data = { repertory, constellations, polarities, relationships: {}, clinicalData, ...indices }

// 5 кейсов для анализа
const cases = [
  {
    name: '#2 Calc vs Hep',
    expected: 'calc',
    symptoms: [
      { rubric: 'perspiration head night', category: 'particular' as const, present: true, weight: 3 },
      { rubric: 'feet cold damp', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'slow development late walking late teething', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'desire eggs', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'fear dogs', category: 'mental' as const, present: true, weight: 1 },
      { rubric: 'obstinate', category: 'mental' as const, present: true, weight: 1 },
      { rubric: 'chilly', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'sour smell body', category: 'general' as const, present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'heat_cold', value: 'amel' as const }],
    familyHistory: [] as string[],
    profile: { ...DEFAULT_PROFILE, age: 'child' as const },
  },
  {
    name: '#15 Gels: NOT FOUND',
    expected: 'gels',
    symptoms: [
      { rubric: 'weakness trembling anticipation exam', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'drowsiness heaviness eyelids', category: 'general' as const, present: true, weight: 3 },
      { rubric: 'tremor trembling weakness', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'thirstless during fever', category: 'general' as const, present: true, weight: 2 },
      { rubric: 'gradual onset', category: 'general' as const, present: true, weight: 1 },
    ],
    modalities: [] as MDRIModality[],
    familyHistory: [] as string[],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' as const },
  },
  {
    name: '#23 Thuj vs Carc',
    expected: 'thuj',
    symptoms: [
      { rubric: 'warts after vaccination', category: 'particular' as const, present: true, weight: 3 },
      { rubric: 'skin oily greasy', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'discharge greenish', category: 'particular' as const, present: true, weight: 1 },
      { rubric: 'secretive reserved', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'fixed ideas delusion body fragile', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'worse damp', category: 'general' as const, present: true, weight: 1 },
      { rubric: 'left side', category: 'general' as const, present: true, weight: 1 },
    ],
    modalities: [] as MDRIModality[],
    familyHistory: ['papillomas'],
    profile: { ...DEFAULT_PROFILE, age: 'child' as const },
  },
  {
    name: '#44 Verat vs Ars',
    expected: 'verat',
    symptoms: [
      { rubric: 'vomiting diarrhea simultaneous cholera', category: 'particular' as const, present: true, weight: 3 },
      { rubric: 'cold sweat forehead', category: 'general' as const, present: true, weight: 3 },
      { rubric: 'collapse prostration extreme', category: 'general' as const, present: true, weight: 3 },
      { rubric: 'cramps legs calves', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'pale bluish face', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'thirst ice cold water', category: 'general' as const, present: true, weight: 2 },
    ],
    modalities: [{ pairId: 'motion_rest', value: 'agg' as const }],
    familyHistory: [] as string[],
    profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' as const },
  },
  {
    name: '#30 Stram vs Ars',
    expected: 'stram',
    symptoms: [
      { rubric: 'fear dark terror panic', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'fear water shining objects', category: 'mental' as const, present: true, weight: 2 },
      { rubric: 'violent aggressive biting striking', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'stammering speech', category: 'particular' as const, present: true, weight: 2 },
      { rubric: 'nightmares terror waking screaming', category: 'mental' as const, present: true, weight: 3 },
      { rubric: 'worse alone', category: 'mental' as const, present: true, weight: 2 },
    ],
    modalities: [] as MDRIModality[],
    familyHistory: [] as string[],
    profile: { ...DEFAULT_PROFILE, age: 'child' as const },
  },
]

const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

for (const c of cases) {
  console.log('\n' + '='.repeat(80))
  console.log(c.name + ' (expected: ' + c.expected + ')')
  console.log('='.repeat(80))

  const results = analyzePipeline(data, c.symptoms, c.modalities, c.familyHistory, c.profile)

  // Top-5 с деталями
  const present = c.symptoms.filter(s => s.present).map(s => s.rubric.toLowerCase())

  for (const r of results.slice(0, 5)) {
    const kent = r.lenses.find(l => l.name === 'Kent')!.score
    const hier = r.lenses.find(l => l.name === 'Hierarchy')!.score
    const cs = r.lenses.find(l => l.name === 'Constellation')!.score
    const pol = r.lenses.find(l => l.name === 'Polarity')!.score
    const mark = norm(r.remedy) === c.expected ? ' <<<' : ''
    console.log(`  ${norm(r.remedy).padEnd(10)} total:${r.totalScore} kent:${kent} hier:${hier} cs:${cs} pol:${pol}${mark}`)
  }

  // Constellation детали для expected и winner
  for (const remName of [c.expected, norm(results[0].remedy)]) {
    const con = constellations[remName]
    if (!con?.clusters) { console.log(`\n  [${remName}] NO CONSTELLATION`); continue }
    console.log(`\n  [${remName}] constellation:`)
    for (const cl of con.clusters) {
      console.log(`    Cluster: ${cl.name} (imp:${cl.importance})`)
      for (const s of cl.symptoms) {
        const fm = present.some(p => symMatch(p, s.rubric))
        const pm = !fm && present.some(p => {
          const tw = s.rubric.toLowerCase().split(' ').filter((w: string) => w.length > 3)
          const pw = p.split(' ').filter((w: string) => w.length > 3)
          const mc = tw.filter((t: string) => pw.some((pp: string) => pp.includes(t) || t.includes(pp))).length
          return tw.length > 0 && mc >= (tw.length >= 3 ? 2 : 1)
        })
        const status = fm ? 'FULL' : pm ? 'PART' : '----'
        console.log(`      [${status}] ${s.rubric} (w:${s.weight})`)
      }
    }
    console.log(`    SQN: ${JSON.stringify(con.sine_qua_non)}`)
  }
}
