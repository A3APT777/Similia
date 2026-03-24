/**
 * Тест Clarify Engine: 20 кейсов где правильный в top-3 но не top-1.
 * Для каждого: baseline → clarify questions → simulate answer → rerun → compare.
 *
 * Симуляция ответа: выбираем option который supports правильный препарат.
 * Это best-case: "если врач ответит правильно, поможет ли clarify?"
 *
 * Запуск: npx tsx scripts/test-clarify-engine.ts
 */

import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
config({ path: join(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type { MDRISymptom, MDRIModality, MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData, MDRIResult } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import { PARSING_SYSTEM_PROMPT } from '../src/lib/mdri/parsing-prompt'
import { mergeWithFallback, checkHypothesisConflict, computeConfidence, validateInput } from '../src/lib/mdri/product-layer'
import { inferPatientProfile, toEngineProfile } from '../src/lib/mdri/infer-profile'
import { parseDifferentialResponse, validateQuestions, buildDifferentialContext, convertAnswersToSymptoms } from '../src/lib/mdri/differential'
import type { DifferentialQuestion } from '../src/lib/mdri/differential'
import { selectDifferentialPair, buildDifferentialMatrix, buildClarifyPrompt, rankClarifyQuestions, selectBestQuestions } from '../src/lib/mdri/clarify-engine'

function loadData(): MDRIData {
  const d = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
  const rep = JSON.parse(readFileSync(join(d, 'repertory.json'), 'utf-8'))
  const con = JSON.parse(readFileSync(join(d, 'constellations.json'), 'utf-8'))
  const pol = JSON.parse(readFileSync(join(d, 'polarities.json'), 'utf-8'))
  const cli = JSON.parse(readFileSync(join(d, 'clinical.json'), 'utf-8'))
  const repertory: MDRIRepertoryRubric[] = rep.map((r: any) => ({ rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies }))
  const constellations: Record<string, MDRIConstellationData> = {}
  for (const c of con) constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
  const polarities: Record<string, MDRIPolarityData> = {}
  for (const p of pol) polarities[p.remedy] = p.polarities
  const clinicalData: MDRIClinicalData = { thermal_contradictions: {}, consistency_groups: [] }
  for (const cd of cli) { if (cd.type === 'thermal_contradiction' && cd.data) Object.assign(clinicalData.thermal_contradictions, cd.data) }
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...buildIndices(repertory, constellations) }
}

async function parseWithRetry(client: Anthropic, text: string): Promise<{ symptoms: MDRISymptom[]; modalities: MDRIModality[]; familyHistory: string[] }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000, temperature: 0.2,
        system: PARSING_SYSTEM_PROMPT, messages: [{ role: 'user', content: text }],
      })
      const t = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const p = JSON.parse(t.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
      return {
        symptoms: (p.symptoms ?? []).map((s: any) => ({ rubric: String(s.rubric ?? ''), category: s.category ?? 'particular', present: s.present !== false, weight: Math.min(3, Math.max(1, Number(s.weight) || 1)) })),
        modalities: (p.modalities ?? []).map((m: any) => ({ pairId: String(m.pairId ?? ''), value: m.value === 'amel' ? 'amel' as const : 'agg' as const })),
        familyHistory: p.familyHistory ?? [],
      }
    } catch { if (attempt === 3) throw new Error('API failed'); await new Promise(r => setTimeout(r, 2000 * attempt)) }
  }
  return { symptoms: [], modalities: [], familyHistory: [] }
}

