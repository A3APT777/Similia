/**
 * Тест СТАБИЛЬНОСТИ parsing: 20 кейсов × 3 прогона.
 * Каждый кейс прогоняется 3 раза через Sonnet → normalization → engine.
 * Сравниваем: симптомы, веса, top-1, top-3.
 *
 * Запуск: npx tsx scripts/test-stability.ts
 * Результат: scripts/stability-results.json
 */

import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
config({ path: join(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type { MDRISymptom, MDRIModality, MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import { PARSING_SYSTEM_PROMPT } from '../src/lib/mdri/parsing-prompt'
import { mergeWithFallback } from '../src/lib/mdri/product-layer'
import { inferPatientProfile, toEngineProfile } from '../src/lib/mdri/infer-profile'

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
  const indices = buildIndices(repertory, constellations)
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...indices }
}

// Sonnet parsing с retry
async function parseWithRetry(client: Anthropic, text: string, maxRetries = 3): Promise<{ symptoms: MDRISymptom[]; modalities: MDRIModality[]; familyHistory: string[] }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000, temperature: 0.2,
        system: PARSING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      })
      const t = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const j = t.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const p = JSON.parse(j)
      return {
        symptoms: (p.symptoms ?? []).map((s: any) => ({
          rubric: String(s.rubric ?? ''), category: s.category ?? 'particular',
          present: s.present !== false, weight: Math.min(3, Math.max(1, Number(s.weight) || 1)),
        })),
        modalities: (p.modalities ?? []).map((m: any) => ({
          pairId: String(m.pairId ?? ''), value: m.value === 'amel' ? 'amel' as const : 'agg' as const,
        })),
        familyHistory: p.familyHistory ?? [],
      }
    } catch (e) {
      if (attempt === maxRetries) throw e
      console.log(`  retry ${attempt}/${maxRetries}...`)
      await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }
  return { symptoms: [], modalities: [], familyHistory: [] }
}

// 20 кейсов (разнообразные)
const CASES = [
  { id: 1, name: 'Sulphur', expected: 'sulph', text: 'Зуд кожи, усиливается от тепла и мытья. Жжение стоп ночью — высовывает из-под одеяла. Голод в 11 утра. Не любит мыться. Философствует. Хуже стоя. Жаркий.' },
  { id: 2, name: 'Pulsatilla', expected: 'puls', text: 'Девочка, плаксивая. Хочет утешения. Нет жажды. Хуже в тёплой комнате, лучше на свежем воздухе. Выделения жёлто-зелёные мягкие.' },
  { id: 3, name: 'Arsenicum', expected: 'ars', text: 'Педантичный. Тревога о здоровье. Хуже после полуночи 1-2 часа. Жжение но лучше от тепла. Пьёт маленькими глотками. Зябкий. Беспокойный.' },
  { id: 4, name: 'Nat-m', expected: 'nat-m', text: 'Давнее горе, плачет только одна. Утешение хуже. Любит солёное. Головная боль от солнца. Герпес на губах. Замкнутая.' },
  { id: 5, name: 'Lachesis', expected: 'lach', text: 'Менопауза, приливы. Всё слева. Хуже после сна. Не переносит тесную одежду на шее. Ревнивая. Болтливая.' },
  { id: 6, name: 'Nux-v', expected: 'nux-v', text: 'Бизнесмен, много кофе. Раздражительный. Хуже утром. Запоры с безрезультатными позывами. Зябкий. Чувствителен к шуму.' },
  { id: 7, name: 'Rhus-t', expected: 'rhus-t', text: 'Скованность хуже утром и от покоя. Первое движение болезненно, потом расходится. Беспокойный. Хуже в сырую холодную погоду.' },
  { id: 8, name: 'Bryonia', expected: 'bry', text: 'Артрит, любое движение ухудшает. Лежит неподвижно. Сильная жажда холодной воды. Раздражительный, хочет чтобы оставили в покое. Сухость слизистых.' },
  { id: 9, name: 'Belladonna', expected: 'bell', text: 'Внезапная температура 40. Лицо красное горячее. Зрачки расширены. Пульсирующая головная боль хуже от света и шума. Бред.' },
  { id: 10, name: 'Chamomilla', expected: 'cham', text: 'Невыносимая боль при зубах. Одна щека красная, другая бледная. Не успокаивается, только на руках. Капризный. Зелёный стул.' },
  { id: 11, name: 'Sepia', expected: 'sep', text: 'Безразличие к семье. Ощущение опущения. Жёлтые пятна на лице. Лучше от энергичных упражнений. Любит кислое.' },
  { id: 12, name: 'Lycopodium', expected: 'lyc', text: 'Вздутие после нескольких глотков. Жалобы справа. Хуже с 16 до 20 часов. Тревога ожидания. Властный. Любит сладкое.' },
  { id: 13, name: 'Phosphorus', expected: 'phos', text: 'Кровотечения яркой кровью. Боится темноты, грозы, одиночества. Сочувственный. Жажда холодной воды. Жжение между лопатками.' },
  { id: 14, name: 'Aurum', expected: 'aur', text: 'Глубокая депрессия с чувством вины. Суицидальные мысли. Хуже ночью. Боль в костях. Гипертония. Требовательный к себе.' },
  { id: 15, name: 'Kali-c', expected: 'kali-c', text: 'Просыпается в 2-4 часа ночи с тревогой. Колющие боли. Отёки верхних век. Зябкий. Боль в пояснице. Астма ночью.' },
  { id: 16, name: 'Colocynthis', expected: 'coloc', text: 'Жестокие колики, сгибается пополам. Боль после гнева. Лучше от давления и тепла. Понос от боли.' },
  { id: 17, name: 'Arnica', expected: 'arn', text: 'После травмы, говорит я в порядке. Ушибы, синяки. Кровать кажется жёсткой. Страх прикосновения.' },
  { id: 18, name: 'Silicea', expected: 'sil', text: 'Тонкий, хрупкий, но упрямый. Очень зябкий. Потеют стопы с запахом. Нагноения. Головная боль от затылка.' },
  { id: 19, name: 'Stramonium', expected: 'stram', text: 'Ужас темноты. Агрессивное поведение. Галлюцинации. Расширенные зрачки. Судороги от испуга. Боится воды.' },
  { id: 20, name: 'Veratrum', expected: 'verat', text: 'Рвота и понос одновременно с холодным потом. Коллапс. Ледяной холод тела. Жажда ледяной воды. Бледность.' },
]

