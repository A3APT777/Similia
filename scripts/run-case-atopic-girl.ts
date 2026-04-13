/**
 * Одноразовый прогон клинического кейса через MDRI + grounded verifier.
 *
 * Кейс: девочка 7 лет, атопический дерматит с 3 лет, после переезда,
 * обострение зимой. Творческая, поёт/рисует, перфекционизм к своей
 * работе (истерика от кривого рисунка), passion к шоколаду, танцы+
 * качели+музыка, «старается быть правильной», много родинок, семейный
 * ТБ (дедушка, возможно мама), тики мигрирующие, отстаёт в росте.
 *
 * Моя клиническая гипотеза: Carcinosinum HIGH. Проверяем через engine.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIClinicalData,
} from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import { computeConfidence } from '../src/lib/mdri/product-layer'
import { verifyTop5 } from '../src/lib/actions/ai-consultation'
import { detectEtiologies } from '../src/lib/mdri/etiology-detector'

function loadData(): MDRIData {
  const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
  const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
  const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
  const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
  const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

  const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({ rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies }))
  const constellations: Record<string, MDRIConstellationData> = {}
  for (const c of constellationsRaw) constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
  const polarities: Record<string, MDRIPolarityData> = {}
  for (const p of polaritiesRaw) polarities[p.remedy] = p.polarities
  const clinicalData: MDRIClinicalData = { thermal_contradictions: {}, consistency_groups: [] }
  for (const cd of clinicalRaw) if (cd.type === 'thermal_contradiction' && cd.data) Object.assign(clinicalData.thermal_contradictions, cd.data)
  const indices = buildIndices(repertory, constellations)
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...indices }
}

// Структурированные симптомы на английском (Kent rubric style)
const symptoms: MDRISymptom[] = [
  // Mental / emotional
  { rubric: 'ailments from mortification humiliation criticism', category: 'mental', present: true, weight: 3 },
  { rubric: 'anticipation anxious sensitive criticism', category: 'mental', present: true, weight: 3 },
  { rubric: 'conscientious about trifles perfectionism own work', category: 'mental', present: true, weight: 3 },
  { rubric: 'desire to please people-pleasing good girl', category: 'mental', present: true, weight: 3 },
  { rubric: 'nervous tics twitching face blinking lips migratory', category: 'mental', present: true, weight: 3 },
  { rubric: 'weeping alternating cheerfulness rapid mood changes', category: 'mental', present: true, weight: 2 },
  { rubric: 'artistic creative children sings draws music', category: 'mental', present: true, weight: 3 },
  { rubric: 'loves dancing rocking swinging music', category: 'mental', present: true, weight: 3 },
  { rubric: 'anger burst quick recovery forgets', category: 'mental', present: true, weight: 2 },
  { rubric: 'biting objects non-food pica clothing', category: 'mental', present: true, weight: 2 },
  { rubric: 'fear strangers timid when alone', category: 'mental', present: true, weight: 2 },
  { rubric: 'fear animals dogs cautious', category: 'mental', present: true, weight: 1 },
  { rubric: 'many fears general anxiety', category: 'mental', present: true, weight: 2 },

  // General
  { rubric: 'family history tuberculosis grandfather mother', category: 'general', present: true, weight: 3 },
  { rubric: 'failure to thrive small stature thin below peers', category: 'general', present: true, weight: 3 },
  { rubric: 'ailments from moving change of residence new house', category: 'general', present: true, weight: 2 },
  { rubric: 'ailments from birth trauma asphyxia cord around neck', category: 'general', present: true, weight: 2 },
  { rubric: 'desire sweets chocolate passionate craving', category: 'general', present: true, weight: 3 },
  { rubric: 'desire oranges', category: 'general', present: true, weight: 2 },
  { rubric: 'desire salt', category: 'general', present: true, weight: 2 },
  { rubric: 'desire fruit juicy', category: 'general', present: true, weight: 2 },
  { rubric: 'desire cold drinks ice cream', category: 'general', present: true, weight: 2 },
  { rubric: 'hot patient amelioration cold air fresh', category: 'general', present: true, weight: 3 },
  { rubric: 'loves seashore sea summer warm weather', category: 'general', present: true, weight: 2 },
  { rubric: 'sleep deep heavy falls asleep rapidly', category: 'general', present: true, weight: 1 },
  { rubric: 'sleep position curled embryo side back without blanket', category: 'general', present: true, weight: 1 },
  { rubric: 'desire travel change of place wanderlust mild', category: 'general', present: true, weight: 1 },

  // Particular
  { rubric: 'skin eczema chronic children flexures elbows knees neck eyelids', category: 'particular', present: true, weight: 3 },
  { rubric: 'skin eczema worse winter cold season', category: 'particular', present: true, weight: 2 },
  { rubric: 'itching skin worse bathing washing water', category: 'particular', present: true, weight: 3 },
  { rubric: 'itching skin worse night in bed', category: 'particular', present: true, weight: 3 },
  { rubric: 'itching scratches until bleeds uncontrolled', category: 'particular', present: true, weight: 2 },
  { rubric: 'skin many moles naevi pigmentation', category: 'particular', present: true, weight: 2 },
]

const modalities: MDRIModality[] = [
  { pairId: 'heat_cold', value: 'amel' },   // пациент жаркий, лучше от холода
]

const familyHistory: string[] = ['tuberculosis']

const profile: MDRIPatientProfile = {
  ...DEFAULT_PROFILE,
  age: 'child',
  acuteOrChronic: 'chronic',
  vitality: 'medium',
  sensitivity: 'high',
}

async function main() {
  console.log('Загрузка MDRI данных...')
  const data = loadData()
  console.log(`Загружено: ${data.repertory.length} рубрик, ${Object.keys(data.constellations).length} constellations\n`)

  console.log('='.repeat(100))
  console.log('КЛИНИЧЕСКИЙ КЕЙС: девочка 7 лет, атопический дерматит + тики + ТБ в семье')
  console.log('='.repeat(100))

  // Шаг 1: Распознанные этиологии
  const etiologies = detectEtiologies(symptoms)
  console.log(`\n### ЭТИОЛОГИИ (Causa) — распознано ${etiologies.length}:`)
  for (const e of etiologies) {
    console.log(`  • ${e.labelRu} → top: ${e.topRemedies.slice(0, 5).join(', ')} | 2nd: ${e.secondaryRemedies.join(', ')}`)
  }

  // Шаг 2: Engine
  console.log(`\n### ENGINE (analyzePipeline)`)
  const engineResults = analyzePipeline(data, symptoms, modalities, familyHistory, profile)
  console.log(`\nEngine Top-10:`)
  for (let i = 0; i < Math.min(10, engineResults.length); i++) {
    const r = engineResults[i]
    const kent = r.lenses?.find(l => l.name === 'Kent')?.score ?? 0
    const cs = r.lenses?.find(l => l.name === 'Constellation')?.score ?? 0
    const cov = r.lenses?.find(l => l.name === 'Coverage')?.score ?? 0
    console.log(`  #${String(i+1).padStart(2)} ${r.remedy.padEnd(10)} score:${String(r.totalScore).padStart(3)} | kent:${kent} cs:${cs} cov:${cov}%`)
  }

  // Шаг 3: Verifier с grounded MM
  console.log(`\n### VERIFIER (Sonnet + grounded MM cards)`)
  const syntheticText = [
    'Пациент: девочка, 7 лет, атопический дерматит с 3 лет после переезда в новую квартиру.',
    'Обострение зимой. Экзема на руках, веках, животе, сгибах, шее. Зудит после купания и ночью, до крови.',
    'Психика: нервная, часто плачет, но весёлая, быстро переключается. Творческая — поёт, рисует. Любит танцевать, качели, музыку.',
    'Перфекционизм к своей работе — от кривого рисунка истерика. Страстная любовь к шоколаду, ест сколько дадут.',
    'Старается угождать, быть правильной, не любит критику.',
    'Много родинок на теле. Отстаёт в росте и весе от сверстников.',
    'Страхи: животных, чужих людей когда одна. Темноты НЕ боится.',
    'Любит море, лето, сладкое, апельсины, соль, холодное, мороженое, фрукты. Пьёт молоко нормально.',
    'Жаркая, лучше от холода. Спит на боку/спине без одеяла, глубоко.',
    'Грызёт неедобное — пульт, одежду, ремешок часов.',
    'Нервные тики: моргание → губы уточкой + морщит нос (мигрирующие).',
    'Обвитие пуповиной при родах, не вскрикнула сразу.',
    'Семейный ТБ: дедушка по маме, возможно мама.',
    'Во время беременности мама возможно была в стрессе.',
  ].join(' ')

  try {
    const top5 = engineResults.slice(0, 5)
    const verified = await verifyTop5(syntheticText, top5)
    if (verified) {
      console.log('\nVerifier Top-5 (переранжировано по MM):')
      for (let i = 0; i < verified.length; i++) {
        console.log(`  #${i+1} ${verified[i].remedy.padEnd(10)} (engine score: ${verified[i].totalScore})`)
      }
      const reranked = top5[0]?.remedy !== verified[0]?.remedy
      if (reranked) {
        console.log(`\n  ⚠ Verifier переставил: было ${top5[0]?.remedy} → стал ${verified[0]?.remedy}`)
      } else {
        console.log(`\n  ✓ Verifier подтвердил engine top-1: ${verified[0]?.remedy}`)
      }
    } else {
      console.log('  Verifier не смог (null)')
    }
  } catch (e) {
    console.error('Verifier failed:', e instanceof Error ? e.message : e)
  }

  // Шаг 4: Confidence
  const conf = computeConfidence(symptoms, modalities, engineResults, [])
  console.log(`\n### CONFIDENCE: ${conf.level.toUpperCase()} — ${conf.label}`)
  for (const f of conf.factors ?? []) {
    console.log(`  ${f.passed ? '✓' : '○'} ${f.name}: ${f.value} (${f.required})`)
  }

  // Шаг 5: Моя клиническая гипотеза
  console.log(`\n### МОЯ КЛИНИЧЕСКАЯ ГИПОТЕЗА: Carcinosinum`)
  console.log(`  Cardinal keynotes:`)
  console.log(`    • Perfectionism к собственной работе (не к среде)`)
  console.log(`    • Passion к шоколаду`)
  console.log(`    • Loves dancing, rocking, swings, music`)
  console.log(`    • People-pleaser, sensitive to criticism`)
  console.log(`    • Many moles/naevi`)
  console.log(`    • Family TB history (Carc berёt tubercular миазм)`)

  const carcPos = engineResults.findIndex(r => r.remedy.toLowerCase().startsWith('carc'))
  console.log(`\n  Позиция Carcinosinum в engine: ${carcPos >= 0 ? '#' + (carcPos + 1) : 'не в top-20'}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
