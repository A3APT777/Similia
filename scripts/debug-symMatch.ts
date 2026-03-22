import { symMatch, SYNONYM_WORD_INDEX, SYNONYM_MAP } from '../src/lib/mdri/synonyms'

// Тесты: [patient, target, expected]
// Из 5 разборов — конкретные ложные и правильные совпадения
const tests: [string, string, boolean][] = [
  // === ДОЛЖНЫ СОВПАДАТЬ (true) ===
  ['suppressed anger indignation humiliation', 'anger suppressed', true],
  ['suppressed anger indignation humiliation', 'ailments indignation', true],
  ['suppressed anger indignation humiliation', 'ailments humiliation', true],
  ['grief suppressed old silent weeping alone', 'grief suppressed', true],
  ['grief suppressed old silent weeping alone', 'weeping alone', true],
  ['consolation aggravates', 'consolation agg', true],
  ['desire eggs', 'desire eggs', true],
  ['chilly', 'chilly cold agg', true],
  ['fear dark terror panic', 'fear dark extreme terror', true],
  ['fear water shining objects', 'fear water shining objects', true],
  ['nightmares terror waking screaming', 'nightmares terror', true],
  ['weakness trembling anticipation exam', 'trembling weakness', true],
  ['weakness trembling anticipation exam', 'anticipation anxiety paralysing', true],
  ['drowsiness heaviness eyelids', 'heaviness eyelids', true],
  ['drowsiness heaviness eyelids', 'dullness drowsiness', true],
  ['thirstless during fever', 'thirstless fever', true],
  ['warts after vaccination', 'warts condylomata', true],
  ['warts after vaccination', 'vaccination effects', true],
  ['skin oily greasy', 'oily skin', true],
  ['vomiting diarrhea simultaneous cholera', 'vomiting diarrhea simultaneous', true],
  ['cold sweat forehead', 'cold sweat forehead', true],
  ['collapse prostration extreme', 'collapse prostration', true],
  ['cramps legs calves', 'cramps extremities', true],
  ['violent aggressive biting striking', 'violence rage', true],
  ['worse alone', 'fear alone', true],
  ['stammering speech', 'stammering', true],
  ['perspiration head night', 'head sweating', true],
  ['obstinate', 'obstinate', true],
  ['slow development late walking late teething', 'slow development children', true],
  ['feet cold damp', 'cold damp feet', true],

  // === НЕ ДОЛЖНЫ СОВПАДАТЬ (false) ===
  // Из case #2: Hep constellation ложно матчит Calc case
  ['feet cold damp', 'cold air agg slightest', false],       // "cold" не = "cold air agg"
  ['chilly', 'cold air agg slightest', false],                // chilly ≠ cold air draft
  ['perspiration head night', 'splinter sensation', false],   // нет связи
  ['sour smell body', 'anger violent from pain', false],      // нет связи
  ['desire eggs', 'pain extreme sensitivity', false],         // нет связи
  ['obstinate', 'cold air agg slightest', false],             // нет связи

  // Из case #30: Ars constellation ложно матчит Stram case
  ['fear dark terror panic', 'fear death', false],            // fear dark ≠ fear death
  ['fear dark terror panic', 'anxiety restlessness', false],  // fear dark ≠ anxiety
  ['fear water shining objects', 'fastidious orderly', false],
  ['violent aggressive biting striking', 'anxiety midnight after', false],
  ['nightmares terror waking screaming', 'burning pains amel heat', false],
  ['worse alone', 'thirst small sips frequently', false],
  ['worse alone', 'midnight agg 1-2am', false],
  ['stammering speech', 'prostration out of proportion', false],

  // Из case #44: Ars constellation ложно матчит Verat case
  ['thirst ice cold water', 'thirst small sips frequently', false],  // большая жажда ≠ маленькие глотки!
  ['cold sweat forehead', 'chilly', false],                   // cold sweat ≠ chilly
  ['collapse prostration extreme', 'prostration out of proportion', true],  // это совпадение ok
  ['vomiting diarrhea simultaneous cholera', 'anxiety restlessness', false],
  ['cramps legs calves', 'burning pains amel heat', false],
  ['pale bluish face', 'fastidious orderly', false],

  // Из case #23: Carc constellation ложно матчит Thuj case
  ['secretive reserved', 'sympathetic sensitive', false],     // secretive ≠ sympathetic
  ['secretive reserved', 'suppressed emotions pleasing', false],
  ['warts after vaccination', 'desire travel', false],
  ['fixed ideas delusion body fragile', 'love thunderstorms', false],
  ['worse damp', 'perfectionist responsible', false],
]

let pass = 0, fail = 0
const failures: string[] = []

for (const [p, t, expected] of tests) {
  const result = symMatch(p, t)
  if (result === expected) {
    pass++
  } else {
    fail++
    failures.push(`  ${result ? 'FALSE+' : 'FALSE-'} symMatch("${p}", "${t}") = ${result}, expected ${expected}`)
  }
}

console.log(`symMatch test: ${pass} pass, ${fail} fail out of ${tests.length}`)
if (failures.length) {
  console.log('\nFAILURES:')
  failures.forEach(f => console.log(f))
}
