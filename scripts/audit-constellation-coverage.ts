/**
 * Аудит constellation coverage после symMatch rewrite.
 * Для каждого из 50 кейсов:
 * 1. Какой cs% получает правильный препарат?
 * 2. Сколько симптомов из constellation совпали?
 * 3. Есть ли cs=0 для правильного препарата (потеря)?
 */
import { symMatch, SYNONYM_MAP, SYNONYM_WORD_INDEX } from '../src/lib/mdri/synonyms'
import { readFileSync } from 'fs'
import { join } from 'path'

const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
const constellations: Record<string, any> = {}
for (const c of constellationsRaw) {
  constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
}

// Импорт тест-кейсов — берём symptoms и expected из test-50-cases
// Упрощённый вариант: берём данные напрямую
const CASES: { id: number; name: string; expected: string; symptoms: string[] }[] = [
  { id: 1, name: 'Sulphur', expected: 'sulph', symptoms: ['itching skin worse heat washing', 'burning feet at night uncovers', 'hunger 11am emptiness stomach', 'aversion bathing', 'theorizing philosophizing', 'standing aggravates', 'redness orifices'] },
  { id: 2, name: 'Calc', expected: 'calc', symptoms: ['perspiration head night', 'feet cold damp', 'slow development late walking late teething', 'desire eggs', 'fear dogs', 'obstinate', 'chilly', 'sour smell body'] },
  { id: 3, name: 'Lyc', expected: 'lyc', symptoms: ['distension abdomen after eating few mouthfuls', 'complaints right side', 'worse 4pm 8pm afternoon evening', 'anxiety anticipation stage fright', 'dictatorial domineering', 'desire sweets', 'warm drinks amel', 'flatulence bloating'] },
  { id: 4, name: 'Phos', expected: 'phos', symptoms: ['epistaxis bright red blood', 'fear dark thunderstorm alone', 'sympathetic compassionate', 'thirst cold water large quantities', 'worse twilight', 'burning pain between scapulae', 'desire ice cream'] },
  { id: 5, name: 'Sep', expected: 'sep', symptoms: ['indifference family husband children', 'bearing down sensation prolapse uterus', 'yellow spots face chloasma', 'constipation', 'desire vinegar sour', 'better vigorous exercise dancing', 'irritability'] },
  { id: 6, name: 'Ars', expected: 'ars', symptoms: ['anxiety health hypochondria cancer', 'fastidious orderly', 'restlessness cannot lie still', 'worse after midnight 1am 2am', 'chilly', 'burning pains better warm applications', 'thirst small sips frequently', 'weakness prostration disproportionate'] },
  { id: 7, name: 'Nux-v', expected: 'nux-v', symptoms: ['irritability impatience', 'overwork sedentary', 'desire stimulants coffee alcohol', 'constipation ineffectual urging', 'nausea morning', 'sensitive noise light', 'chilly worse draft'] },
  { id: 8, name: 'Puls', expected: 'puls', symptoms: ['weeping easily consolation amel', 'thirstless', 'worse warm room better open air', 'changeable mood', 'aversion fat food nausea', 'mild yielding gentle'] },
  { id: 9, name: 'Bell', expected: 'bell', symptoms: ['fever sudden high temperature', 'face red hot congested', 'pupils dilated', 'headache throbbing pulsating worse light noise', 'worse jarring', 'delirium fever', 'dry heat'] },
  { id: 10, name: 'Rhus-t', expected: 'rhus-t', symptoms: ['stiffness joints morning first motion', 'better continued motion limbers up', 'worse rest cannot sit still', 'worse damp wet weather', 'restless night tossing turning', 'better warm bath'] },
  { id: 11, name: 'Staph', expected: 'staph', symptoms: ['suppressed anger indignation humiliation', 'styes recurrent', 'cystitis after coition', 'sensitive offended easily', 'ailments from humiliation'] },
  { id: 12, name: 'Aur', expected: 'aur', symptoms: ['depression suicidal impulse jump from height', 'self reproach guilt duty', 'anger contradiction', 'conscientious responsible workaholic', 'palpitation heart', 'worse night'] },
  { id: 13, name: 'Cham', expected: 'cham', symptoms: ['dentition difficult teething pain', 'one cheek red other pale', 'capricious asks then refuses', 'wants to be carried', 'stool green', 'oversensitive pain intolerance'] },
  { id: 14, name: 'Apis', expected: 'apis', symptoms: ['edema swelling stinging pain', 'better cold applications', 'thirstless', 'worse heat in any form', 'jealousy', 'right side worse'] },
  { id: 15, name: 'Gels', expected: 'gels', symptoms: ['weakness trembling anticipation exam', 'drowsiness heaviness eyelids', 'tremor trembling weakness', 'thirstless during fever', 'gradual onset'] },
  { id: 16, name: 'Merc', expected: 'merc', symptoms: ['abscess gum suppuration', 'salivation profuse', 'offensive breath mouth', 'tongue imprint teeth', 'perspiration night no relief', 'worse night', 'sensitive heat and cold equally'] },
  { id: 17, name: 'Con', expected: 'con', symptoms: ['vertigo turning head', 'worse watching moving objects', 'weakness ascending', 'induration glands breast hard', 'memory weak'] },
  { id: 18, name: 'Kali-c', expected: 'kali-c', symptoms: ['waking 2am 3am dyspnea', 'rigid duty conscientious rules', 'anxiety felt in stomach', 'stitching pain', 'edema upper eyelids puffiness', 'weakness back lumbar', 'chilly', 'startled easily'] },
  { id: 19, name: 'Arg-n', expected: 'arg-n', symptoms: ['diarrhea anticipation anxiety before event', 'hurry impatience', 'fear heights bridges impulse jump', 'desire sweets worse from them', 'flatulence loud'] },
  { id: 20, name: 'Petr', expected: 'petr', symptoms: ['cracks fissures hands deep bleeding winter', 'worse washing cold weather', 'skin rough dry', 'motion sickness nausea travel', 'hunger with nausea'] },
  { id: 21, name: 'Lac-c', expected: 'lac-c', symptoms: ['sore throat alternating sides', 'headache alternating sides left right', 'self contempt worthlessness', 'fear snakes', 'sensation throat constriction', 'worse touch throat'] },
  { id: 22, name: 'Cocc', expected: 'cocc', symptoms: ['exhaustion nursing caring watching sleeplessness', 'motion sickness nausea vertigo', 'emptiness hollow sensation', 'weakness extreme'] },
  { id: 23, name: 'Thuj', expected: 'thuj', symptoms: ['warts after vaccination', 'skin oily greasy', 'discharge greenish', 'secretive reserved', 'fixed ideas delusion body fragile', 'worse damp', 'left side'] },
  { id: 24, name: 'Spong', expected: 'spong', symptoms: ['cough barking dry croup sawing', 'wheezing respiration difficult', 'anxiety dyspnea', 'larynx sensitive touch', 'worse before midnight', 'better warm drinks'] },
  { id: 25, name: 'Ip', expected: 'ip', symptoms: ['nausea constant vomiting does not relieve', 'tongue clean despite nausea', 'epistaxis with nausea bright blood', 'cough spasmodic nausea'] },
  { id: 26, name: 'Dros', expected: 'dros', symptoms: ['cough paroxysmal whooping spasmodic', 'cough ending vomiting', 'worse lying down', 'worse after midnight', 'epistaxis from cough', 'worse talking laughing'] },
  { id: 27, name: 'Coloc', expected: 'coloc', symptoms: ['colic abdomen doubling up bending', 'ailments from anger indignation', 'better hard pressure', 'better warmth heat', 'pain cramping waves'] },
  { id: 28, name: 'Tab', expected: 'tab', symptoms: ['motion sickness nausea deathly', 'pallor deathly pale face', 'cold sweat', 'better open air', 'worse opening eyes', 'palpitation'] },
  { id: 29, name: 'Caust', expected: 'caust', symptoms: ['hoarseness gradual loss voice', 'sympathetic injustice weeping compassion', 'weakness progressive paralysis', 'ptosis eyelid drooping', 'worse dry cold', 'better damp wet weather', 'thirst cold drinks'] },
  { id: 30, name: 'Stram', expected: 'stram', symptoms: ['fear dark terror panic', 'fear water shining objects', 'violent aggressive biting striking', 'stammering speech', 'nightmares terror waking screaming', 'worse alone'] },
  { id: 31, name: 'Med', expected: 'med', symptoms: ['eczema since birth', 'itching worse night', 'sleep position abdomen prone', 'better at sea seashore', 'desire sweets', 'better evening worse morning'] },
  { id: 32, name: 'Tub', expected: 'tub', symptoms: ['desire travel change restlessness', 'emaciation despite appetite', 'catches cold easily', 'romantic idealistic', 'perspiration night', 'glands enlarged swollen', 'allergies'] },
  { id: 33, name: 'Psor', expected: 'psor', symptoms: ['eczema worse winter', 'chilly extremely', 'despair recovery hopeless', 'offensive smell body even after washing', 'hunger night', 'eruptions suppressed worse', 'dirty appearance'] },
  { id: 34, name: 'Carc', expected: 'carc', symptoms: ['perfectionism fastidious for others', 'insomnia', 'desire thunderstorm', 'desire travel', 'sympathetic weeping for others', 'moles naevi many', 'suppressed emotions smiling always'] },
  { id: 35, name: 'Sil', expected: 'sil', symptoms: ['thin delicate but obstinate', 'chilly extremely', 'perspiration head night', 'feet perspiration offensive', 'suppuration every wound', 'stage fright', 'mild yielding but fixed determination', 'foreign body expulsion splinter'] },
  { id: 36, name: 'Graph', expected: 'graph', symptoms: ['eczema moist discharge honey sticky', 'cracks folds skin behind ears', 'obesity overweight', 'chilly', 'constipation stool large hard', 'irresolution timidity', 'nails deformed thick'] },
  { id: 37, name: 'Hep', expected: 'hep', symptoms: ['abscess tonsil suppuration', 'oversensitive pain touch slightest', 'discharge offensive cheese old', 'intolerance cold slightest draft', 'irritability cross angry from pain', 'sensation splinter throat'] },
  { id: 38, name: 'Bar-c', expected: 'bar-c', symptoms: ['slow development late speech late walking', 'bashful shy hides behind mother', 'tonsils enlarged chronic', 'chilly', 'memory weak forgetful', 'small stature short for age', 'catches cold easily'] },
  { id: 39, name: 'Lach', expected: 'lach', symptoms: ['hot flushes menopause climacteric', 'left side complaints', 'intolerance tight clothing around neck', 'jealousy suspicious', 'loquacity talkative', 'worse after sleep', 'hot patient', 'headache left worse sun'] },
  { id: 40, name: 'Ph-ac', expected: 'ph-ac', symptoms: ['apathy indifference grief loss', 'mental exhaustion dullness', 'hair loss falling', 'diarrhea painless', 'face pale emaciated', 'growth retarded'] },
  { id: 41, name: 'Bry', expected: 'bry', symptoms: ['arthritis joints worse motion any movement', 'swelling joints', 'better pressure lying still immobility', 'thirst large quantities', 'dryness mouth mucous membranes', 'irritability wants to be alone'] },
  { id: 42, name: 'Nat-m', expected: 'nat-m', symptoms: ['grief suppressed old silent weeping alone', 'consolation aggravates', 'headache sun heat', 'desire salt', 'emaciation', 'worse sun 10am 11am'] },
  { id: 43, name: 'Arn', expected: 'arn', symptoms: ['bruises contusions injury trauma', 'bed feels too hard soreness', 'says nothing wrong refuses help well', 'fear touch approached', 'ecchymosis bruise'] },
  { id: 44, name: 'Verat', expected: 'verat', symptoms: ['vomiting diarrhea simultaneous cholera', 'cold sweat forehead', 'collapse prostration extreme', 'cramps legs calves', 'pale bluish face', 'thirst ice cold water'] },
  { id: 45, name: 'Mag-p', expected: 'mag-p', symptoms: ['cramps spasms menstrual dysmenorrhea', 'better warmth heat hot applications', 'better bending doubling up', 'better pressure', 'right side worse', 'pain lightning shooting come go suddenly'] },
  { id: 46, name: 'All-c', expected: 'all-c', symptoms: ['coryza discharge acrid burning nose', 'lachrymation bland not burning', 'sneezing', 'worse warm room better open air', 'coryza after getting wet'] },
  { id: 47, name: 'Ferr', expected: 'ferr', symptoms: ['anemia pallor', 'face flushes easily red', 'weakness better slow walking', 'flushing slightest exertion', 'vomiting after eating', 'false plethora looks healthy but anemic'] },
  { id: 48, name: 'Nat-s', expected: 'nat-s', symptoms: ['head injury concussion headache chronic', 'worse damp wet weather', 'worse morning', 'discharge yellow green', 'left side', 'suicidal thoughts', 'asthma damp weather', 'diarrhea morning'] },
  { id: 49, name: 'Cina', expected: 'cina', symptoms: ['grinding teeth bruxism night', 'boring picking nose constant', 'irritable cross touched carried aversion', 'capricious', 'hunger canine ravenous', 'worms parasites', 'pallor around mouth'] },
  { id: 50, name: 'Plat', expected: 'plat', symptoms: ['haughty contemptuous arrogant', 'objects appear small delusion', 'pain gradually comes goes', 'sexual desire increased', 'numbness tingling'] },
]