const CASES = [
  { id: 2, name: 'Calc-carb', expected: 'calc', text: 'Ребёнок 3 года. Потеет голова ночью. Стопы холодные и влажные. Поздно пошёл, поздно зубы. Любит яйца. Боится собак. Упрямый. Очень зябкий. Кислый запах от тела.' },
  { id: 4, name: 'Phosphorus', expected: 'phos', text: 'Носовые кровотечения яркой красной кровью. Боится темноты, грозы и одиночества. Очень сочувственный и чуткий. Жажда холодной воды большими глотками. Хуже в сумерках. Жжение между лопатками. Любит мороженое.' },
  { id: 12, name: 'Aurum', expected: 'aur', text: 'Глубокая депрессия с чувством вины. Думает о самоубийстве. Ощущение что провалил жизнь. Хуже ночью. Боль в костях. Гипертония. Ответственный, требовательный к себе.' },
  { id: 14, name: 'Apis', expected: 'apis', text: 'Отёк, жалящие боли. Нет жажды. Хуже от тепла. Лучше от холодных компрессов. Кожа розовая, восковидная. Ревность. Суетливость. Правосторонний отит.' },
  { id: 15, name: 'Gelsemium', expected: 'gels', text: 'Дрожь, слабость, тяжесть. Тяжёлые веки, не может открыть глаза. Тупость, заторможенность. Понос от страха перед экзаменом. Нет жажды при лихорадке. Головная боль от затылка.' },
  { id: 18, name: 'Kali-carb', expected: 'kali-c', text: 'Просыпается в 2-4 часа ночи с тревогой. Колющие боли. Отёки верхних век. Зябкий. Боль в пояснице, хуже в покое. Чувство долга, правила. Слабость. Астма ночью.' },
  { id: 19, name: 'Arg-n', expected: 'arg-n', text: 'Тревога ожидания: перед экзаменом, собеседованием — понос. Торопливость. Страх высоты, открытых пространств. Любит сладкое, но от него хуже. Вздутие с громкой отрыжкой. Жарко.' },
  { id: 20, name: 'Petroleum', expected: 'petr', text: 'Экзема с глубокими трещинами, хуже зимой. Кожа грубая, шершавая. Укачивает в транспорте. Тошнота от запаха бензина. Потрескавшиеся кончики пальцев. Хуже от холода.' },
  { id: 24, name: 'Spongia', expected: 'spong', text: 'Лающий сухой кашель, как пила по дереву. Круп. Хуже до полуночи. Удушье во сне. Ощущение пробки в гортани. Тревога с удушьем. Щитовидная железа увеличена.' },
  { id: 26, name: 'Drosera', expected: 'dros', text: 'Приступообразный кашель, как коклюш. Кашель следует друг за другом без перерыва. Хуже после полуночи, лёжа. Рвота от кашля. Носовое кровотечение при кашле. Першение в гортани.' },
  { id: 34, name: 'Carcinosinum', expected: 'carc', text: 'Перфекционист, угождает другим в ущерб себе. Подавление эмоций с детства. Любит танцевать, шоколад, путешествия. Множественные родинки. Сильное сочувствие. Бессонница от тревоги. Семейная онкология.' },
  { id: 36, name: 'Graphites', expected: 'graph', text: 'Полный, зябкий. Мокнущая экзема за ушами и в складках — выделения как мёд. Запоры: стул крупный, в комках, со слизью. Толстые ногти. Нерешительный.' },
  { id: 37, name: 'Hepar', expected: 'hep', text: 'Крайне чувствителен к холоду и прикосновению. Нагноения с неприятным запахом. Раздражительный, вспыльчивый. Занозистые боли. Хуже от малейшего сквозняка. Потеет при малейшем усилии.' },
  { id: 42, name: 'Nat-m', expected: 'nat-m', text: 'Давнее горе, которое носит в себе. Плачет только одна, утешение ухудшает. Любит солёное. Головная боль от солнца. Герпес на губах. Хуже на солнце. Замкнутая, не показывает чувств.' },
  { id: 45, name: 'Mag-p', expected: 'mag-p', text: 'Спазматические судорожные боли. Лучше от тепла и давления. Лучше сгибаясь пополам. Колики у младенцев. Менструальные спазмы лучше от грелки. Невралгия лица справа.' },
  { id: 48, name: 'Nat-s', expected: 'nat-s', text: 'Головная боль и астма хуже в сырую погоду. Понос утром. Депрессия хуже утром. Последствия травмы головы. Бородавки. Хуже на морском побережье. Желчные приступы.' },
]

const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

