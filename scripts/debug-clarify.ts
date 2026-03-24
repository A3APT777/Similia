import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData, MDRIClinicalData } from '../src/lib/mdri/types'
import { PARSING_SYSTEM_PROMPT } from '../src/lib/mdri/parsing-prompt'
import { mergeWithFallback, checkHypothesisConflict } from '../src/lib/mdri/product-layer'
import { inferPatientProfile, toEngineProfile } from '../src/lib/mdri/infer-profile'
import { selectDifferentialPair, buildDifferentialMatrix, buildClarifyPrompt, rankClarifyQuestions, selectBestQuestions } from '../src/lib/mdri/clarify-engine'
import { parseDifferentialResponse, validateQuestions, buildDifferentialContext } from '../src/lib/mdri/differential'

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
const data = { repertory, constellations, polarities, relationships: {}, clinicalData, ...buildIndices(repertory, constellations) }

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const text = 'Давнее горе, которое носит в себе. Плачет только одна, утешение ухудшает. Любит солёное. Головная боль от солнца. Герпес на губах. Замкнутая.'

  // Parse
  const resp = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, temperature: 0.2, system: PARSING_SYSTEM_PROMPT, messages: [{ role: 'user', content: text }] })
  const j = JSON.parse((resp.content[0] as any).text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
  const symptoms = j.symptoms.map((s: any) => ({ rubric: s.rubric, category: s.category, present: true, weight: Math.min(3, Math.max(1, s.weight || 1)) }))
  const { symptoms: merged, modalities } = mergeWithFallback(text, symptoms, j.modalities?.map((m: any) => ({ pairId: m.pairId, value: m.value })) ?? [])
  const profile = toEngineProfile(inferPatientProfile(text, merged))
  const results = analyzePipeline(data, merged, modalities, [], profile)

  console.log('Top-3:', results.slice(0, 3).map(r => `${r.remedy}(${r.totalScore})`).join(', '))

  const conflict = checkHypothesisConflict(results)
  const pair = selectDifferentialPair(results, conflict)!
  console.log('Pair:', pair.top1.remedy, 'vs', pair.alt.remedy, '| gap:', pair.gap)

  const matrix = buildDifferentialMatrix(results, pair)
  console.log('Discriminators:', matrix.discriminators)
  console.log('Top1 strengths:', matrix.top1Strengths.map(s => `${s.lens}:+${s.delta}`))
  console.log('Alt strengths:', matrix.altStrengths.map(s => `${s.lens}:+${s.delta}`))

  const prompt = buildClarifyPrompt(matrix, merged, modalities)

  // AI
  const aiResp = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, temperature: 0.3, messages: [{ role: 'user', content: prompt }] })
  const aiText = (aiResp.content[0] as any).text
  console.log('\nRAW AI (first 800):')
  console.log(aiText.slice(0, 800))

  const parsed = parseDifferentialResponse(aiText)
  console.log('\nParsed:', parsed.length, 'questions')
  for (const q of parsed) {
    console.log(`  Q: ${q.question.slice(0, 60)}`)
    console.log(`    supports: [${q.supports}] weakens: [${q.weakens}]`)
    console.log(`    options: ${q.options.length}`, q.options.map(o => `"${o.label}"`).join(', '))
  }

  const ctx = buildDifferentialContext(results, merged, modalities, conflict)
  const validated = validateQuestions(parsed, ctx)
  console.log('\nValidated:', validated.length)

  if (validated.length > 0) {
    const ranked = rankClarifyQuestions(matrix, validated)
    console.log('\nRanked:')
    for (const r of ranked) {
      console.log(`  gain=${r.informationGain.toFixed(2)} | ${r.rankReason} | ${r.question.slice(0, 50)}`)
    }
    const selected = selectBestQuestions(ranked)
    console.log('\nSelected:', selected.length)
  } else {
    // Почему не прошли?
    console.log('\nDEBUG: почему validated=0?')
    const topRemedies = [results[0]?.remedy, results[1]?.remedy, results[2]?.remedy].map(r => (r ?? '').toLowerCase().replace(/\.$/, ''))
    console.log('Top remedies (normalized):', topRemedies)
    for (const q of parsed) {
      const allMentioned = [...q.supports, ...q.weakens]
      const relevant = allMentioned.some(r => topRemedies.includes(r.toLowerCase()))
      console.log(`  Q: "${q.question.slice(0, 40)}" supports=[${q.supports}] weakens=[${q.weakens}] relevant=${relevant} options=${q.options.length}`)
    }
  }
}
main().catch(console.error)
