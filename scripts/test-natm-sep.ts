import { readFileSync } from 'fs'
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
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...buildIndices(repertory, constellations) }
}

async function parse(client: Anthropic, text: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, temperature: 0.2, system: PARSING_SYSTEM_PROMPT, messages: [{ role: 'user', content: text }] })
      const p = JSON.parse((r.content[0] as any).text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
      return {
        symptoms: (p.symptoms ?? []).map((s: any) => ({ rubric: String(s.rubric ?? ''), category: s.category ?? 'particular', present: true, weight: Math.min(3, Math.max(1, Number(s.weight) || 1)) })) as MDRISymptom[],
        modalities: (p.modalities ?? []).map((m: any) => ({ pairId: String(m.pairId ?? ''), value: m.value === 'amel' ? 'amel' as const : 'agg' as const })) as MDRIModality[],
      }
    } catch { await new Promise(r => setTimeout(r, 2000 * (i + 1))) }
  }
  return { symptoms: [] as MDRISymptom[], modalities: [] as MDRIModality[] }
}

const NATM_SYM: MDRISymptom[] = [{ rubric: 'consolation aggravates', category: 'mental', present: true, weight: 3 }]
const NATM_MOD: MDRIModality[] = [{ pairId: 'consolation', value: 'agg' }]
const SEP_SYM: MDRISymptom[] = [{ rubric: 'indifference family husband children', category: 'mental', present: true, weight: 3 }]

const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

type Case = { id: number; expected: string; text: string; answer: 'a' | 'b' }

const CASES: Case[] = [
  { id: 1, expected: 'nat-m', answer: 'a', text: 'Давнее горе после развода. Плачет только одна. Утешение раздражает. Любит солёное. Головная боль от солнца. Замкнутая.' },
  { id: 2, expected: 'nat-m', answer: 'a', text: 'Потеряла маму 5 лет назад. Носит в себе. Не показывает чувств. Герпес на губах. Хуже на солнце. Худеет.' },
  { id: 3, expected: 'nat-m', answer: 'a', text: 'Подросток. Обида на отца, молчит. Плачет в подушку. Не хочет чтобы жалели. Любит солёные чипсы. Головные боли.' },
  { id: 4, expected: 'nat-m', answer: 'a', text: 'Женщина после измены мужа. Замкнулась. Утешение ухудшает. Жажда. Солёное. Герпес при стрессе.' },
  { id: 5, expected: 'nat-m', answer: 'a', text: 'Давнее горе, не может простить. Держит всё внутри. Хуже от сочувствия. Тяга к солёному. Сухая кожа. Хуже утром.' },
  { id: 6, expected: 'sep', answer: 'b', text: 'Безразличие к мужу и детям. Не хочет видеть семью. Опущение матки. Жёлтые пятна на лице. Лучше от танцев. Любит кислое.' },
  { id: 7, expected: 'sep', answer: 'b', text: 'Мать двоих детей. Нет сил. Нет желания заниматься домом. Раздражают дети. Хуже утром. Лучше от бега.' },
  { id: 8, expected: 'sep', answer: 'b', text: 'Менопауза. Приливы. Безразличие ко всему. Не хочет секса. Опущение. Тёмные пятна на лице. Запоры.' },
  { id: 9, expected: 'sep', answer: 'b', text: 'Молодая мама, послеродовая. Нет привязанности к ребёнку. Раздражение на мужа. Хочет быть одна. Лучше от фитнеса.' },
  { id: 10, expected: 'sep', answer: 'b', text: 'Работает, устаёт. Дома — пустота. Нет эмоций к семье. Желтоватое лицо. Тянет на кислое. Лучше от активности.' },
]

async function main() {
  console.log('=== ТЕСТ DISCRIMINATOR: Nat-m vs Sep (10 кейсов) ===\n')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const data = loadData()

  let baseCorrect = 0, afterCorrect = 0, fixed = 0, broken = 0

  for (const c of CASES) {
    process.stdout.write(`#${c.id} (${c.expected})... `)
    const { symptoms: ss, modalities: sm } = await parse(client, c.text)
    const { symptoms, modalities } = mergeWithFallback(c.text, ss, sm)
    const profile = toEngineProfile(inferPatientProfile(c.text, symptoms))

    // Baseline
    const baseR = analyzePipeline(data, symptoms, modalities, [], profile)
    const baseTop1 = norm(baseR[0]?.remedy ?? '')
    const baseHit = baseTop1 === norm(c.expected)
    if (baseHit) baseCorrect++

    // With discriminator
    const addSym = c.answer === 'a' ? NATM_SYM : SEP_SYM
    const addMod = c.answer === 'a' ? NATM_MOD : []
    const allSym = [...symptoms, ...addSym]
    const allMod = [...modalities, ...addMod.filter(m => !modalities.some(x => x.pairId === m.pairId))]

    const afterR = analyzePipeline(data, allSym, allMod, [], profile)
    const afterTop1 = norm(afterR[0]?.remedy ?? '')
    const afterHit = afterTop1 === norm(c.expected)
    if (afterHit) afterCorrect++

    if (!baseHit && afterHit) fixed++
    if (baseHit && !afterHit) broken++

    const bm = baseHit ? '✓' : '✗'
    const am = afterHit ? '✓' : '✗'
    const ch = !baseHit && afterHit ? ' ← FIXED' : baseHit && !afterHit ? ' ← BROKEN' : ''
    const baseGap = (baseR[0]?.totalScore ?? 0) - (baseR[1]?.totalScore ?? 0)
    const afterGap = (afterR[0]?.totalScore ?? 0) - (afterR[1]?.totalScore ?? 0)
    console.log(`base=${bm} ${baseTop1}(gap=${baseGap}) → after=${am} ${afterTop1}(gap=${afterGap})${ch}`)

    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`Baseline accuracy:  ${baseCorrect}/10 (${baseCorrect * 10}%)`)
  console.log(`With discriminator: ${afterCorrect}/10 (${afterCorrect * 10}%)`)
  console.log(`Fixed: ${fixed} | Broken: ${broken}`)
  console.log('═══════════════════════════════════════')
}

main().catch(console.error)
