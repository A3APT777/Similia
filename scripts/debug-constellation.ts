import { symMatch } from '../src/lib/mdri/synonyms'
import { buildIndices } from '../src/lib/mdri/engine'
import { readFileSync } from 'fs'
import { join } from 'path'

const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))

const constellations: Record<string, any> = {}
for (const c of constellationsRaw) {
  constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
}
const repertory = repertoryRaw.map((r: any) => ({ rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies }))
const indices = buildIndices(repertory, constellations)

console.log('constellationWordIndex size:', indices.constellationWordIndex.size)

// Проверяем ключевые слова
for (const w of ['anger', 'suppressed', 'humiliation', 'sensitive', 'sympathetic', 'grief', 'travel']) {
  const idx = indices.constellationWordIndex.get(w)
  if (idx) {
    const rems = [...new Set(idx.map(x => x[0]))].slice(0, 5)
    console.log(w + ': ' + idx.length + ' entries → ' + rems.join(', '))
  } else {
    console.log(w + ': NOT FOUND')
  }
}

// Симулируем candidate selection для Case 11
const present = [
  'suppressed anger indignation humiliation',
  'styes recurrent',
  'cystitis after coition',
  'sensitive offended easily',
  'ailments from humiliation',
]

const candidates = new Set<string>()
for (const p of present) {
  const pWords = new Set(p.split(' ').filter(w => w.length > 2))
  for (const pw of pWords) {
    const idx = indices.constellationWordIndex.get(pw)
    if (idx) {
      for (const [remedy] of idx) candidates.add(remedy)
    }
  }
}
console.log('\nCandidates for Case 11:', candidates.size)
console.log('staph in candidates:', candidates.has('staph'))
console.log('carc in candidates:', candidates.has('carc'))
console.log('nat-m in candidates:', candidates.has('nat-m'))
