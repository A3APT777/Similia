import { symMatch, SYNONYM_MAP } from '../src/lib/mdri/synonyms'

// Trace "thirst ice cold water" vs "thirst small sips frequently"
const p = 'thirst ice cold water'
const t = 'thirst small sips frequently'
const pWords = p.split(' ').filter(w => w.length > 2)
const tWords = t.split(' ').filter(w => w.length > 2)

console.log('pWords:', pWords)
console.log('tWords:', tWords)

// Check synonym keys
for (const [key, syns] of Object.entries(SYNONYM_MAP)) {
  const keyWords = key.split(' ').filter(w => w.length > 2)
  if (keyWords.length === 0) continue
  if (!keyWords.some(kw => kw.length >= 5)) continue

  const patientHasKey = keyWords.every(kw =>
    pWords.some(pw => pw === kw || (Math.min(pw.length, kw.length) >= 5 && (() => { let cp=0; for(let i=0;i<Math.min(pw.length,kw.length);i++){if(pw[i]===kw[i])cp++;else break}; return cp>=5 })()))
  )
  if (!patientHasKey) continue

  const targetHasKey = keyWords.every(kw =>
    tWords.some(tw => tw === kw || (Math.min(tw.length, kw.length) >= 5 && (() => { let cp=0; for(let i=0;i<Math.min(tw.length,kw.length);i++){if(tw[i]===kw[i])cp++;else break}; return cp>=5 })()))
  )

  console.log('Key "' + key + '": patientHas=' + patientHasKey + ' targetHas=' + targetHasKey)
  if (targetHasKey) console.log('  >>> MATCHED via key')

  for (const syn of syns) {
    const synWords = syn.split(' ').filter(w => w.length > 2)
    if (synWords.length === 0) continue
    if (!synWords.some(sw => sw.length >= 5)) continue
    const targetHasSyn = synWords.every(sw =>
      tWords.some(tw => tw === sw || (Math.min(tw.length, sw.length) >= 5 && (() => { let cp=0; for(let i=0;i<Math.min(tw.length,sw.length);i++){if(tw[i]===sw[i])cp++;else break}; return cp>=5 })()))
    )
    if (targetHasSyn) console.log('  >>> MATCHED via syn "' + syn + '"')
  }
}

console.log('\nResult:', symMatch(p, t))
