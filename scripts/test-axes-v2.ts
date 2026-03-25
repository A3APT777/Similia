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
  { name: 'thermal', feature: 'chilly vs hot',
    values: [
      { label: 'Зябкий', supports: ['Ars.','Nux-v.','Calc.','Sil.','Hep.','Psor.','Kali-c.','Bar-c.'], weakens: ['Sulph.','Puls.','Lach.','Apis.','Iod.','Med.'] },
      { label: 'Жаркий', supports: ['Sulph.','Puls.','Lach.','Apis.','Iod.','Med.','Lyc.'], weakens: ['Ars.','Nux-v.','Calc.','Sil.','Hep.'] },
  ]},
  { name: 'anger_type', feature: 'suppressed vs explosive anger',
    values: [
      { label: 'Подавляет', supports: ['Staph.','Nat-m.','Ign.','Carc.'], weakens: ['Nux-v.','Cham.','Hep.','Stram.'] },
      { label: 'Взрывается', supports: ['Nux-v.','Cham.','Hep.','Stram.','Bell.'], weakens: ['Staph.','Nat-m.','Ign.'] },
  ]},
  { name: 'company', feature: 'company vs solitude',
    values: [
      { label: 'Хочет быть один', supports: ['Nat-m.','Sep.','Nux-v.','Ign.','Gels.'], weakens: ['Puls.','Phos.','Ars.'] },
      { label: 'Ищет компанию', supports: ['Puls.','Phos.','Ars.','Stram.'], weakens: ['Nat-m.','Sep.'] },
  ]},
  { name: 'consolation', feature: 'consolation agg vs amel',
    values: [
      { label: 'Утешение хуже', supports: ['Nat-m.','Sep.','Ign.','Sil.'], weakens: ['Puls.','Phos.'] },
      { label: 'Утешение лучше', supports: ['Puls.','Phos.'], weakens: ['Nat-m.','Sep.'] },
  ]},
  { name: 'thirst', feature: 'thirst type',
    values: [
      { label: 'Большие глотки', supports: ['Bry.','Phos.','Nat-m.','Verat.'], weakens: ['Ars.','Puls.','Apis.','Gels.'] },
      { label: 'Мелкие глотки', supports: ['Ars.','Lyc.'], weakens: ['Bry.','Phos.','Puls.'] },
      { label: 'Нет жажды', supports: ['Puls.','Apis.','Gels.','Ip.'], weakens: ['Bry.','Ars.','Phos.','Nat-m.'] },
  ]},
  { name: 'motion', feature: 'motion agg vs amel',
    values: [
      { label: 'Хуже от движения', supports: ['Bry.','Bell.','Coloc.','Kali-c.'], weakens: ['Rhus-t.','Sep.','Ars.'] },
      { label: 'Лучше от движения', supports: ['Rhus-t.','Sep.','Ars.','Ferr.'], weakens: ['Bry.','Bell.','Coloc.'] },
  ]},
  { name: 'time_night', feature: 'worse time at night',
    values: [
      { label: 'Хуже 0-2 ночи', supports: ['Ars.','Dros.'], weakens: ['Kali-c.','Lyc.','Nux-v.'] },
      { label: 'Хуже 2-4 ночи', supports: ['Kali-c.','Nux-v.'], weakens: ['Ars.','Lyc.'] },
      { label: 'Хуже 16-20', supports: ['Lyc.','Hell.'], weakens: ['Ars.','Kali-c.'] },
  ]},
  { name: 'side', feature: 'left vs right',
    values: [
      { label: 'Слева', supports: ['Lach.','Sep.','Phos.','Arg-n.'], weakens: ['Lyc.','Apis.','Mag-p.','Chel.'] },
      { label: 'Справа', supports: ['Lyc.','Apis.','Mag-p.','Chel.','Bell.'], weakens: ['Lach.','Sep.'] },
  ]},
  { name: 'desire_salt', feature: 'desire salt',
    values: [
      { label: 'Любит солёное', supports: ['Nat-m.','Phos.','Arg-n.'], weakens: ['Puls.','Sep.','Calc.'] },
      { label: 'Нет тяги', supports: [], weakens: ['Nat-m.'] },
  ]},
  { name: 'sleep_after', feature: 'worse after sleep',
    values: [
      { label: 'Хуже после сна', supports: ['Lach.','Lyc.','Spong.'], weakens: ['Nux-v.','Puls.'] },
      { label: 'Сон улучшает', supports: ['Nux-v.','Phos.','Sep.'], weakens: ['Lach.'] },
  ]},
  { name: 'sweat_head', feature: 'perspiration head night',
    values: [
      { label: 'Потеет голова ночью', supports: ['Calc.','Sil.','Merc.'], weakens: ['Sulph.','Phos.'] },
      { label: 'Не потеет', supports: [], weakens: ['Calc.','Sil.'] },
  ]},
  { name: 'menses', feature: 'worse before vs during menses',
    values: [
      { label: 'Хуже перед', supports: ['Sep.','Lach.','Puls.','Nat-m.'], weakens: ['Cham.','Mag-p.'] },
      { label: 'Хуже во время', supports: ['Mag-p.','Cham.','Cimic.','Cocc.'], weakens: ['Sep.','Lach.'] },
  ]},
]

