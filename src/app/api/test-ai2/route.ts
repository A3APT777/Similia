import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    // 1. Auth — то же что requireAuth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'no session', session })
    }

    // 2. checkAIAccess
    const { prisma } = await import('@/lib/prisma')
    const settings = await prisma.doctorSettings.findUnique({
      where: { doctorId: session.user.id },
      select: { subscriptionPlan: true, aiCredits: true },
    })
    if (!settings) {
      return NextResponse.json({ error: 'no settings', userId: session.user.id })
    }

    // 3. Полный analyzeText
    const { analyzeText } = await import('@/lib/actions/ai-consultation')
    const result = await analyzeText({ text: 'Женщина 40 лет. Зябкая. Головные боли от солнца. Любит солёное. Плачет одна.' })

    return NextResponse.json({
      success: true,
      remedy: result.finalRemedy,
      confidence: result.productConfidence?.level,
      top3: result.mdriResults?.slice(0, 3).map((r: any) => r.remedy + '(' + r.totalScore + ')'),
    })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({
      success: false,
      error: err.message?.substring(0, 500),
      stack: err.stack?.substring(0, 500),
    }, { status: 500 })
  }
}
