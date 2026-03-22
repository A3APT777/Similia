/**
 * Найти кейсы где constellation слабый, и показать как система их обрабатывает.
 * Для каждого: cs%, kent%, hier%, итоговый score, позиция правильного препарата.
 */
import { symMatch } from '../src/lib/mdri/synonyms'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import type { MDRISymptom, MDRIModality, MDRIPatientProfile } from '../src/lib/mdri/types'

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

type Case = {
  id: number; name: string; expected: string
  symptoms: MDRISymptom[]; modalities: MDRIModality[]
  familyHistory: string[]; profile: MDRIPatientProfile
}

const CASES: Case[] = [
  { id: 2, name: 'Calc', expected: 'calc', symptoms: [
    { rubric: 'perspiration head night', category: 'particular', present: true, weight: 3 },
    { rubric: 'feet cold damp', category: 'particular', present: true, weight: 2 },
    { rubric: 'slow development late walking late teething', category: 'general', present: true, weight: 2 },
    { rubric: 'desire eggs', category: 'general', present: true, weight: 2 },
    { rubric: 'fear dogs', category: 'mental', present: true, weight: 1 },
    { rubric: 'obstinate', category: 'mental', present: true, weight: 1 },
    { rubric: 'chilly', category: 'general', present: true, weight: 2 },
    { rubric: 'sour smell body', category: 'general', present: true, weight: 2 },
  ], modalities: [{ pairId: 'heat_cold', value: 'amel' }], familyHistory: [], profile: { ...DEFAULT_PROFILE, age: 'child' } },

  { id: 15, name: 'Gels', expected: 'gels', symptoms: [
    { rubric: 'weakness trembling anticipation exam', category: 'mental', present: true, weight: 3 },
    { rubric: 'drowsiness heaviness eyelids', category: 'general', present: true, weight: 3 },
    { rubric: 'tremor trembling weakness', category: 'general', present: true, weight: 2 },
    { rubric: 'thirstless during fever', category: 'general', present: true, weight: 2 },
    { rubric: 'gradual onset', category: 'general', present: true, weight: 1 },
  ], modalities: [], familyHistory: [], profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' } },

  { id: 18, name: 'Kali-c', expected: 'kali-c', symptoms: [
    { rubric: 'waking 2am 3am dyspnea', category: 'particular', present: true, weight: 3 },
    { rubric: 'rigid duty conscientious rules', category: 'mental', present: true, weight: 2 },
    { rubric: 'anxiety felt in stomach', category: 'mental', present: true, weight: 2 },
    { rubric: 'stitching pain', category: 'general', present: true, weight: 2 },
    { rubric: 'edema upper eyelids puffiness', category: 'particular', present: true, weight: 3 },
    { rubric: 'weakness back lumbar', category: 'particular', present: true, weight: 1 },
    { rubric: 'chilly', category: 'general', present: true, weight: 2 },
    { rubric: 'startled easily', category: 'mental', present: true, weight: 2 },
  ], modalities: [{ pairId: 'heat_cold', value: 'amel' }], familyHistory: [], profile: DEFAULT_PROFILE },

  { id: 21, name: 'Lac-c', expected: 'lac-c', symptoms: [
    { rubric: 'sore throat alternating sides', category: 'particular', present: true, weight: 3 },
    { rubric: 'headache alternating sides left right', category: 'particular', present: true, weight: 3 },
    { rubric: 'self contempt worthlessness', category: 'mental', present: true, weight: 3 },
    { rubric: 'fear snakes', category: 'mental', present: true, weight: 1 },
    { rubric: 'sensation throat constriction', category: 'particular', present: true, weight: 2 },
    { rubric: 'worse touch throat', category: 'particular', present: true, weight: 2 },
  ], modalities: [], familyHistory: [], profile: DEFAULT_PROFILE },

  { id: 23, name: 'Thuj', expected: 'thuj', symptoms: [
    { rubric: 'warts after vaccination', category: 'particular', present: true, weight: 3 },
    { rubric: 'skin oily greasy', category: 'particular', present: true, weight: 2 },
    { rubric: 'discharge greenish', category: 'particular', present: true, weight: 1 },
    { rubric: 'secretive reserved', category: 'mental', present: true, weight: 2 },
    { rubric: 'fixed ideas delusion body fragile', category: 'mental', present: true, weight: 2 },
    { rubric: 'worse damp', category: 'general', present: true, weight: 1 },
    { rubric: 'left side', category: 'general', present: true, weight: 1 },
  ], modalities: [], familyHistory: ['papillomas'], profile: { ...DEFAULT_PROFILE, age: 'child' } },

  { id: 25, name: 'Ip', expected: 'ip', symptoms: [
    { rubric: 'nausea constant vomiting does not relieve', category: 'particular', present: true, weight: 3 },
    { rubric: 'tongue clean despite nausea', category: 'particular', present: true, weight: 3 },
    { rubric: 'epistaxis with nausea bright blood', category: 'particular', present: true, weight: 2 },
    { rubric: 'cough spasmodic nausea', category: 'particular', present: true, weight: 2 },
  ], modalities: [], familyHistory: [], profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute' } },

  { id: 26, name: 'Dros', expected: 'dros', symptoms: [
    { rubric: 'cough paroxysmal whooping spasmodic', category: 'particular', present: true, weight: 3 },
    { rubric: 'cough ending vomiting', category: 'particular', present: true, weight: 2 },
    { rubric: 'worse lying down', category: 'general', present: true, weight: 2 },
    { rubric: 'worse after midnight', category: 'general', present: true, weight: 1 },
    { rubric: 'epistaxis from cough', category: 'particular', present: true, weight: 2 },
    { rubric: 'worse talking laughing', category: 'general', present: true, weight: 2 },
  ], modalities: [], familyHistory: [], profile: { ...DEFAULT_PROFILE, acuteOrChronic: 'acute', age: 'child' } },

  { id: 28, name: 'Tab', expected: 'tab', symptoms: [
    { rubric: 'motion sickness nausea deathly', category: 'general', present: true, weight: 3 },
    { rubric: 'pallor deathly pale face', category: 'particular', present: true, weight: 3 },
    { rubric: 'cold sweat', category: 'general', present: true, weight: 2 },
    { rubric: 'better open air', category: 'general', present: true, weight: 2 },
    { rubric: 'worse opening eyes', category: 'general', present: true, weight: 2 },
    { rubric: 'palpitation', category: 'particular', present: true, weight: 1 },
  ], modalities: [], familyHistory: [], profile: DEFAULT_PROFILE },

  { id: 29, name: 'Caust', expected: 'caust', symptoms: [
    { rubric: 'hoarseness gradual loss voice', category: 'particular', present: true, weight: 3 },
    { rubric: 'sympathetic injustice weeping compassion', category: 'mental', present: true, weight: 3 },
    { rubric: 'weakness progressive paralysis', category: 'general', present: true, weight: 2 },
    { rubric: 'ptosis eyelid drooping', category: 'particular', present: true, weight: 2 },
    { rubric: 'worse dry cold', category: 'general', present: true, weight: 2 },
    { rubric: 'better damp wet weather', category: 'general', present: true, weight: 3 },
    { rubric: 'thirst cold drinks', category: 'general', present: true, weight: 1 },
  ], modalities: [], familyHistory: [], profile: DEFAULT_PROFILE },

  { id: 31, name: 'Med', expected: 'med', symptoms: [
    { rubric: 'eczema since birth', category: 'particular', present: true, weight: 2 },
    { rubric: 'itching worse night', category: 'particular', present: true, weight: 2 },
    { rubric: 'sleep position abdomen prone', category: 'general', present: true, weight: 3 },
    { rubric: 'better at sea seashore', category: 'general', present: true, weight: 3 },
    { rubric: 'desire sweets', category: 'general', present: true, weight: 1 },
    { rubric: 'better evening worse morning', category: 'general', present: true, weight: 2 },
  ], modalities: [], familyHistory: ['papillomas', 'asthma'], profile: { ...DEFAULT_PROFILE, age: 'child' } },
]

const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

for (const c of CASES) {
  const results = analyzePipeline(data, c.symptoms, c.modalities, c.familyHistory, c.profile)
  const present = c.symptoms.filter(s => s.present).map(s => s.rubric.toLowerCase())

  // Позиция expected
  const pos = results.findIndex(r => norm(r.remedy) === c.expected)
  const expResult = pos >= 0 ? results[pos] : null
  const winResult = results[0]

  console.log('\n' + '='.repeat(90))
  console.log(`#${c.id} ${c.name} (expected: ${c.expected}) → ${pos >= 0 ? 'POS ' + (pos + 1) : 'NOT FOUND'}`)
  console.log('='.repeat(90))

  // Top-3
  for (let i = 0; i < Math.min(3, results.length); i++) {
    const r = results[i]
    const rn = norm(r.remedy)
    const kent = r.lenses.find(l => l.name === 'Kent')!.score
    const hier = r.lenses.find(l => l.name === 'Hierarchy')!.score
    const cs = r.lenses.find(l => l.name === 'Constellation')!.score
    const pol = r.lenses.find(l => l.name === 'Polarity')!.score
    const mark = rn === c.expected ? ' <<<' : ''
    console.log(`  ${(i+1)}. ${rn.padEnd(10)} total:${String(r.totalScore).padStart(3)} kent:${String(kent).padStart(3)} hier:${String(hier).padStart(3)} cs:${String(cs).padStart(3)} pol:${String(pol).padStart(3)}${mark}`)
  }
  if (pos >= 3 && expResult) {
    const kent = expResult.lenses.find(l => l.name === 'Kent')!.score
    const hier = expResult.lenses.find(l => l.name === 'Hierarchy')!.score
    const cs = expResult.lenses.find(l => l.name === 'Constellation')!.score
    const pol = expResult.lenses.find(l => l.name === 'Polarity')!.score
    console.log(`  ${pos+1}. ${c.expected.padEnd(10)} total:${String(expResult.totalScore).padStart(3)} kent:${String(kent).padStart(3)} hier:${String(hier).padStart(3)} cs:${String(cs).padStart(3)} pol:${String(pol).padStart(3)} <<<`)
  }

  // Constellation details для expected и winner
  for (const remName of [c.expected, norm(winResult.remedy)]) {
    if (remName === c.expected && norm(winResult.remedy) === c.expected) continue // Не дублировать
    const con = constellations[remName]
    if (!con?.clusters) { console.log(`\n  [${remName}] нет constellation`); continue }

    let fullM = 0, partM = 0, totalS = 0
    for (const cl of con.clusters) {
      for (const sym of cl.symptoms) {
        totalS++
        if (present.some(p => symMatch(p, sym.rubric))) fullM++
      }
    }
    const pct = totalS > 0 ? Math.round(fullM / totalS * 100) : 0
    console.log(`  [${remName}] constellation: ${fullM}/${totalS} full matches (${pct}%)`)
  }

  // Диагноз: почему проигрывает?
  if (pos > 0 && expResult) {
    const wKent = winResult.lenses.find(l => l.name === 'Kent')!.score
    const wCs = winResult.lenses.find(l => l.name === 'Constellation')!.score
    const eKent = expResult.lenses.find(l => l.name === 'Kent')!.score
    const eCs = expResult.lenses.find(l => l.name === 'Constellation')!.score

    const reasons: string[] = []
    if (wKent > eKent + 10) reasons.push(`kent: winner ${wKent} >> expected ${eKent}`)
    if (wCs > eCs + 10) reasons.push(`cs: winner ${wCs} >> expected ${eCs}`)
    if (wCs === 0 && wKent > eKent) reasons.push(`winner has cs=0 but higher kent (polycrest domination)`)
    if (eCs > wCs && eKent < wKent) reasons.push(`expected has better cs (${eCs}>${wCs}) but worse kent (${eKent}<${wKent})`)
    console.log(`  ПРИЧИНА: ${reasons.join('; ') || 'tie / marginal difference'}`)
  }
}
