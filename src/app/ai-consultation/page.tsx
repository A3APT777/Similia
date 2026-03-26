import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getLang } from '@/lib/i18n-server'
import AIConsultationDirect from './AIConsultationDirect'
import { getAIStatus } from '@/lib/actions/ai-consultation'

export default async function AIConsultationPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const lang = await getLang()

  const [patients, aiStatus] = await Promise.all([
    prisma.patient.findMany({
      where: { doctorId: session.user.id, isDemo: false },
      select: { id: true, name: true, constitutionalType: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    getAIStatus(),
  ])

  // Маппинг camelCase → snake_case для совместимости с UI
  const mappedPatients = patients.map(p => ({
    id: p.id,
    name: p.name,
    constitutional_type: p.constitutionalType,
  }))

  return (
    <AppShell>
      <AIConsultationDirect patients={mappedPatients} lang={lang} aiStatus={aiStatus} />
    </AppShell>
  )
}
