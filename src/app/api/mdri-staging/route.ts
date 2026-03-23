/**
 * MDRI Staging API — единая точка входа для тестирования
 *
 * POST /api/mdri-staging
 * Body: { text: string, acuteOrChronic?: "acute" | "chronic" }
 *
 * Полный pipeline:
 * 1. Sonnet парсит русский текст → symptoms + modalities
 * 2. Keyword fallback → merge + validation
 * 3. Engine v5 → ranking
 * 4. Confidence layer → уровень уверенности
 *
 * Без auth, без credits, без Supabase.
 * Только для staging/testing — НЕ для production.
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzePipeline as analyze } from '@/lib/mdri/engine'
import { loadMDRIData } from '@/lib/mdri/data-loader'
import { DEFAULT_PROFILE } from '@/lib/mdri/types'
import type { MDRISymptom, MDRIModality, MDRIPatientProfile } from '@/lib/mdri/types'
import { mergeWithFallback, computeConfidence } from '@/lib/mdri/product-layer'
import { symMatch } from '@/lib/mdri/synonyms'
import Anthropic from '@anthropic-ai/sdk'

// Rate limit: 10 запросов в час по IP
const limits = new Map<string, { count: number; resetAt: number }>()
const MAX_REQ = 10
const WINDOW = 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  const log = (s: string) => console.log(`[mdri-staging] ${s}: ${Date.now() - t0}ms`)

  try {
    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const now = Date.now()
    const lim = limits.get(ip)
    if (lim && now < lim.resetAt && lim.count >= MAX_REQ) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    if (lim && now < lim.resetAt) lim.count++
    else limits.set(ip, { count: 1, resetAt: now + WINDOW })

    // Вход
    const body = await req.json()
    const text = String(body.text ?? '').trim()
    if (text.length < 10) {
      return NextResponse.json({ error: 'Текст слишком короткий (минимум 10 символов)' }, { status: 400 })
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Текст слишком длинный (максимум 5000 символов)' }, { status: 400 })
    }

    const profile: MDRIPatientProfile = {
      ...DEFAULT_PROFILE,
      acuteOrChronic: body.acuteOrChronic === 'acute' ? 'acute' : 'chronic',
    }

    log('START')

    // === Шаг 1: Sonnet парсинг + загрузка данных (параллельно) ===
    const [parseResult, data] = await Promise.all([
      parseSonnet(text),
      loadMDRIData(),
    ])
    log(`sonnet: ${parseResult.symptoms.length} symptoms, ${parseResult.modalities.length} modalities`)

    // === Шаг 2: Keyword fallback + validation ===
    const merged = mergeWithFallback(text, parseResult.symptoms, parseResult.modalities)
    log(`merge: +${merged.symptoms.length - parseResult.symptoms.length} syms, +${merged.modalities.length - parseResult.modalities.length} mods, ${merged.conflicts.length} conflicts`)

    if (merged.symptoms.length === 0) {
      return NextResponse.json({
        error: 'Не удалось извлечь симптомы. Опишите подробнее.',
        warnings: merged.warnings,
      }, { status: 422 })
    }

    // === Шаг 3: Engine v5 ===
    const results = analyze(data, merged.symptoms, merged.modalities, parseResult.familyHistory, profile)
    log(`engine: top=${results[0]?.remedy} ${results[0]?.totalScore}%`)

    // === Шаг 4: Confidence ===
    const confidence = computeConfidence(merged.symptoms, merged.modalities, results, merged.warnings)
    log(`confidence: ${confidence.level}`)

    // === Шаг 5: Quick diff ===
    const top1 = results[0]
    const top2 = results[1]
    let quickDiff: { question: string; remedy1: string; remedy2: string }[] | null = null

    if (confidence.showDiff && top1 && top2) {
      quickDiff = buildQuickDiff(
        top1.remedy.toLowerCase().replace(/\.$/, ''),
        top2.remedy.toLowerCase().replace(/\.$/, ''),
        merged.symptoms.map(s => s.rubric.toLowerCase()),
        data.constellations,
      )
    }

    // === Шаг 6: Explanation ===
    const topResults = results.slice(0, 5).map(r => {
      const remNorm = r.remedy.toLowerCase().replace(/\.$/, '')
      const con = data.constellations[remNorm]
      const matchedSymptoms = con?.clusters
        ?.flatMap((cl: any) => cl.symptoms)
        ?.filter((s: any) => merged.symptoms.some(ps => symMatch(ps.rubric.toLowerCase(), s.rubric)))
        ?.map((s: any) => s.rubric)
        ?.slice(0, 3) ?? []

      return {
        remedy: remNorm,
        remedyName: r.remedyName,
        totalScore: r.totalScore,
        confidence: r.confidence,
        matchedSymptoms,
        lenses: {
          kent: r.lenses.find(l => l.name === 'Kent')?.score ?? 0,
          constellation: r.lenses.find(l => l.name === 'Constellation')?.score ?? 0,
          polarity: r.lenses.find(l => l.name === 'Polarity')?.score ?? 0,
        },
        potency: r.potency,
        differential: r.differential,
      }
    })

    const elapsed = Date.now() - t0
    log('DONE')

    return NextResponse.json({
      // Для UI
      confidence,
      warnings: merged.warnings,
      topResults,
      quickDiff,

      // Meta/debug для staging
      meta: {
        elapsed,
        profile,
        parsedSymptoms: merged.symptoms.length,
        parsedModalities: merged.modalities.length,
        fallbackAdded: {
          symptoms: merged.symptoms.length - parseResult.symptoms.length,
          modalities: merged.modalities.length - parseResult.modalities.length,
        },
        conflicts: merged.conflicts,
        familyHistory: parseResult.familyHistory,
      },
    })
  } catch (err) {
    console.error('[mdri-staging] ERROR:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

// === Sonnet парсинг ===

async function parseSonnet(text: string): Promise<{
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  familyHistory: string[]
}> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `Ты — парсер гомеопатического случая. Извлеки из текста симптомы, модальности и семейный анамнез.
Верни ТОЛЬКО JSON без обёрток:
{
  "symptoms": [{"rubric": "symptom in English repertory format", "category": "mental|general|particular", "present": true, "weight": 1-3}],
  "modalities": [{"pairId": "heat_cold|motion_rest|open_air|sea|morning_evening|company_alone|consolation|pressure|eating|menses", "value": "agg|amel"}],
  "familyHistory": ["disease1", "disease2"]
}
Переводи симптомы на английский в формат реперториума. weight: 1=обычный, 2=выраженный, 3=peculiar/яркий. present=false для отсутствующих симптомов.`,
    messages: [{ role: 'user', content: text }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const json = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(json)
    return {
      symptoms: (parsed.symptoms ?? []).map((s: any) => ({
        rubric: String(s.rubric ?? ''),
        category: (['mental', 'general', 'particular'].includes(s.category) ? s.category : 'particular') as MDRISymptom['category'],
        present: s.present !== false,
        weight: Math.min(3, Math.max(1, Number(s.weight) || 2)) as 1 | 2 | 3,
      })),
      modalities: (parsed.modalities ?? []).map((m: any) => ({
        pairId: String(m.pairId ?? ''),
        value: (m.value === 'amel' ? 'amel' : 'agg') as 'agg' | 'amel',
      })),
      familyHistory: (parsed.familyHistory ?? []).map((f: any) => String(f)),
    }
  } catch {
    return { symptoms: [], modalities: [], familyHistory: [] }
  }
}

// === Quick Diff ===

function buildQuickDiff(
  remedy1: string,
  remedy2: string,
  patientSymptoms: string[],
  constellations: Record<string, any>,
): { question: string; remedy1: string; remedy2: string }[] {
  const con1 = constellations[remedy1]
  const con2 = constellations[remedy2]
  if (!con1?.clusters || !con2?.clusters) return []

  const syms1 = con1.clusters.flatMap((c: any) => c.symptoms.map((s: any) => s.rubric as string))
  const syms2 = con2.clusters.flatMap((c: any) => c.symptoms.map((s: any) => s.rubric as string))

  // Симптомы уникальные для remedy1 (нет у remedy2) и НЕ упомянутые пациентом
  const only1 = syms1.filter((s: string) =>
    !syms2.some((s2: string) => symMatch(s, s2)) &&
    !patientSymptoms.some(ps => symMatch(ps, s))
  )
  const only2 = syms2.filter((s: string) =>
    !syms1.some((s2: string) => symMatch(s, s2)) &&
    !patientSymptoms.some(ps => symMatch(ps, s))
  )

  const diff: { question: string; remedy1: string; remedy2: string }[] = []
  for (const s of only1.slice(0, 2)) {
    diff.push({ question: s, remedy1, remedy2: '' })
  }
  for (const s of only2.slice(0, 2)) {
    diff.push({ question: s, remedy1: '', remedy2 })
  }

  return diff.slice(0, 3)
}
