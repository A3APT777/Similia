import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzePipeline as analyze } from '@/lib/mdri/engine'
import { loadMDRIData } from '@/lib/mdri/data-loader'
import { DEFAULT_PROFILE } from '@/lib/mdri/types'
import type { MDRISymptom, MDRIModality, MDRIPatientProfile } from '@/lib/mdri/types'

// Лимит демо-запросов по IP
const demoLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_DEMO = 3
const WINDOW_MS = 1000 * 60 * 60 * 24 // 24 часа

const demoSchema = z.object({
  symptoms: z.array(z.object({
    rubric: z.string().max(500),
    category: z.enum(['mental', 'general', 'particular']),
    present: z.boolean(),
    weight: z.number().int().min(1).max(3),
  })).min(1).max(20),
  modalities: z.array(z.object({
    pairId: z.string().max(50),
    value: z.enum(['agg', 'amel']),
  })).max(10).default([]),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limit по IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    const now = Date.now()
    const limit = demoLimits.get(ip)

    if (limit) {
      if (now < limit.resetAt) {
        if (limit.count >= MAX_DEMO) {
          return NextResponse.json(
            { error: 'Лимит демо исчерпан. Зарегистрируйтесь для полного доступа.', remaining: 0 },
            { status: 429 },
          )
        }
        limit.count++
      } else {
        limit.count = 1
        limit.resetAt = now + WINDOW_MS
      }
    } else {
      demoLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    }

    const body = await req.json()
    const parsed = demoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
    }

    // Только MDRI (без Sonnet — экономим деньги на демо)
    const data = await loadMDRIData()
    const results = analyze(
      data,
      parsed.data.symptoms as MDRISymptom[],
      parsed.data.modalities as MDRIModality[],
      [],
      DEFAULT_PROFILE as MDRIPatientProfile,
    )

    // В демо отдаём только топ-3 с ограниченной информацией
    const demoResults = results.slice(0, 3).map(r => ({
      remedy: r.remedy,
      remedyName: r.remedyName,
      totalScore: r.totalScore,
      confidence: r.confidence,
      // В демо не показываем детали линз и потенцию
    }))

    const remaining = MAX_DEMO - (demoLimits.get(ip)?.count ?? 0)

    return NextResponse.json({ results: demoResults, remaining })
  } catch {
    return NextResponse.json({ error: 'Ошибка анализа' }, { status: 500 })
  }
}
