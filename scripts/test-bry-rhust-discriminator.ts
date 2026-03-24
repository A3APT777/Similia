/**
 * Честный тест: discriminator Bry vs Rhus-t меняет ли результат?
 * 10 кейсов Bryonia + 10 кейсов Rhus-t
 * Каждый: baseline (без) → с discriminator → сравнение
 *
 * Запуск: npx tsx scripts/test-bry-rhust-discriminator.ts
 */

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

// Discriminator mapped symptoms
const BRY_SYMPTOMS: MDRISymptom[] = [
  { rubric: 'worse motion any lies still', category: 'general', present: true, weight: 3 },
  { rubric: 'better rest lying perfectly still', category: 'general', present: true, weight: 2 },
]
const BRY_MODALITIES: MDRIModality[] = [{ pairId: 'motion_rest', value: 'agg' }]

const RHUST_SYMPTOMS: MDRISymptom[] = [
  { rubric: 'stiffness joints worse first motion better continued', category: 'general', present: true, weight: 3 },
  { rubric: 'restlessness cannot lie still must move', category: 'mental', present: true, weight: 2 },
]
const RHUST_MODALITIES: MDRIModality[] = [{ pairId: 'motion_rest', value: 'amel' }]

type Case = { id: number; expected: string; text: string; answer: 'a' | 'b' }

const CASES: Case[] = [
  // 10 Bryonia (ответ = A)
  { id: 1, expected: 'bry', answer: 'a', text: 'Боль в суставах. Любое движение ухудшает. Лежит неподвижно. Сильная жажда. Раздражительный, хочет покоя.' },
  { id: 2, expected: 'bry', answer: 'a', text: 'Кашель сухой, хуже от движения. Держится за грудь при кашле. Хуже от тепла. Колющие боли. Жажда.' },
  { id: 3, expected: 'bry', answer: 'a', text: 'Головная боль, хуже от любого движения глаз. Сухость во рту. Запоры. Хуже утром при вставании.' },
  { id: 4, expected: 'bry', answer: 'a', text: 'Артрит колена. Сустав горячий, красный. Малейшее движение — острая боль. Лучше в полном покое. Пьёт много.' },
  { id: 5, expected: 'bry', answer: 'a', text: 'Пневмония. Дышит поверхностно, боится глубокого вдоха. Лежит на больной стороне. Жажда холодной воды.' },
  { id: 6, expected: 'bry', answer: 'a', text: 'Боль в спине после переохлаждения. Не может повернуться. Хуже от кашля. Раздражителен, хочет быть один.' },
  { id: 7, expected: 'bry', answer: 'a', text: 'Живот болезненный при пальпации. Хуже от движения и сотрясений. Колющие боли. Запор, стул сухой.' },
  { id: 8, expected: 'bry', answer: 'a', text: 'Плеврит. Колющая боль в груди. Хуже от дыхания и движения. Лежит на больном боку чтобы ограничить движение.' },
  { id: 9, expected: 'bry', answer: 'a', text: 'Люмбаго после подъёма тяжести. Не может встать с кровати. Любой поворот — острая боль. Жажда. Запор.' },
  { id: 10, expected: 'bry', answer: 'a', text: 'Мастит. Грудь твёрдая, горячая. Хуже от прикосновения и движения руки. Раздражительная.' },

  // 10 Rhus-tox (ответ = B)
  { id: 11, expected: 'rhus-t', answer: 'b', text: 'Скованность суставов утром. Первые движения мучительны, потом расходится. Беспокойный ночью. Хуже от сырости.' },
  { id: 12, expected: 'rhus-t', answer: 'b', text: 'Боль в пояснице после промокания. Утром еле встаёт, через 10 минут ходьбы значительно лучше. Хуже от покоя.' },
  { id: 13, expected: 'rhus-t', answer: 'b', text: 'Артрит. Не может долго сидеть — нужно двигаться. Горячая ванна значительно улучшает. Хуже в сырую погоду.' },
  { id: 14, expected: 'rhus-t', answer: 'b', text: 'Растяжение связок. Первые движения болезненны, но потом разрабатывается. Лучше от тепла. Беспокойный.' },
  { id: 15, expected: 'rhus-t', answer: 'b', text: 'Крапивница после промокания. Зуд хуже от покоя. Не может лежать спокойно — ворочается. Лучше от горячего душа.' },
  { id: 16, expected: 'rhus-t', answer: 'b', text: 'Шея скована утром. Не может повернуть голову. Расхаживается через полчаса. Хуже в холодную сырую погоду.' },
  { id: 17, expected: 'rhus-t', answer: 'b', text: 'Герпес на губах после простуды. Суставы ломит. Не находит места ночью. Лучше от постоянного движения.' },
  { id: 18, expected: 'rhus-t', answer: 'b', text: 'Тендинит. Первые шаги утром — хромает. Через 5 минут ходьбы — почти нормально. Хуже в покое и сырости.' },
  { id: 19, expected: 'rhus-t', answer: 'b', text: 'Ишиас хуже ночью. Ворочается в постели — не находит удобного положения. Расхаживается. Хуже от холода.' },
  { id: 20, expected: 'rhus-t', answer: 'b', text: 'Спина болит после работы в саду в сырую погоду. Утром еле разогнулся. Через 15 минут движения — терпимо.' },
]

