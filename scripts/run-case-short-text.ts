/**
 * Сравнительный тест: что бы выдала система если бы врач ввёл
 * ТОЛЬКО исходный текст без уточнений?
 *
 * Это как раз первое сообщение в клиническом обсуждении — короткое,
 * без cardinal Carc keynotes (перфекционизм к работе, шоколад-passion,
 * танцы/качели, родинки, тики, ТБ в семье, people-pleaser).
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
import { selectBestClarifyQuestion } from '../src/lib/mdri/question-gain'
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

// Эмуляция того что Sonnet-парсер извлёк бы из короткого текста:
// «Девочка, 7 лет, атопический дерматит с 3 лет, после переезда в новую квартиру,
//  обострение зимой, руки, веки, живот, ноги на сгибах, шея. Нервная, часто плачет.
//  но в то же время веселая, любит лето и море, очень любит сладкое. во время
//  родов было обвитие, при рождении не вскрикнула сразу. Творческая, любит петь, рисовать.»
const symptoms: MDRISymptom[] = [
  { rubric: 'skin eczema chronic children flexures eyelids abdomen extremities neck', category: 'particular', present: true, weight: 3 },
  { rubric: 'skin eczema worse winter cold season', category: 'particular', present: true, weight: 2 },
  { rubric: 'ailments from moving change of residence new house', category: 'general', present: true, weight: 2 },
  { rubric: 'ailments from birth trauma asphyxia cord around neck', category: 'general', present: true, weight: 2 },
  { rubric: 'nervous weeping sensitive children', category: 'mental', present: true, weight: 2 },
  { rubric: 'cheerful alternating weeping rapid mood', category: 'mental', present: true, weight: 2 },
  { rubric: 'loves seashore sea summer warm weather', category: 'general', present: true, weight: 2 },
  { rubric: 'desire sweets passionate', category: 'general', present: true, weight: 3 },
  { rubric: 'artistic creative sings draws music', category: 'mental', present: true, weight: 2 },
]

const modalities: MDRIModality[] = [] // В тексте нет явных модальностей
const familyHistory: string[] = []
const profile: MDRIPatientProfile = { ...DEFAULT_PROFILE, age: 'child', acuteOrChronic: 'chronic' }

async function main() {
  const data = loadData()
  console.log('ИСХОДНЫЙ СИМВОЛЬНО-КОРОТКИЙ ТЕКСТ — как если бы врач ввёл и всё')
  console.log(`Симптомов извлечено: ${symptoms.length}, модальностей: ${modalities.length}\n`)

  // Этиологии
  const etiologies = detectEtiologies(symptoms)
  console.log(`### ЭТИОЛОГИИ: ${etiologies.length > 0 ? etiologies.map(e => e.labelRu).join(', ') : 'не распознано (нет маркеров ailments from/after)'}\n`)

  // Engine
  const engineResults = analyzePipeline(data, symptoms, modalities, familyHistory, profile)
  console.log('### ENGINE TOP-10:')
  for (let i = 0; i < Math.min(10, engineResults.length); i++) {
    const r = engineResults[i]
    const kent = r.lenses?.find(l => l.name === 'Kent')?.score ?? 0
    const cs = r.lenses?.find(l => l.name === 'Constellation')?.score ?? 0
    console.log(`  #${String(i+1).padStart(2)} ${r.remedy.padEnd(10)} score:${String(r.totalScore).padStart(3)} | kent:${kent} cs:${cs}`)
  }

  // Safety net: симптомов мало и/или engine уверен? → skip verifier
  const engineGap = (engineResults[0]?.totalScore ?? 0) - (engineResults[1]?.totalScore ?? 0)
  const enoughSymptoms = symptoms.length >= 12
  const engineUncertain = engineGap < 25
  const shouldVerify = enoughSymptoms && engineUncertain

  console.log(`\n### SAFETY NET:`)
  console.log(`  Симптомов: ${symptoms.length} (${enoughSymptoms ? '✓' : '✗'} нужно ≥12)`)
  console.log(`  Engine gap: ${engineGap}% (${engineUncertain ? 'uncertain' : 'decisive — verifier skip'})`)
  console.log(`  Verifier запускать: ${shouldVerify ? 'ДА' : 'НЕТ (engine остаётся)'}`)

  let verified: typeof engineResults | null = null
  const syntheticText = 'Девочка, 7 лет, атопический дерматит с 3 лет, после переезда в новую квартиру, обострение зимой, руки, веки, живот, ноги на сгибах, шея. Нервная, часто плачет. но в то же время веселая, любит лето и море, очень любит сладкое. во время родов было обвитие, при рождении не вскрикнула сразу. Творческая, любит петь, рисовать.'

  if (shouldVerify) {
    verified = await verifyTop5(syntheticText, engineResults.slice(0, 5))
    console.log('\n### VERIFIER TOP-5 (с grounded MM):')
    if (verified) {
      for (let i = 0; i < verified.length; i++) {
        console.log(`  #${i+1} ${verified[i].remedy.padEnd(10)} (engine score: ${verified[i].totalScore})`)
      }
      const reranked = engineResults[0]?.remedy !== verified[0]?.remedy
      console.log(`  ${reranked ? '⚠ Verifier переставил' : '✓ Verifier подтвердил engine top-1'}`)
    } else {
      console.log('  Verifier не смог (null)')
    }
  } else {
    console.log('\n### VERIFIER ПРОПУЩЕН (safety net)')
  }

  // Confidence
  const conf = computeConfidence(symptoms, modalities, verified ?? engineResults, [])
  console.log(`\n### CONFIDENCE: ${conf.level.toUpperCase()} — ${conf.label}`)
  for (const f of conf.factors ?? []) {
    console.log(`  ${f.passed ? '✓' : '○'} ${f.name}: ${f.value} (${f.required})`)
  }

  // Clarify question
  const clarifyQ = selectBestClarifyQuestion(verified ?? engineResults, data.constellations, symptoms)
  console.log('\n### УТОЧНЯЮЩИЙ ВОПРОС:')
  if (clarifyQ) {
    console.log(`  «${clarifyQ.question}»`)
    console.log(`  Опции: ${clarifyQ.options.map(o => o.label).join(' | ')}`)
  } else {
    console.log('  Система не предложила вопроса (gap уже большой ИЛИ все AXES покрыты ИЛИ вопрос не повлияет на top-1)')
  }

  // Carc position
  const carcPos = (verified ?? engineResults).findIndex(r => r.remedy.toLowerCase().startsWith('carc'))
  console.log(`\n### Carcinosinum: ${carcPos >= 0 ? 'позиция #' + (carcPos + 1) : 'НЕ в top-10'}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