// Для каждого кейса — считаем constellation match для правильного препарата
console.log('='.repeat(100))
console.log('АУДИТ CONSTELLATION COVERAGE — symMatch v2')
console.log('='.repeat(100))

let totalWithConstellation = 0
let totalWithMatch = 0
let totalZeroCs = 0
let totalFullMatches = 0
let totalPartialMatches = 0
let totalSymptoms = 0

for (const c of CASES) {
  const con = constellations[c.expected]
  if (!con?.clusters) {
    console.log(`  #${c.id} ${c.name.padEnd(8)} | NO CONSTELLATION DATA`)
    continue
  }

  totalWithConstellation++
  const present = c.symptoms.map(s => s.toLowerCase())

  let fullMatches = 0
  let partialMatches = 0
  let totalConSymptoms = 0
  const details: string[] = []

  for (const cl of con.clusters) {
    for (const sym of cl.symptoms) {
      totalConSymptoms++
      totalSymptoms++
      const fm = present.some(p => symMatch(p, sym.rubric))
      if (fm) {
        fullMatches++
        totalFullMatches++
        details.push(`  [FULL] ${sym.rubric}`)
      } else {
        // Partial (как в constellationScore)
        const pm = present.some(p => {
          const tw = sym.rubric.toLowerCase().split(' ').filter((w: string) => w.length > 3)
          const pw = p.split(' ').filter((w: string) => w.length > 3)
          const mc = tw.filter((t: string) => pw.some((pp: string) => pp.includes(t) || t.includes(pp))).length
          return tw.length > 0 && mc >= (tw.length >= 3 ? 2 : 1)
        })
        if (pm) {
          partialMatches++
          totalPartialMatches++
          details.push(`  [PART] ${sym.rubric}`)
        } else {
          details.push(`  [MISS] ${sym.rubric}`)
        }
      }
    }
  }

  const hasMatch = fullMatches > 0 || partialMatches > 0
  if (hasMatch) totalWithMatch++
  if (fullMatches === 0 && partialMatches === 0) totalZeroCs++

  const status = fullMatches === 0 && partialMatches === 0 ? '*** ZERO ***' :
    fullMatches >= 3 ? 'STRONG' :
    fullMatches >= 1 ? 'OK' : 'WEAK'

  console.log(`  #${String(c.id).padStart(2)} ${c.name.padEnd(8)} | full:${fullMatches} part:${partialMatches} miss:${totalConSymptoms - fullMatches - partialMatches}/${totalConSymptoms} | ${status}`)
  if (fullMatches === 0) {
    details.forEach(d => console.log('    ' + d))
  }
}

console.log('\n' + '='.repeat(100))
console.log('СВОДКА:')
console.log(`  Кейсов с constellation data: ${totalWithConstellation}/50`)
console.log(`  Кейсов с >=1 match:          ${totalWithMatch}/${totalWithConstellation}`)
console.log(`  Кейсов с cs=0 (потеря):       ${totalZeroCs}/${totalWithConstellation}`)
console.log(`  Всего constellation симптомов: ${totalSymptoms}`)
console.log(`  Full matches:                 ${totalFullMatches} (${(totalFullMatches/totalSymptoms*100).toFixed(1)}%)`)
console.log(`  Partial matches:              ${totalPartialMatches} (${(totalPartialMatches/totalSymptoms*100).toFixed(1)}%)`)
console.log(`  Misses:                       ${totalSymptoms - totalFullMatches - totalPartialMatches} (${((totalSymptoms-totalFullMatches-totalPartialMatches)/totalSymptoms*100).toFixed(1)}%)`)
