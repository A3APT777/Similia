import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import { applyClarifyBonus } from '../src/lib/mdri/question-gain'
import type { MDRIData } from '../src/lib/mdri/engine'
import type { MDRISymptom, MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))
const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({ rubric: r.fullpath || r.f, remedies: (r.remedies || r.r).map((rem: any) => ({ abbrev: rem.abbrev || rem.a, grade: rem.grade || rem.g })) }))
const constellations: Record<string, MDRIConstellationData> = {}
for (const c of constellationsRaw) constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
const polarities: Record<string, MDRIPolarityData> = {}
for (const p of polaritiesRaw) polarities[p.remedy] = p.polarities
const clinicalData: MDRIClinicalData = { relationships: clinicalRaw.relationships ?? {}, affinities: clinicalRaw.affinities ?? {} }
const { wordIndex, constellationWordIndex, remedyRubricCount } = buildIndices(repertory, constellations)
const data: MDRIData = { repertory, constellations, polarities, clinicalData, relationships: {}, wordIndex, constellationWordIndex, remedyRubricCount }

type AxisValue = { label: string; supports: string[]; weakens: string[] }
type Axis = { name: string; feature: string; values: AxisValue[] }

const AXES: Axis[] = [
  { name: 'anger_type', feature: 'suppressed vs explosive anger',
    values: [
      { label: 'Подавляет гнев', supports: ['Staph.','Nat-m.','Ign.'], weakens: ['Nux-v.','Cham.','Hep.'] },
      { label: 'Взрывается открыто', supports: ['Nux-v.','Cham.','Hep.'], weakens: ['Staph.','Nat-m.','Ign.'] },
  ]},
  { name: 'company', feature: 'company vs solitude',
    values: [
      { label: 'Хочет быть один', supports: ['Nat-m.','Sep.','Nux-v.'], weakens: ['Puls.','Phos.'] },
      { label: 'Ищет компанию', supports: ['Puls.','Phos.','Ars.'], weakens: ['Nat-m.','Sep.'] },
  ]},
  { name: 'consolation', feature: 'consolation agg vs amel',
    values: [
      { label: 'Утешение хуже', supports: ['Nat-m.','Sep.','Ign.'], weakens: ['Puls.','Phos.'] },
      { label: 'Утешение помогает', supports: ['Puls.','Phos.'], weakens: ['Nat-m.','Sep.'] },
  ]},
  { name: 'thermal', feature: 'chilly vs hot patient',
    values: [
      { label: 'Зябкий', supports: ['Ars.','Nux-v.','Calc.','Sil.','Hep.','Psor.'], weakens: ['Sulph.','Puls.','Lach.','Apis.','Iod.'] },
      { label: 'Жаркий', supports: ['Sulph.','Puls.','Lach.','Apis.','Iod.'], weakens: ['Ars.','Nux-v.','Calc.','Sil.','Hep.'] },
  ]},
  { name: 'thirst', feature: 'thirst type',
    values: [
      { label: 'Большие глотки', supports: ['Bry.','Phos.','Nat-m.'], weakens: ['Ars.','Puls.','Apis.'] },
      { label: 'Мелкие глотки', supports: ['Ars.'], weakens: ['Bry.','Phos.','Puls.'] },
      { label: 'Нет жажды', supports: ['Puls.','Apis.','Gels.'], weakens: ['Bry.','Ars.','Phos.'] },
  ]},
  { name: 'motion', feature: 'motion agg vs amel',
    values: [
      { label: 'Хуже от движения', supports: ['Bry.','Bell.','Coloc.'], weakens: ['Rhus-t.','Sep.','Ars.'] },
      { label: 'Лучше от движения', supports: ['Rhus-t.','Sep.','Ars.'], weakens: ['Bry.','Bell.'] },
  ]},
  { name: 'time_night', feature: 'worse time at night',
    values: [
      { label: 'Хуже 0-2 ночи', supports: ['Ars.'], weakens: ['Kali-c.','Lyc.'] },
      { label: 'Хуже 2-4 ночи', supports: ['Kali-c.'], weakens: ['Ars.','Lyc.'] },
      { label: 'Хуже 16-20', supports: ['Lyc.'], weakens: ['Ars.','Kali-c.'] },
  ]},
  { name: 'side', feature: 'left vs right side',
    values: [
      { label: 'Слева', supports: ['Lach.','Sep.'], weakens: ['Lyc.','Apis.','Mag-p.'] },
      { label: 'Справа', supports: ['Lyc.','Apis.','Mag-p.'], weakens: ['Lach.','Sep.'] },
  ]},
  { name: 'desire_salt', feature: 'desire salt',
    values: [
      { label: 'Любит солёное', supports: ['Nat-m.','Phos.'], weakens: ['Puls.','Sep.'] },
      { label: 'Нет тяги', supports: [], weakens: ['Nat-m.'] },
  ]},
  { name: 'sleep_after', feature: 'worse after sleep',
    values: [
      { label: 'Хуже после сна', supports: ['Lach.','Lyc.'], weakens: ['Nux-v.'] },
      { label: 'Сон улучшает', supports: ['Nux-v.','Phos.'], weakens: ['Lach.'] },
  ]},
  { name: 'sweat_head', feature: 'perspiration head night',
    values: [
      { label: 'Потеет голова ночью', supports: ['Calc.','Sil.'], weakens: ['Sulph.'] },
      { label: 'Голова не потеет', supports: [], weakens: ['Calc.','Sil.'] },
  ]},
  { name: 'menses', feature: 'worse before vs during menses',
    values: [
      { label: 'Хуже перед месячными', supports: ['Sep.','Lach.','Puls.'], weakens: ['Cham.'] },
      { label: 'Хуже во время', supports: ['Mag-p.','Cham.'], weakens: ['Sep.'] },
  ]},
]

