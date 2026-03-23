import { symMatch } from '../src/lib/mdri/synonyms'

// Trace specific cases
const cases: [string, string][] = [
  ['violent aggressive biting striking', 'violence rage'],
  ['perspiration head night', 'head sweating'],
  ['chilly', 'cold air agg slightest'],
  ['thirst ice cold water', 'thirst small sips frequently'],
  ['collapse prostration extreme', 'prostration out of proportion'],
]

for (const [p, t] of cases) {
  const pWords = p.split(' ').filter(w => w.length > 2)
  const tWords = t.split(' ').filter(w => w.length > 2)

  // Exact word matches
  let ewm = 0
  for (const tw of tWords) {
    if (pWords.includes(tw)) { ewm++; console.log(`  exact: "${tw}"`); continue }
    for (const pw of pWords) {
      const shorter = pw.length < tw.length ? pw : tw
      const longer = pw.length < tw.length ? tw : pw
      if (shorter.length >= 5 && longer.startsWith(shorter)) {
        ewm++
        console.log(`  stem: "${pw}" ~ "${tw}" (${shorter} -> ${longer})`)
        break
      }
    }
  }

  console.log(`"${p}" vs "${t}" → exactWordMatches=${ewm}/${tWords.length}, result=${symMatch(p, t)}`)
  console.log()
}
