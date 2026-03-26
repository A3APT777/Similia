import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getAIAnalysisLogs, getDisagreementPatterns } from '@/lib/actions/admin'
import AILogsView from './AILogsView'

export default async function AILogsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Проверка админа
  const admin = await prisma.adminUser.findUnique({
    where: { userId: session.user.id },
  })

  if (!admin) redirect('/dashboard')

  const [logs, patterns] = await Promise.all([
    getAIAnalysisLogs(100),
    getDisagreementPatterns(),
  ])

  return <AILogsView logs={logs} disagreementPatterns={patterns} />
}