const RUNS = 3
const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

async function main() {
  console.log(`=== ТЕСТ СТАБИЛЬНОСТИ: ${CASES.length} кейсов × ${RUNS} прогонов ===\n`)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const data = loadData()
  console.log(`Данные загружены: ${data.repertory.length} рубрик\n`)

  type RunResult = {
    symptoms: string[]  // sorted canonical rubrics
    weights: number[]   // weights aligned with symptoms
    modalities: string[]
    top1: string; top2: string; top3: string
    top1Score: number
    gap: number
  }

  type CaseStability = {
    id: number; name: string; expected: string
    runs: RunResult[]
    stable: boolean
    differences: string[]
    top1Consistent: boolean
    top3Consistent: boolean
    symptomVariance: number // 0 = identical, 1 = completely different
  }

  const results: CaseStability[] = []
  let stableCount = 0, unstableCount = 0

  for (const c of CASES) {
    console.log(`#${c.id} ${c.name}:`)
    const runs: RunResult[] = []

    for (let run = 0; run < RUNS; run++) {
      process.stdout.write(`  run ${run + 1}/${RUNS}... `)

      // Parse
      const parseResult = await parseWithRetry(client, c.text)

      // Merge + normalize
      const { symptoms, modalities } = mergeWithFallback(c.text, parseResult.symptoms, parseResult.modalities)

      // Profile
      const profile = toEngineProfile(inferPatientProfile(c.text, symptoms))

      // Engine
      const mdriResults = analyzePipeline(data, symptoms, modalities, parseResult.familyHistory, profile)

      const sortedSymptoms = symptoms.map(s => s.rubric).sort()
      const sortedWeights = symptoms.sort((a, b) => a.rubric.localeCompare(b.rubric)).map(s => s.weight)
      const sortedMods = modalities.map(m => `${m.pairId}:${m.value}`).sort()

      const r: RunResult = {
        symptoms: sortedSymptoms,
        weights: sortedWeights,
        modalities: sortedMods,
        top1: norm(mdriResults[0]?.remedy ?? ''),
        top2: norm(mdriResults[1]?.remedy ?? ''),
        top3: norm(mdriResults[2]?.remedy ?? ''),
        top1Score: mdriResults[0]?.totalScore ?? 0,
        gap: (mdriResults[0]?.totalScore ?? 0) - (mdriResults[1]?.totalScore ?? 0),
      }
      runs.push(r)
      console.log(`${r.top1.toUpperCase()} (${r.top1Score}%) syms=${r.symptoms.length} mods=${r.modalities.length}`)

      // Пауза между запросами
      await new Promise(r => setTimeout(r, 500))
    }

    // Сравнение прогонов
    const differences: string[] = []

    // Top-1 consistency
    const top1s = runs.map(r => r.top1)
    const top1Consistent = new Set(top1s).size === 1

    // Top-3 consistency
    const top3Sets = runs.map(r => [r.top1, r.top2, r.top3].sort().join(','))
    const top3Consistent = new Set(top3Sets).size === 1

    if (!top1Consistent) differences.push(`top-1 варьируется: ${top1s.join(' / ')}`)
    if (!top3Consistent) differences.push(`top-3 варьируется: ${top3Sets.join(' | ')}`)

    // Symptom consistency
    const symSets = runs.map(r => r.symptoms.join('|'))
    const symConsistent = new Set(symSets).size === 1
    if (!symConsistent) {
      // Найти различия
      const allSyms = new Set(runs.flatMap(r => r.symptoms))
      for (const sym of allSyms) {
        const present = runs.map(r => r.symptoms.includes(sym))
        if (new Set(present.map(String)).size > 1) {
          differences.push(`симптом "${sym}" присутствует в ${present.filter(Boolean).length}/${RUNS} прогонах`)
        }
      }
    }

    // Weight consistency
    if (symConsistent) {
      for (let i = 0; i < runs[0].symptoms.length; i++) {
        const weights = runs.map(r => r.weights[i])
        if (new Set(weights).size > 1) {
          differences.push(`вес "${runs[0].symptoms[i]}": ${weights.join(' / ')}`)
        }
      }
    }

    // Modality consistency
    const modSets = runs.map(r => r.modalities.join('|'))
    if (new Set(modSets).size > 1) {
      differences.push(`модальности варьируются: ${modSets.join(' | ')}`)
    }

    // Symptom variance: Jaccard distance
    const allSyms = new Set(runs.flatMap(r => r.symptoms))
    const intersection = [...allSyms].filter(s => runs.every(r => r.symptoms.includes(s)))
    const symptomVariance = allSyms.size > 0 ? 1 - intersection.length / allSyms.size : 0

    const stable = top1Consistent && symptomVariance < 0.2
    if (stable) stableCount++
    else unstableCount++

    const mark = stable ? '✓ STABLE' : '✗ UNSTABLE'
    console.log(`  ${mark}${differences.length > 0 ? ': ' + differences[0] : ''}\n`)

    results.push({
      id: c.id, name: c.name, expected: c.expected,
      runs, stable, differences,
      top1Consistent, top3Consistent,
      symptomVariance: Math.round(symptomVariance * 100) / 100,
    })
  }

  // Сводка
  console.log('═══════════════════════════════════════════')
  console.log('СВОДКА СТАБИЛЬНОСТИ')
  console.log('═══════════════════════════════════════════')
  console.log(`Stable:   ${stableCount}/${CASES.length} (${Math.round(stableCount / CASES.length * 100)}%)`)
  console.log(`Unstable: ${unstableCount}/${CASES.length}`)
  console.log()

  const unstable = results.filter(r => !r.stable)
  if (unstable.length > 0) {
    console.log('НЕСТАБИЛЬНЫЕ КЕЙСЫ:')
    for (const u of unstable) {
      console.log(`  #${u.id} ${u.name} (variance=${u.symptomVariance}):`)
      for (const d of u.differences) console.log(`    - ${d}`)
    }
  }

  // Top-1 accuracy per run
  console.log()
  for (let run = 0; run < RUNS; run++) {
    const hits = results.filter(r => norm(r.runs[run].top1) === norm(r.expected)).length
    console.log(`Run ${run + 1}: top-1 = ${hits}/${CASES.length} (${Math.round(hits / CASES.length * 100)}%)`)
  }

  // Сохранить
  writeFileSync(join(process.cwd(), 'scripts', 'stability-results.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    casesCount: CASES.length, runsPerCase: RUNS,
    stableCount, unstableCount,
    stableRate: Math.round(stableCount / CASES.length * 100),
    results,
  }, null, 2))
  console.log('\nРезультаты: scripts/stability-results.json')
}

main().catch(console.error)