// 40 пар
type Pair = { a: string; b: string; syms: MDRISymptom[] }
const s = (rubric: string, cat: 'mental'|'general'|'particular', w: 1|2|3): MDRISymptom => ({ rubric, category: cat, present: true, weight: w })

const PAIRS: Pair[] = [
  // Классические ДД пары
  { a: 'Nat-m.', b: 'Sep.', syms: [s('indifference',  'mental', 2), s('weeping', 'mental', 2), s('fatigue', 'general', 2)] },
  { a: 'Nat-m.', b: 'Puls.', syms: [s('weeping', 'mental', 2), s('headache', 'particular', 1), s('desire company', 'mental', 2)] },
  { a: 'Nat-m.', b: 'Ign.', syms: [s('grief', 'mental', 3), s('weeping alone', 'mental', 2), s('headache', 'particular', 1)] },
  { a: 'Nux-v.', b: 'Lyc.', syms: [s('irritability', 'mental', 2), s('flatulence', 'particular', 2), s('constipation', 'particular', 2)] },
  { a: 'Nux-v.', b: 'Ars.', syms: [s('anxiety', 'mental', 2), s('restlessness', 'mental', 2), s('chilly', 'general', 2)] },
  { a: 'Nux-v.', b: 'Staph.', syms: [s('anger', 'mental', 2), s('irritability', 'mental', 2), s('constipation', 'particular', 2)] },
  { a: 'Puls.', b: 'Phos.', syms: [s('weeping easily', 'mental', 2), s('sympathetic', 'mental', 2), s('desire company', 'mental', 2)] },
  { a: 'Puls.', b: 'Sep.', syms: [s('weeping', 'mental', 2), s('fatigue', 'general', 2), s('worse before menses', 'general', 2)] },
  { a: 'Bry.', b: 'Rhus-t.', syms: [s('pain joints', 'particular', 2), s('stiffness', 'particular', 2)] },
  { a: 'Calc.', b: 'Sil.', syms: [s('chilly', 'general', 2), s('perspiration head', 'general', 2), s('fear', 'mental', 1)] },
  // Полицресты
  { a: 'Sulph.', b: 'Calc.', syms: [s('itching', 'particular', 2), s('hunger', 'general', 2), s('fear', 'mental', 1)] },
  { a: 'Sulph.', b: 'Psor.', syms: [s('itching skin', 'particular', 2), s('worse washing', 'general', 2), s('hunger', 'general', 2)] },
  { a: 'Sulph.', b: 'Lyc.', syms: [s('flatulence', 'particular', 2), s('hunger', 'general', 2), s('irritability', 'mental', 1)] },
  { a: 'Ars.', b: 'Phos.', syms: [s('anxiety', 'mental', 2), s('thirst', 'general', 2), s('weakness', 'general', 2)] },
  { a: 'Ars.', b: 'Kali-c.', syms: [s('anxiety', 'mental', 2), s('chilly', 'general', 2), s('worse night', 'general', 2)] },
  // Lach/Lyc
  { a: 'Lach.', b: 'Lyc.', syms: [s('flatulence', 'particular', 2), s('jealousy', 'mental', 2)] },
  { a: 'Lach.', b: 'Sep.', syms: [s('menopause', 'general', 2), s('irritability', 'mental', 2), s('worse before menses', 'general', 2)] },
  // Острые
  { a: 'Bell.', b: 'Stram.', syms: [s('fear', 'mental', 2), s('fever', 'general', 2), s('delirium', 'mental', 2)] },
  { a: 'Acon.', b: 'Bell.', syms: [s('fever sudden', 'general', 3), s('anxiety', 'mental', 2), s('restlessness', 'mental', 2)] },
  { a: 'Cham.', b: 'Mag-p.', syms: [s('pain', 'particular', 2), s('irritability', 'mental', 2), s('colic', 'particular', 2)] },
  // Колики
  { a: 'Coloc.', b: 'Mag-p.', syms: [s('colic', 'particular', 2), s('better pressure', 'general', 2), s('better warmth', 'general', 2)] },
  { a: 'Coloc.', b: 'Staph.', syms: [s('anger suppressed', 'mental', 3), s('colic', 'particular', 2)] },
  // Ign vs остальные
  { a: 'Ign.', b: 'Puls.', syms: [s('weeping', 'mental', 2), s('grief', 'mental', 2), s('mood changeable', 'mental', 2)] },
  { a: 'Ign.', b: 'Staph.', syms: [s('grief', 'mental', 2), s('anger suppressed', 'mental', 2)] },
  // Кожные
  { a: 'Graph.', b: 'Petr.', syms: [s('eczema', 'particular', 2), s('cracks skin', 'particular', 2)] },
  { a: 'Hep.', b: 'Sil.', syms: [s('suppuration', 'particular', 2), s('chilly', 'general', 2), s('sensitive', 'mental', 2)] },
  { a: 'Merc.', b: 'Hep.', syms: [s('suppuration', 'particular', 2), s('offensive', 'general', 2), s('worse night', 'general', 2)] },
  // Нозоды
  { a: 'Carc.', b: 'Staph.', syms: [s('suppressed emotions', 'mental', 3), s('fastidious', 'mental', 2)] },
  { a: 'Carc.', b: 'Nat-m.', syms: [s('grief suppressed', 'mental', 3), s('desire salt', 'general', 2)] },
  // Sep специфика
  { a: 'Sep.', b: 'Calc.', syms: [s('fatigue', 'general', 2), s('indifference', 'mental', 2), s('worse cold', 'general', 1)] },
  // Phos vs Lyc
  { a: 'Phos.', b: 'Lyc.', syms: [s('anxiety', 'mental', 2), s('flatulence', 'particular', 2), s('desire company', 'mental', 2)] },
  // Bar-c vs Calc
  { a: 'Bar-c.', b: 'Calc.', syms: [s('slow development', 'general', 2), s('chilly', 'general', 2), s('shy', 'mental', 2)] },
  // Apis vs Puls
  { a: 'Apis.', b: 'Puls.', syms: [s('thirstless', 'general', 2), s('worse heat', 'general', 2), s('weeping', 'mental', 1)] },
  // Arg-n vs Gels
  { a: 'Arg-n.', b: 'Gels.', syms: [s('anxiety anticipation', 'mental', 3), s('diarrhea', 'particular', 2)] },
  // Verat vs Ars
  { a: 'Verat.', b: 'Ars.', syms: [s('vomiting', 'particular', 2), s('diarrhea', 'particular', 2), s('cold sweat', 'general', 2)] },
  // Cocc vs Sep
  { a: 'Cocc.', b: 'Sep.', syms: [s('fatigue', 'general', 2), s('nausea', 'particular', 2), s('indifference', 'mental', 1)] },
  // Ferr vs Phos
  { a: 'Ferr.', b: 'Phos.', syms: [s('hemorrhage', 'particular', 2), s('weakness', 'general', 2), s('anemia', 'general', 1)] },
  // Caust vs Staph
  { a: 'Caust.', b: 'Staph.', syms: [s('injustice', 'mental', 2), s('suppressed anger', 'mental', 2)] },
  // Spong vs Dros
  { a: 'Spong.', b: 'Dros.', syms: [s('cough barking', 'particular', 2), s('worse night', 'general', 2)] },
  // Ip vs Puls
  { a: 'Ip.', b: 'Puls.', syms: [s('nausea', 'particular', 2), s('thirstless', 'general', 2), s('worse heat', 'general', 1)] },
]