async function main() {
  console.log(`=== ТЕСТ CLARIFY ENGINE: ${CASES.length} кейсов ===\n`)
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const data = loadData()

  type CaseResult = {
    id: number; name: string; expected: string
    // Baseline
    baseTop1: string; baseTop2: string; baseTop3: string
    baseGap: number; basePos: number
    // Clarify
    pairChosen: string; matrixDiscriminators: string[]
    questionsGenerated: number; questionsSelected: number
    selectedQuestion: string; selectedOptions: string[]
    simulatedAnswer: string; answerReason: string
    infoGain: number; rankReason: string
    // After rerun
    afterTop1: string; afterTop2: string; afterTop3: string
    afterGap: number; afterPos: number
    // Verdict
    improved: boolean; unchanged: boolean; worsened: boolean
    verdict: string
  }

  const results: CaseResult[] = []
  let improved = 0, unchanged = 0, worsened = 0, skipped = 0

  for (const c of CASES) {
    process.stdout.write(`#${c.id} ${c.name}... `)

    // 1. Parse + engine (baseline)
    const parseResult = await parseWithRetry(client, c.text)
    const { symptoms, modalities } = mergeWithFallback(c.text, parseResult.symptoms, parseResult.modalities)
    const profile = toEngineProfile(inferPatientProfile(c.text, symptoms))
    const baseResults = analyzePipeline(data, symptoms, modalities, parseResult.familyHistory, profile)

    const baseTop1 = norm(baseResults[0]?.remedy ?? '')
    const basePos = baseResults.findIndex(r => norm(r.remedy) === norm(c.expected))
    const baseGap = (baseResults[0]?.totalScore ?? 0) - (baseResults[1]?.totalScore ?? 0)

    // Пропускаем если уже top-1 или не в top-10
    if (baseTop1 === norm(c.expected)) {
      console.log(`уже top-1, пропускаем`)
      skipped++
      continue
    }
    if (basePos < 0) {
      console.log(`NOT FOUND, пропускаем`)
      skipped++
      continue
    }

    console.log(`baseline: ${baseTop1} (exp: ${c.expected}, pos=${basePos + 1}) `)

    // 2. Clarify engine
    const conflict = checkHypothesisConflict(baseResults)
    const pair = selectDifferentialPair(baseResults, conflict)

    if (!pair) {
      console.log('no pair → skip')
      skipped++
      continue
    }

    const matrix = buildDifferentialMatrix(baseResults, pair)

    // 3. AI generates candidates
    let aiCandidates: DifferentialQuestion[] = []
    try {
      const prompt = buildClarifyPrompt(matrix, symptoms, modalities)
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 1500, temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
      const ctx = buildDifferentialContext(baseResults, symptoms, modalities, conflict)
      aiCandidates = validateQuestions(parseDifferentialResponse(text), ctx)
    } catch (e) {
      console.log('AI error → skip')
      skipped++
      continue
    }

    // 4. Rank + select
    const ranked = rankClarifyQuestions(matrix, aiCandidates)
    const selected = selectBestQuestions(ranked)

    if (selected.length === 0) {
      console.log(`no good questions (${aiCandidates.length} candidates, all filtered)`)
      skipped++
      continue
    }

    const bestQ = selected[0]

    // 5. Simulate answer: выбираем option который supports правильный препарат
    let simulatedAnswer = ''
    let answerReason = ''

    // Ищем option который supports expected
    const supportsExpected = bestQ.options.find(o => {
      // Проверяем: rubric этого option поможет expected?
      // Simple: выбираем первый option если нет лучшего
      return true // default: первый option
    })

    // Более умная симуляция: ищем option чей supports содержит expected
    const expectedNorm = norm(c.expected)
    if (bestQ.supports.some(s => norm(s) === expectedNorm)) {
      // Вопрос supports expected → выбираем первый option (он обычно supports)
      simulatedAnswer = bestQ.options[0].label
      answerReason = 'first option (question supports expected)'
    } else if (bestQ.weakens.some(s => norm(s) === expectedNorm)) {
      // Вопрос weakens expected → выбираем последний option
      simulatedAnswer = bestQ.options[bestQ.options.length - 1].label
      answerReason = 'last option (question weakens expected, avoid)'
    } else {
      // Нейтральный → первый
      simulatedAnswer = bestQ.options[0].label
      answerReason = 'first option (neutral question)'
    }

    // 6. Convert answer → symptoms + rerun
    const answers: Record<string, string> = { [bestQ.key]: simulatedAnswer }
    const { symptoms: clarifySym, modalities: clarifyMod } = convertAnswersToSymptoms([bestQ], answers)
    const allSymptoms = [...symptoms, ...clarifySym]
    const allModalities = [...modalities]
    for (const cm of clarifyMod) {
      if (!allModalities.some(m => m.pairId === cm.pairId)) allModalities.push(cm)
    }

    const afterResults = analyzePipeline(data, allSymptoms, allModalities, parseResult.familyHistory, profile)
    const afterTop1 = norm(afterResults[0]?.remedy ?? '')
    const afterPos = afterResults.findIndex(r => norm(r.remedy) === norm(c.expected))
    const afterGap = (afterResults[0]?.totalScore ?? 0) - (afterResults[1]?.totalScore ?? 0)

    // 7. Verdict
    const posImproved = afterPos >= 0 && (basePos < 0 || afterPos < basePos)
    const posWorsened = afterPos < 0 || (basePos >= 0 && afterPos > basePos)
    const becameTop1 = afterTop1 === norm(c.expected)

    let verdict = ''
    if (becameTop1) {
      verdict = 'IMPROVED → top-1'
      improved++
    } else if (posImproved) {
      verdict = `IMPROVED: pos ${basePos + 1} → ${afterPos + 1}`
      improved++
    } else if (posWorsened) {
      verdict = `WORSENED: pos ${basePos + 1} → ${afterPos >= 0 ? afterPos + 1 : 'LOST'}`
      worsened++
    } else {
      verdict = `UNCHANGED: pos ${basePos + 1}`
      unchanged++
    }

    const mark = becameTop1 ? '✓' : posImproved ? '↑' : posWorsened ? '↓' : '='
    console.log(`${mark} ${verdict} | Q: "${bestQ.question.slice(0, 50)}..." → "${simulatedAnswer}" | gain=${bestQ.informationGain.toFixed(2)}`)

    results.push({
      id: c.id, name: c.name, expected: c.expected,
      baseTop1, baseTop2: norm(baseResults[1]?.remedy ?? ''), baseTop3: norm(baseResults[2]?.remedy ?? ''),
      baseGap, basePos: basePos + 1,
      pairChosen: `${pair.top1.remedy} vs ${pair.alt.remedy}`,
      matrixDiscriminators: matrix.discriminators,
      questionsGenerated: aiCandidates.length, questionsSelected: selected.length,
      selectedQuestion: bestQ.question, selectedOptions: bestQ.options.map(o => o.label),
      simulatedAnswer, answerReason,
      infoGain: bestQ.informationGain, rankReason: (bestQ as any).rankReason ?? '',
      afterTop1, afterTop2: norm(afterResults[1]?.remedy ?? ''), afterTop3: norm(afterResults[2]?.remedy ?? ''),
      afterGap, afterPos: afterPos >= 0 ? afterPos + 1 : -1,
      improved: posImproved || becameTop1, unchanged: !posImproved && !posWorsened && !becameTop1, worsened: posWorsened,
      verdict,
    })

    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n═══════════════════════════════════════')
  console.log('РЕЗУЛЬТАТЫ CLARIFY ENGINE')
  console.log('═══════════════════════════════════════')
  console.log(`Всего кейсов: ${CASES.length}`)
  console.log(`Протестировано: ${results.length} (пропущено: ${skipped})`)
  console.log(`Улучшилось:    ${improved} (${results.length > 0 ? Math.round(improved / results.length * 100) : 0}%)`)
  console.log(`  → стало top-1: ${results.filter(r => r.afterPos === 1).length}`)
  console.log(`Без изменений: ${unchanged}`)
  console.log(`Ухудшилось:    ${worsened}`)

  if (worsened > 0) {
    console.log('\nУХУДШЕНИЯ:')
    for (const r of results.filter(r => r.worsened)) {
      console.log(`  #${r.id} ${r.name}: pos ${r.basePos} → ${r.afterPos === -1 ? 'LOST' : r.afterPos}`)
      console.log(`    Q: ${r.selectedQuestion}`)
      console.log(`    A: ${r.simulatedAnswer} (${r.answerReason})`)
      console.log(`    gain: ${r.infoGain.toFixed(2)}, rank: ${r.rankReason}`)
    }
  }

  writeFileSync(join(process.cwd(), 'scripts', 'clarify-engine-results.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    total: CASES.length, tested: results.length, skipped,
    improved, unchanged, worsened,
    results,
  }, null, 2))
  console.log('\nРезультаты: scripts/clarify-engine-results.json')
}

main().catch(console.error)
