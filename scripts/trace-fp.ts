import { SYNONYM_WORD_INDEX } from '../src/lib/mdri/synonyms'

const cases: [string, string][] = [
  ['feet cold damp', 'cold air agg slightest'],
  ['chilly', 'cold air agg slightest'],
  ['perspiration head night', 'splinter sensation'],
  ['fear dark terror panic', 'fear death'],
  ['fear dark terror panic', 'anxiety restlessness'],
  ['worse alone', 'midnight agg 1-2am'],
  ['thirst ice cold water', 'thirst small sips frequently'],
  ['cold sweat forehead', 'chilly'],
]

for (const [p, t] of cases) {
  const pW = new Set(p.split(' ').filter(w => w.length > 2))
  const tW = t.split(' ').filter(w => w.length > 2)

  // Word overlap
  let wm = 0
  const wordHits: string[] = []
  for (const tw of tW) {
    for (const pw of pW) {
      if (pw.includes(tw) || tw.includes(pw)) { wm++; wordHits.push(pw + '~' + tw); break }
    }
  }

  // Synonym
  const pK = new Set<string>()
  for (const pw of pW) { const k = SYNONYM_WORD_INDEX.get(pw); if (k) for (const x of k) pK.add(x) }
  const tK = new Set<string>()
  for (const tw of tW) { const k = SYNONYM_WORD_INDEX.get(tw); if (k) for (const x of k) tK.add(x) }
  const shared = [...pK].filter(k => tK.has(k))

  const matchedVia = wm >= tW.length * 0.5 ? 'WORD(' + wordHits.join(', ') + ')' : shared.length ? 'SYN(' + shared.join(', ') + ')' : 'NONE'
  console.log(`"${p}" vs "${t}"`)
  console.log(`  words: ${wm}/${tW.length}  via: ${matchedVia}`)
}