const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

async function main() {
  console.log('=== ТЕСТ DISCRIMINATOR: Bry vs Rhus-t (20 кейсов) ===\n')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const data = loadData()

  let improved = 0, unchanged = 0, worsened = 0

  for (const c of CASES) {
    process.stdout.write(`#${c.id} (exp: ${c.expected})... `)

    // 1. Parse
    const { symptoms: sonnetSym, modalities: sonnetMod } = await parse(client, c.text)
    const { symptoms, modalities } = mergeWithFallback(c.text, sonnetSym, sonnetMod)
    const profile = toEngineProfile(inferPatientProfile(c.text, symptoms))

    // 2. Baseline (без discriminator)
    const baseResults = analyzePipeline(data, symptoms, modalities, [], profile)
    const baseTop1 = norm(baseResults[0]?.remedy ?? '')
    const baseHit = baseTop1 === norm(c.expected)
    const basePos = baseResults.findIndex(r => norm(r.remedy) === norm(c.expected))
    const baseGap = (baseResults[0]?.totalScore ?? 0) - (baseResults[1]?.totalScore ?? 0)

    // 3. С discriminator (добавляем mapped symptoms)
    const addSym = c.answer === 'a' ? BRY_SYMPTOMS : RHUST_SYMPTOMS
    const addMod = c.answer === 'a' ? BRY_MODALITIES : RHUST_MODALITIES
    const allSym = [...symptoms, ...addSym]
    const allMod = [...modalities]
    for (const m of addMod) { if (!allMod.some(x => x.pairId === m.pairId)) allMod.push(m) }

    const afterResults = analyzePipeline(data, allSym, allMod, [], profile)
    const afterTop1 = norm(afterResults[0]?.remedy ?? '')
    const afterHit = afterTop1 === norm(c.expected)
    const afterPos = afterResults.findIndex(r => norm(r.remedy) === norm(c.expected))
    const afterGap = (afterResults[0]?.totalScore ?? 0) - (afterResults[1]?.totalScore ?? 0)

    // 4. Verdict
    let verdict = ''
    if (!baseHit && afterHit) { verdict = '✓ IMPROVED → top-1'; improved++ }
    else if (baseHit && afterHit) { verdict = `= UNCHANGED (was top-1, still top-1, gap ${baseGap}→${afterGap})`; unchanged++ }
    else if (baseHit && !afterHit) { verdict = `↓ WORSENED: lost top-1!`; worsened++ }
    else if (!baseHit && !afterHit) {
      if (afterPos >= 0 && (basePos < 0 || afterPos < basePos)) { verdict = `↑ pos ${basePos+1}→${afterPos+1}`; improved++ }
      else if (afterPos >= 0 && basePos >= 0 && afterPos > basePos) { verdict = `↓ pos ${basePos+1}→${afterPos+1}`; worsened++ }
      else { verdict = `= pos ${basePos >= 0 ? basePos+1 : 'NF'}`; unchanged++ }
    }

    console.log(`base: ${baseTop1}(gap=${baseGap}) → after: ${afterTop1}(gap=${afterGap}) | ${verdict}`)
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n═══════════════════════════════════════')
  console.log('РЕЗУЛЬТАТЫ')
  console.log('═══════════════════════════════════════')
  console.log(`Всего: ${CASES.length}`)
  console.log(`Улучшилось:    ${improved} (${Math.round(improved/CASES.length*100)}%)`)
  console.log(`Без изменений: ${unchanged} (${Math.round(unchanged/CASES.length*100)}%)`)
  console.log(`Ухудшилось:    ${worsened} (${Math.round(worsened/CASES.length*100)}%)`)
}

main().catch(console.error)
