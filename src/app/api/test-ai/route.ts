import { NextResponse } from 'next/server'

export async function GET() {
  const steps: string[] = []
  try {
    // 1. Anthropic SDK
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    steps.push('1. anthropic: key=' + (process.env.ANTHROPIC_API_KEY ? 'yes' : 'NO'))

    // 2. Sonnet call
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say OK' }],
    })
    steps.push('2. sonnet: ' + (resp.content[0].type === 'text' ? resp.content[0].text.substring(0, 20) : 'no text'))

    // 3. Prisma
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()
    steps.push('3. prisma: users=' + count)

    // 4. MDRI data
    const { loadMDRIData } = await import('@/lib/mdri/data-loader')
    const data = await loadMDRIData()
    steps.push('4. mdri: rubrics=' + data.repertory.length + ' const=' + Object.keys(data.constellations).length)

    // 5. Parse
    const { PARSING_SYSTEM_PROMPT } = await import('@/lib/mdri/parsing-prompt')
    const parseResp = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.2,
      system: PARSING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Женщина 40 лет. Зябкая. Головные боли от солнца. Любит солёное.' }],
    })
    const txt = parseResp.content[0].type === 'text' ? parseResp.content[0].text : '{}'
    const jsonStr = txt.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    steps.push('5. parse: symptoms=' + (parsed.symptoms?.length ?? 0))

    // 6. Merge
    const { mergeWithFallback, analyzeWithIdf } = await import('@/lib/mdri/product-layer')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const symptoms = (parsed.symptoms ?? []).map((s: any) => ({
      rubric: String(s.rubric ?? ''),
      category: (['mental', 'general', 'particular'].includes(s.category) ? s.category : 'particular') as 'mental' | 'general' | 'particular',
      present: s.present !== false,
      weight: Math.min(3, Math.max(1, Number(s.weight) || 2)) as 1 | 2 | 3,
    }))
    const merged = mergeWithFallback('Женщина 40 лет. Зябкая.', symptoms, [])
    steps.push('6. merge: symptoms=' + merged.symptoms.length + ' mod=' + merged.modalities.length)

    // 7. Engine
    const profile = { acuteOrChronic: 'chronic' as const, vitality: 'medium' as const, sensitivity: 'medium' as const, age: 'adult' as const }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = analyzeWithIdf(data as any, merged.symptoms, merged.modalities, [], profile)
    steps.push('7. engine: top=' + results[0]?.remedy + '(' + results[0]?.totalScore + ')')

    return NextResponse.json({ success: true, steps })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({
      success: false,
      lastStep: steps[steps.length - 1],
      error: err.message?.substring(0, 500),
      stack: err.stack?.substring(0, 500),
      steps,
    }, { status: 500 })
  }
}