// 10 часто путаемых пар
const PAIRS = [
  { a: 'Nat-m.', b: 'Sep.', syms: [
    { rubric: 'indifference', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'weeping', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'fatigue', category: 'general' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Nux-v.', b: 'Lyc.', syms: [
    { rubric: 'irritability', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'flatulence', category: 'particular' as const, present: true, weight: 2 as const },
    { rubric: 'constipation', category: 'particular' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Ars.', b: 'Nux-v.', syms: [
    { rubric: 'anxiety', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'restlessness', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'chilly', category: 'general' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Puls.', b: 'Phos.', syms: [
    { rubric: 'weeping easily', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'sympathetic', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'desire company', category: 'mental' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Bry.', b: 'Rhus-t.', syms: [
    { rubric: 'pain joints', category: 'particular' as const, present: true, weight: 2 as const },
    { rubric: 'stiffness', category: 'particular' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Calc.', b: 'Sil.', syms: [
    { rubric: 'chilly', category: 'general' as const, present: true, weight: 2 as const },
    { rubric: 'perspiration head', category: 'general' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Ign.', b: 'Nat-m.', syms: [
    { rubric: 'grief', category: 'mental' as const, present: true, weight: 3 as const },
    { rubric: 'weeping alone', category: 'mental' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Sulph.', b: 'Psor.', syms: [
    { rubric: 'itching skin', category: 'particular' as const, present: true, weight: 2 as const },
    { rubric: 'worse washing', category: 'general' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Lach.', b: 'Lyc.', syms: [
    { rubric: 'flatulence', category: 'particular' as const, present: true, weight: 2 as const },
    { rubric: 'jealousy', category: 'mental' as const, present: true, weight: 2 as const },
  ]},
  { a: 'Sep.', b: 'Puls.', syms: [
    { rubric: 'weeping', category: 'mental' as const, present: true, weight: 2 as const },
    { rubric: 'fatigue', category: 'general' as const, present: true, weight: 2 as const },
  ]},
]

console.log('Loaded:', repertory.length, 'rubrics\n')

const axisStats: Record<string, { tested: number; top1_changes: number; total_gap_increase: number }> = {}
for (const a of AXES) axisStats[a.name] = { tested: 0, top1_changes: 0, total_gap_increase: 0 }

for (const pair of PAIRS) {
  const results = analyzePipeline(data, pair.syms, [], [], DEFAULT_PROFILE)
  const top1 = results[0]?.remedy
  const gap = results[0]?.totalScore - (results[1]?.totalScore ?? 0)

  for (const axis of AXES) {
    const relevant = axis.values.some(v => v.supports.includes(pair.a) || v.supports.includes(pair.b))
    if (!relevant) continue
    axisStats[axis.name].tested++

    for (const val of axis.values) {
      if (val.supports.length === 0) continue
      const adjusted = applyClarifyBonus(results, { label: val.label, supports: val.supports, weakens: val.weakens, boost: 15, penalty: -10 })
      const newTop1 = adjusted[0]?.remedy
      const newGap = adjusted[0]?.totalScore - (adjusted[1]?.totalScore ?? 0)
      if (newTop1 !== top1) axisStats[axis.name].top1_changes++
      axisStats[axis.name].total_gap_increase += (newGap - gap)
    }
  }
}

// Результаты
const sorted = AXES.map(a => {
  const s = axisStats[a.name]
  const avgGap = s.tested > 0 ? Math.round(s.total_gap_increase / s.tested) : 0
  return { name: a.name, feature: a.feature, tested: s.tested, top1_changes: s.top1_changes, avg_gap_increase: avgGap, effective: s.top1_changes > 0 || avgGap > 3 }
}).sort((a, b) => (b.top1_changes * 10 + b.avg_gap_increase) - (a.top1_changes * 10 + a.avg_gap_increase))

console.log('=== РЕЗУЛЬТАТЫ ===\n')
for (const a of sorted) {
  console.log(`${a.effective ? 'V' : 'X'} ${a.name.padEnd(16)} tested=${a.tested} top1_changed=${a.top1_changes} avg_gap+=${a.avg_gap_increase}`)
}

console.log('\n=== TOP-5 ===')
sorted.slice(0, 5).forEach((a, i) => console.log(`${i+1}. ${a.name} (${a.feature})`))

console.log('\n=== СЛАБЫЕ ===')
sorted.filter(a => !a.effective).forEach(a => console.log(`X ${a.name}`))

console.log('\n' + JSON.stringify(sorted, null, 2))