console.log('Loaded:', repertory.length, 'rubrics |', PAIRS.length, 'pairs\n')

const axisStats: Record<string, { tested: number; top1_changes: number; total_gap: number }> = {}
for (const a of AXES) axisStats[a.name] = { tested: 0, top1_changes: 0, total_gap: 0 }

for (const pair of PAIRS) {
  const results = analyzePipeline(data, pair.syms, [], [], DEFAULT_PROFILE)
  if (results.length < 2) continue
  const top1 = results[0].remedy
  const gap = results[0].totalScore - results[1].totalScore

  for (const axis of AXES) {
    const relevant = axis.values.some(v => v.supports.includes(pair.a) || v.supports.includes(pair.b))
    if (!relevant) continue
    axisStats[axis.name].tested++

    for (const val of axis.values) {
      if (val.supports.length === 0) continue
      const adjusted = applyClarifyBonus(results, { label: val.label, supports: val.supports, weakens: val.weakens, boost: 15, penalty: -10 })
      if (adjusted[0].remedy !== top1) axisStats[axis.name].top1_changes++
      axisStats[axis.name].total_gap += (adjusted[0].totalScore - (adjusted[1]?.totalScore ?? 0)) - gap
    }
  }
}

// Классификация
const sorted = AXES.map(a => {
  const s = axisStats[a.name]
  const avgGap = s.tested > 0 ? Math.round(s.total_gap / s.tested) : 0
  const changeRate = s.tested > 0 ? s.top1_changes / s.tested : 0
  let classification: string
  if (changeRate >= 0.20) classification = 'CORE'
  else if (s.top1_changes === 0 && avgGap > 5) classification = 'SECONDARY'
  else if (s.top1_changes === 0 && avgGap < 3) classification = 'REMOVE'
  else classification = 'SECONDARY'
  // sweat_head принудительно secondary
  if (a.name === 'sweat_head') classification = 'SECONDARY'
  return { name: a.name, feature: a.feature, tested: s.tested, top1_changes: s.top1_changes, changeRate: Math.round(changeRate * 100), avgGap, classification }
}).sort((a, b) => b.top1_changes * 100 + b.avgGap - (a.top1_changes * 100 + a.avgGap))

console.log('=== РЕЗУЛЬТАТЫ (40 пар) ===\n')
console.log('CORE (top-1 changes >= 20%):')
sorted.filter(a => a.classification === 'CORE').forEach(a => {
  console.log(`  ${a.name.padEnd(16)} tested=${a.tested} changes=${a.top1_changes} (${a.changeRate}%) gap+=${a.avgGap}`)
})

console.log('\nSECONDARY:')
sorted.filter(a => a.classification === 'SECONDARY').forEach(a => {
  console.log(`  ${a.name.padEnd(16)} tested=${a.tested} changes=${a.top1_changes} (${a.changeRate}%) gap+=${a.avgGap}`)
})

console.log('\nREMOVE:')
sorted.filter(a => a.classification === 'REMOVE').forEach(a => {
  console.log(`  ${a.name.padEnd(16)} tested=${a.tested} changes=${a.top1_changes} (${a.changeRate}%) gap+=${a.avgGap}`)
})

console.log('\n=== JSON ===')
console.log(JSON.stringify(sorted, null, 2))
