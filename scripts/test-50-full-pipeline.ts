/**
 * Тест 50 кейсов через полный pipeline: engine + verifier + confidence.
 *
 * Отличие от test-50-cases.ts: после engine прогоняем Sonnet verifier и
 * считаем confidence, чтобы изолировать вклад verifier (парсер не участвует —
 * симптомы уже структурированы, что убирает шум парсинга).
 *
 * Стоимость: 50 кейсов × ~$0.01 Sonnet = ~$0.50 за прогон.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIClinicalData, MDRIResult,
} from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import { computeConfidence } from '../src/lib/mdri/product-layer'
import { verifyTop5 } from '../src/lib/actions/ai-consultation'

function loadData(): MDRIData {
  const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
  const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
  const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
  const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
  const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

  const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({
    rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies,
  }))
  const constellations: Record<string, MDRIConstellationData> = {}
  for (const c of constellationsRaw) {
    constellations[c.remedy] = {
      name: c.name, clusters: c.clusters,
      sine_qua_non: c.sine_qua_non, excluders: c.excluders,
    }
  }
  const polarities: Record<string, MDRIPolarityData> = {}
  for (const p of polaritiesRaw) polarities[p.remedy] = p.polarities

  const clinicalData: MDRIClinicalData = { thermal_contradictions: {}, consistency_groups: [] }
  for (const cd of clinicalRaw) {
    if (cd.type === 'thermal_contradiction' && cd.data) {
      Object.assign(clinicalData.thermal_contradictions, cd.data)
    }
  }

  const indices = buildIndices(repertory, constellations)
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...indices }
}

// Импорт тестов из test-50-cases.ts — там CASES не экспортирован. Копируем inline.
// Вместо дубля 700 строк — читаем файл и извлекаем массив через eval. Хрупко, но короче.
// Альтернатива: переиспользовать через require и приватный re-export.
// Для простоты — прямой import будет работать, если экспортировать CASES из test-50-cases.ts.

import { CASES as TEST_CASES } from './test-50-cases'

// Синтетический текст из structured symptoms — для verifier (он ждёт originalText).
function buildSyntheticText(
  symptoms: MDRISymptom[],
  modalities: MDRIModality[],
): string {
  const parts: string[] = []
  const mentals = symptoms.filter(s => s.category === 'mental').map(s => s.rubric)
  const generals = symptoms.filter(s => s.category === 'general').map(s => s.rubric)
  const particulars = symptoms.filter(s => s.category === 'particular').map(s => s.rubric)

  if (mentals.length) parts.push(`Психика: ${mentals.join('; ')}.`)
  if (generals.length) parts.push(`Общее: ${generals.join('; ')}.`)
  if (particulars.length) parts.push(`Частные: ${particulars.join('; ')}.`)
  if (modalities.length) {
    const mods = modalities.map(m => `${m.pairId} ${m.value === 'agg' ? 'aggravation' : 'amelioration'}`)
    parts.push(`Модальности: ${mods.join('; ')}.`)
  }
  return parts.join(' ')
}

async function main() {
  console.log('Загрузка данных MDRI...')
  const data = loadData()
  console.log(`Загружено: ${data.repertory.length} рубрик, ${Object.keys(data.constellations).length} constellations`)
  console.log(`Кейсов: ${TEST_CASES.length}`)
  console.log('')

  console.log('=' .repeat(120))
  console.log('FULL PIPELINE: engine → verifier → confidence')
  console.log('=' .repeat(120))

  const norm = (s: string) => s.toLowerCase().replace(/\.$/, '').replace(/\s+/g, '-')

  let engineTop1 = 0, engineTop3 = 0, engineTop5 = 0
  let finalTop1 = 0, finalTop3 = 0, finalTop5 = 0
  let verifierCalled = 0, verifierReranked = 0, verifierFixedMiss = 0, verifierBrokeHit = 0
  const confByCorrect: Record<string, { correct: number; total: number }> = {
    high: { correct: 0, total: 0 },
    good: { correct: 0, total: 0 },
    clarify: { correct: 0, total: 0 },
    insufficient: { correct: 0, total: 0 },
  }
  const details: Array<{
    id: number; name: string; expected: string;
    engineTop1: string; finalTop1: string; confidence: string;
    engineCorrect: boolean; finalCorrect: boolean; reranked: boolean;
  }> = []

  for (const c of TEST_CASES) {
    const engineResults = analyzePipeline(data, c.symptoms, c.modalities, c.familyHistory, c.profile)
    const engineTop1Remedy = engineResults[0]?.remedy ?? '?'
    const engineCorrect = norm(engineTop1Remedy) === norm(c.expected)
    const engineInTop3 = engineResults.slice(0, 3).some(r => norm(r.remedy) === norm(c.expected))
    const engineInTop5 = engineResults.slice(0, 5).some(r => norm(r.remedy) === norm(c.expected))
    if (engineCorrect) engineTop1++
    if (engineInTop3) engineTop3++
    if (engineInTop5) engineTop5++

    // Verifier — нужен текст. Строим synthetic.
    const text = buildSyntheticText(c.symptoms, c.modalities)
    let finalResults = engineResults
    let reranked = false
    try {
      verifierCalled++
      const reorderedTop5 = await verifyTop5(text, engineResults.slice(0, 5))
      if (reorderedTop5) {
        const rest = engineResults.slice(5)
        finalResults = [...reorderedTop5, ...rest]
        reranked = norm(finalResults[0].remedy) !== norm(engineResults[0].remedy)
        if (reranked) verifierReranked++
      }
    } catch (e) {
      console.error(`  [VERIFIER FAILED #${c.id}] ${e instanceof Error ? e.message : 'unknown'}`)
    }

    const finalTop1Remedy = finalResults[0]?.remedy ?? '?'
    const finalCorrect = norm(finalTop1Remedy) === norm(c.expected)
    const finalInTop3 = finalResults.slice(0, 3).some(r => norm(r.remedy) === norm(c.expected))
    const finalInTop5 = finalResults.slice(0, 5).some(r => norm(r.remedy) === norm(c.expected))
    if (finalCorrect) finalTop1++
    if (finalInTop3) finalTop3++
    if (finalInTop5) finalTop5++

    if (!engineCorrect && finalCorrect) verifierFixedMiss++
    if (engineCorrect && !finalCorrect) verifierBrokeHit++

    // Confidence — на финальных результатах
    const conf = computeConfidence(c.symptoms, c.modalities, finalResults, [])
    const level = conf.level
    if (confByCorrect[level]) {
      confByCorrect[level].total++
      if (finalCorrect) confByCorrect[level].correct++
    }

    const verifierMark = reranked ? '🔄' : (engineCorrect !== finalCorrect ? '⚠' : '·')
    const engineMark = engineCorrect ? '✓' : '✗'
    const finalMark = finalCorrect ? '✓' : '✗'
    console.log(`  #${String(c.id).padStart(2)} ${c.name.padEnd(42)} | eng:${engineMark} ${norm(engineTop1Remedy).padEnd(8)} ${verifierMark} fin:${finalMark} ${norm(finalTop1Remedy).padEnd(8)} | conf:${level.padEnd(12)} exp:${c.expected}`)

    details.push({
      id: c.id, name: c.name, expected: c.expected,
      engineTop1: norm(engineTop1Remedy), finalTop1: norm(finalTop1Remedy),
      confidence: level, engineCorrect, finalCorrect, reranked,
    })
  }

  console.log('\n' + '=' .repeat(120))
  console.log('ИТОГО')
  console.log('=' .repeat(120))
  const pct = (n: number, d = 50) => `${n}/${d} = ${Math.round(n * 100 / d)}%`
  console.log(`  Engine Top-1 : ${pct(engineTop1)}`)
  console.log(`  Engine Top-3 : ${pct(engineTop3)}`)
  console.log(`  Engine Top-5 : ${pct(engineTop5)}`)
  console.log(`  Final  Top-1 : ${pct(finalTop1)}  (Δ ${finalTop1 - engineTop1 >= 0 ? '+' : ''}${finalTop1 - engineTop1})`)
  console.log(`  Final  Top-3 : ${pct(finalTop3)}  (Δ ${finalTop3 - engineTop3 >= 0 ? '+' : ''}${finalTop3 - engineTop3})`)
  console.log(`  Final  Top-5 : ${pct(finalTop5)}  (Δ ${finalTop5 - engineTop5 >= 0 ? '+' : ''}${finalTop5 - engineTop5})`)
  console.log('')
  console.log(`  Verifier called      : ${verifierCalled}`)
  console.log(`  Verifier reranked    : ${verifierReranked}`)
  console.log(`  Verifier fixed miss  : ${verifierFixedMiss}`)
  console.log(`  Verifier broke hit   : ${verifierBrokeHit}`)
  console.log('')
  console.log('  Confidence calibration (final):')
  for (const [level, stats] of Object.entries(confByCorrect)) {
    if (stats.total === 0) { console.log(`    ${level.padEnd(12)}: —`); continue }
    const acc = Math.round(stats.correct * 100 / stats.total)
    console.log(`    ${level.padEnd(12)}: ${stats.correct}/${stats.total} = ${acc}%`)
  }

  const rerankedCases = details.filter(d => d.reranked)
  if (rerankedCases.length > 0) {
    console.log('\n' + '=' .repeat(120))
    console.log(`VERIFIER ПЕРЕРАНЖИРОВАЛ TOP-1 (${rerankedCases.length}):`)
    for (const d of rerankedCases) {
      const effect = d.engineCorrect && !d.finalCorrect ? '❌ СЛОМАЛ'
                   : !d.engineCorrect && d.finalCorrect ? '✅ ПОЧИНИЛ'
                   : d.finalCorrect ? '✓ OK' : '≡ equivalent miss'
      console.log(`  #${d.id} ${d.name}: ${d.engineTop1} → ${d.finalTop1} (exp:${d.expected}) ${effect}`)
    }
  }

  const finalMisses = details.filter(d => !d.finalCorrect)
  if (finalMisses.length > 0) {
    console.log('\n' + '=' .repeat(120))
    console.log(`ФИНАЛЬНЫЕ ПРОМАХИ (${finalMisses.length}):`)
    for (const d of finalMisses) {
      console.log(`  #${d.id} ${d.name} | exp:${d.expected} got:${d.finalTop1} conf:${d.confidence}`)
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
